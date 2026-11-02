"""Owner-only consent screen for the Sona NAS MCP OAuth flow."""
import hashlib
import hmac
import html
import json
from pathlib import Path
import secrets
import time

from mcp.server.auth.provider import AuthorizationCode, construct_redirect_uri
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse, Response

from oauth_provider import ISSUER, RESOURCE, SCOPE, key_hash, store


def install_login_routes(mcp):
    @mcp.custom_route("/login", methods=["GET"])
    async def login_page(request: Request) -> Response:
        ticket = request.query_params.get("ticket", "")
        data = store.read("pending", ticket) if ticket else None
        if data is None:
            return HTMLResponse("Authorization request expired", status_code=400)
        record = json.loads(data)
        csrf = secrets.token_urlsafe(32)
        record["csrf_hash"] = key_hash(csrf)
        store.db.execute(
            "UPDATE pending SET data=? WHERE id_hash=?",
            (json.dumps(record), key_hash(ticket)),
        )
        ticket_html = html.escape(ticket, quote=True)
        body = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize Sona NAS</title><style>
body{{background:#121317;color:#fafafa;font-family:system-ui,sans-serif;
max-width:450px;margin:12vh auto;padding:24px;line-height:1.6}}
main{{border:1px solid #45464d;border-radius:14px;padding:28px}}
input,button{{width:100%;box-sizing:border-box;padding:12px;margin-top:14px;
border-radius:8px}}
input{{background:#22232a;color:#fff;border:1px solid #777}}
button{{background:#fff;color:#111;border:0;font-weight:bold;cursor:pointer}}
</style></head><body><main><h2>Sona NAS Admin</h2>
<p>Meta Muse or another authorized client is requesting <strong>unrestricted administrator access</strong>
to your NAS, including executing commands, modifying containers and deleting data.</p>
<form method="post" action="/login">
<input type="hidden" name="ticket" value="{ticket_html}">
<label for="secret">NAS owner secret</label>
<input type="password" name="secret" id="secret" autocomplete="off" required>
<button type="submit">Authorize ChatGPT</button></form></main></body></html>"""
        response = HTMLResponse(body, headers={
            "Cache-Control": "no-store",
            "Content-Security-Policy":
                "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; "
                "base-uri 'none'; frame-ancestors 'none'",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
        })
        response.set_cookie(
            "sona_oauth_csrf", csrf, max_age=300, httponly=True,
            secure=True, samesite="lax", path="/login",
        )
        return response

    @mcp.custom_route("/login", methods=["POST"])
    async def login_confirm(request: Request) -> Response:
        # OAuth approval may run in a browser/app webview whose Origin header
        # reflects the embedding client or is "null". Do not use this optional
        # header as an authorization factor. A valid approval still requires:
        # 1. a short-lived, one-time OAuth transaction ticket;
        # 2. a per-transaction CSRF cookie bound to that ticket (Secure, Lax);
        # 3. the NAS owner's secret, checked in constant time.
        # Cross-site form posts cannot supply the explicit SameSite=Lax cookie.
        form = await request.form()
        ticket, supplied = form.get("ticket", ""), form.get("secret", "")
        if not isinstance(ticket, str) or not isinstance(supplied, str):
            return HTMLResponse("Invalid authorization", status_code=401)
        if len(ticket) > 100 or len(supplied) > 512:
            return HTMLResponse("Invalid authorization", status_code=401)
        data = store.read("pending", ticket)
        if data is None:
            return HTMLResponse("Authorization request expired", status_code=400)
        record = json.loads(data)
        csrf = request.cookies.get("sona_oauth_csrf", "")
        if not csrf or not record.get("csrf_hash") or not hmac.compare_digest(
            record["csrf_hash"], key_hash(csrf)
        ):
            return HTMLResponse("Invalid authorization session", status_code=403)
        if record.get("attempts", 0) >= 5:
            return HTMLResponse("Too many attempts; reconnect from ChatGPT", status_code=429)
        owner_secret = Path("/run/secrets/token").read_text().strip()
        if not hmac.compare_digest(supplied, owner_secret):
            record["attempts"] = record.get("attempts", 0) + 1
            store.db.execute(
                "UPDATE pending SET data=? WHERE id_hash=?",
                (json.dumps(record), key_hash(ticket)),
            )
            return HTMLResponse("Invalid owner secret", status_code=401)
        if store.consume("pending", ticket) is None:
            return HTMLResponse("Authorization request already used", status_code=400)
        now = int(time.time())
        code = secrets.token_urlsafe(32)
        authorization = AuthorizationCode(
            code=code,
            client_id=record["client_id"],
            redirect_uri=record["redirect_uri"],
            redirect_uri_provided_explicitly=record["explicit"],
            scopes=[SCOPE],
            code_challenge=record["code_challenge"],
            resource=RESOURCE,
            subject="nas-owner",
            expires_at=now + 300,
        )
        store.put("codes", code, authorization, now+300)
        destination = construct_redirect_uri(
            record["redirect_uri"], code=code, state=record["state"],
        )
        response = RedirectResponse(
            destination, status_code=302,
            headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
        )
        response.delete_cookie("sona_oauth_csrf", path="/login")
        return response
