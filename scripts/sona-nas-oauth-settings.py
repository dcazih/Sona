"""OAuth configuration for the owner-authorized Sona NAS MCP service.

This module defines ChatGPT-compatible OAuth discovery configuration.
The existing host commands are unchanged and remain inaccessible without
successful authentication.
"""
from mcp.server.auth.settings import AuthSettings, ClientRegistrationOptions
from pydantic import AnyHttpUrl

ISSUER = "https://homelab.hippocampus-polaris.ts.net"
RESOURCE = ISSUER + "/mcp"
ADMIN_SCOPE = "nas:root"

def auth_settings() -> AuthSettings:
    return AuthSettings(
        issuer_url=AnyHttpUrl(ISSUER),
        resource_server_url=AnyHttpUrl(RESOURCE),
        required_scopes=[ADMIN_SCOPE],
        client_registration_options=ClientRegistrationOptions(
            enabled=True,
            valid_scopes=[ADMIN_SCOPE],
            default_scopes=[ADMIN_SCOPE],
        ),
    )
