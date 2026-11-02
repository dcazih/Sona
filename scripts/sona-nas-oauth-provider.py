"""Persistent, single-owner OAuth provider for the Sona NAS MCP endpoint.

Authentication state lives in a Docker-managed private volume. The Python MCP
SDK performs standard OAuth 2.0 dynamic registration, PKCE and token validation.
"""
import hashlib
import json
import secrets
import sqlite3
import time
from pathlib import Path
from urllib.parse import quote, urlsplit

from mcp.server.auth.provider import (
    AccessToken, AuthorizationCode, AuthorizationParams, AuthorizeError,
    OAuthAuthorizationServerProvider, RefreshToken, RegistrationError,
    TokenError, construct_redirect_uri,
)
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken

ISSUER = "https://homelab.hippocampus-polaris.ts.net"
RESOURCE = ISSUER + "/mcp"
SCOPE = "nas:root"

# Meta Muse's personal assistant uses a pre-issued public client ID.
# Its callback is fixed and it does not use dynamic client registration.
# Keep the callback exact to prevent OAuth code interception.
MUSE_CLIENT_ID = "muse"
MUSE_REDIRECT_URI = "https://agent.meta.ai/api/hatch/oauth/callback"
MUSE_CLIENT = OAuthClientInformationFull.model_validate({
    "client_id": MUSE_CLIENT_ID,
    "client_name": "Meta Muse",
    "redirect_uris": [MUSE_REDIRECT_URI],
    "response_types": ["code"],
    "grant_types": ["authorization_code", "refresh_token"],
    "token_endpoint_auth_method": "none",
    "scope": SCOPE,
})

def permitted_redirect(value: str) -> bool:
    parts = urlsplit(value)
    if parts.scheme != "https" or parts.username or parts.password:
        return False
    if parts.port not in (None, 443) or parts.query or parts.fragment:
        return False
    if parts.hostname == "agent.meta.ai":
        return value == MUSE_REDIRECT_URI
    return parts.hostname in ("chatgpt.com", "chat.openai.com")

OWNER_SECRET_FILE = Path("/run/secrets/token")
DB_FILE = Path("/audit/oauth.sqlite3")

def key_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

class AuthStore:
    def __init__(self):
        self.db = sqlite3.connect(str(DB_FILE), timeout=10, isolation_level=None)
        self.db.execute("PRAGMA journal_mode=WAL")
        for table in ("pending", "codes", "access", "refresh"):
            self.db.execute(
                f"CREATE TABLE IF NOT EXISTS {table} "
                "(id_hash TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL)"
            )
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
        )
        DB_FILE.chmod(0o600)

    def put(self, table: str, key: str, data, expires: int):
        serialized = data if isinstance(data, str) else data.model_dump_json()
        self.db.execute(
            f"INSERT INTO {table} VALUES (?,?,?)",
            (key_hash(key), serialized, expires),
        )

    def read(self, table: str, key: str) -> str | None:
        result = self.db.execute(
            f"SELECT data FROM {table} WHERE id_hash=? AND expires>?",
            (key_hash(key), int(time.time())),
        ).fetchone()
        return result[0] if result else None

    def consume(self, table: str, key: str) -> str | None:
        # Atomically enforce one-time authorization codes and refresh rotation.
        row = self.db.execute(
            f"DELETE FROM {table} WHERE id_hash=? AND expires>? RETURNING data",
            (key_hash(key), int(time.time())),
        ).fetchone()
        return row[0] if row else None

    def prune(self):
        for table in ("pending", "codes", "access", "refresh"):
            self.db.execute(f"DELETE FROM {table} WHERE expires <= ?", (int(time.time()),))

store = AuthStore()

class SonaRefreshToken(RefreshToken):
    resource: str | None = None

class OwnerOAuthProvider(
    OAuthAuthorizationServerProvider[AuthorizationCode, SonaRefreshToken, AccessToken]
):
    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        if client_id == MUSE_CLIENT_ID:
            return MUSE_CLIENT
        row = store.db.execute(
            "SELECT data FROM clients WHERE id=?", (client_id,)
        ).fetchone()
        return OAuthClientInformationFull.model_validate_json(row[0]) if row else None

    async def register_client(self, client_info: OAuthClientInformationFull):
        callbacks = client_info.redirect_uris or []
        if not callbacks or any(not permitted_redirect(str(url)) for url in callbacks):
            raise RegistrationError("invalid_redirect_uri", "Unapproved HTTPS callback")
        if client_info.client_id == MUSE_CLIENT_ID:
            raise RegistrationError("invalid_client_metadata", "Muse uses the built-in public client")
        if not client_info.client_id:
            raise RegistrationError("invalid_client_metadata", "Client ID required")
        store.db.execute(
            "INSERT INTO clients VALUES (?,?)",
            (client_info.client_id, client_info.model_dump_json()),
        )

    async def authorize(self, client: OAuthClientInformationFull, params: AuthorizationParams) -> str:
        if params.resource is not None and params.resource.rstrip("/") != RESOURCE:
            raise AuthorizeError("invalid_request", "Invalid resource")
        if params.scopes and set(params.scopes) != {SCOPE}:
            raise AuthorizeError("invalid_scope", "Only nas:root is supported")
        store.prune()
        ticket = secrets.token_urlsafe(32)
        record = {
            "client_id": client.client_id,
            "redirect_uri": str(params.redirect_uri),
            "explicit": params.redirect_uri_provided_explicitly,
            "code_challenge": params.code_challenge,
            "state": params.state,
            "csrf_hash": None,
            "attempts": 0,
        }
        store.put("pending", ticket, json.dumps(record), int(time.time()) + 300)
        return ISSUER + "/login?ticket=" + quote(ticket, safe="")

    async def load_authorization_code(self, client, authorization_code):
        data = store.read("codes", authorization_code)
        return AuthorizationCode.model_validate_json(data) if data else None

    async def exchange_authorization_code(self, client, authorization_code):
        if authorization_code.client_id != client.client_id:
            raise TokenError("invalid_grant", "Wrong client")
        if store.consume("codes", authorization_code.code) is None:
            raise TokenError("invalid_grant", "Authorization code already used")
        return self._issue(client.client_id, authorization_code.scopes)

    def _issue(self, client_id: str, scopes: list[str]) -> OAuthToken:
        if set(scopes) != {SCOPE}:
            raise TokenError("invalid_scope", "Invalid scopes")
        now = int(time.time())
        access = secrets.token_urlsafe(48)
        refresh = secrets.token_urlsafe(48)
        store.put("access", access, AccessToken(
            token=access, client_id=client_id, scopes=scopes,
            expires_at=now+3600, resource=RESOURCE, subject="nas-owner",
        ), now+3600)
        store.put("refresh", refresh, SonaRefreshToken(
            token=refresh, client_id=client_id, scopes=scopes,
            expires_at=now+7*86400, resource=RESOURCE, subject="nas-owner",
        ), now+7*86400)
        return OAuthToken(
            access_token=access, refresh_token=refresh,
            token_type="Bearer", expires_in=3600, scope=" ".join(scopes),
        )

    async def load_access_token(self, token):
        data = store.read("access", token)
        if data is None:
            return None
        info = AccessToken.model_validate_json(data)
        return info if info.resource == RESOURCE and set(info.scopes) == {SCOPE} else None

    async def load_refresh_token(self, client, refresh_token):
        data = store.read("refresh", refresh_token)
        if data is None:
            return None
        info = SonaRefreshToken.model_validate_json(data)
        return info if info.client_id == client.client_id and info.resource == RESOURCE else None

    async def exchange_refresh_token(self, client, refresh_token, scopes):
        if refresh_token.client_id != client.client_id or refresh_token.resource != RESOURCE:
            raise TokenError("invalid_grant", "Wrong client or resource")
        if store.consume("refresh", refresh_token.token) is None:
            raise TokenError("invalid_grant", "Refresh token already used")
        return self._issue(client.client_id, scopes)

    async def revoke_token(self, token):
        for table in ("access", "refresh"):
            store.db.execute(
                f"DELETE FROM {table} WHERE id_hash=?", (key_hash(token.token),)
            )

provider = OwnerOAuthProvider()
