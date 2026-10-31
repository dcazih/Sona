#!/usr/bin/env bash
# Authenticated TrueNAS MCP root-management gateway. Review before running as root.
set -Eeuo pipefail
if [ "$(id -u)" -ne 0 ]; then echo "Run using sudo bash" >&2; exit 1; fi
NAS_IP='192.168.1.152'
APP_DIR="$(mktemp -d /tmp/sona-nas-admin-mcp.XXXXXXXX)"
trap 'rm -rf -- "$APP_DIR"' EXIT
CONTAINER='sona-nas-admin-mcp'
TAILSCALE_CONTAINER='ix-tailscale-tailscale-1'
command -v docker >/dev/null || { echo 'Docker not available on the TrueNAS host' >&2; exit 1; }
command -v curl >/dev/null || { echo 'curl is required' >&2; exit 1; }
docker inspect "$TAILSCALE_CONTAINER" >/dev/null 2>&1 || { echo 'Tailscale app container not found' >&2; exit 1; }
[ -d /mnt/Pool/shared ] || { echo 'The /mnt/Pool/shared dataset is missing' >&2; exit 1; }
umask 077
# Do not store root-admin credentials or executable gateway source in SMB/shared datasets.
SECRET_VOL='sona-nas-admin-private'
AUDIT_VOL='sona-nas-admin-audit'
docker volume create "$SECRET_VOL" >/dev/null
docker volume create "$AUDIT_VOL" >/dev/null
cat > "$APP_DIR/server.py" <<'PY'
"""Authenticated MCP gateway for the TrueNAS host."""
import hashlib
import hmac
import json
from pathlib import Path
import subprocess
import time
from datetime import datetime, timezone
from mcp.server.fastmcp import FastMCP

TOKEN = Path('/run/secrets/token').read_text().strip()
if len(TOKEN) < 48:
    raise RuntimeError('Missing or weak server authentication secret')

from oauth_provider import provider
from oauth_settings import auth_settings
from oauth_login import install_login_routes

mcp = FastMCP('TrueNAS Admin', host='0.0.0.0', stateless_http=True, json_response=True,
              auth=auth_settings(), auth_server_provider=provider)
install_login_routes(mcp)
AUDIT = Path('/audit/commands.jsonl')


def _on_host(cmd: str, timeout: int):
    if not cmd.strip() or len(cmd) > 8192:
        raise ValueError('Command is empty or exceeds 8192 characters')
    timeout = max(1, min(120, int(timeout)))
    started = time.monotonic()
    digest = hashlib.sha256(cmd.encode()).hexdigest()
    try:
        result = subprocess.run(
            ['nsenter', '--target', '1', '--mount', '--uts', '--ipc', '--net', '--pid', '--root',
             '--', '/bin/sh', '-lc', cmd],
            capture_output=True, text=True, timeout=timeout, check=False,
            errors='replace')
        output = (result.stdout + '\n' + result.stderr)[:35000]
        status = result.returncode
    except subprocess.TimeoutExpired:
        output = f'Command exceeded timeout ({timeout}s)'
        status = 124
    except Exception as exc:
        output = f'{type(exc).__name__}: {exc}'
        status = 125
    with AUDIT.open('a', encoding='utf-8') as out:
        out.write(json.dumps({'time':datetime.now(timezone.utc).isoformat(),
                              'cmd_sha256':digest,'status':status,
                              'elapsed_s':round(time.monotonic()-started, 2)})+'\n')
    return {'exit_code':status, 'output':output}


@mcp.tool()
def host_status() -> dict:
    """Read TrueNAS uptime, disk space, routes and Docker container status."""
    return _on_host('uname -a; uptime; df -h; ip route; docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', 30)


@mcp.tool()
def run_host_command(command: str, timeout_seconds: int = 30) -> dict:
    """Execute an arbitrary shell command as root on TrueNAS. This grants full administrative control, including modifying containers and deleting files. Use only when the owner requests it and inspect before making destructive changes."""
    return _on_host(command, timeout_seconds)


app = mcp.streamable_http_app()
PY
# Download versioned OAuth modules into the temporary Docker build context.
# Set SONA_SOURCE_REF to an immutable commit SHA to pin these dependencies.
SOURCE_REF="${SONA_SOURCE_REF:-sona-cassette-mobile}"
RAW_OAUTH="https://raw.githubusercontent.com/dcazih/Sona/${SOURCE_REF}/scripts"
curl --fail --silent --show-error --location --retry 3 \
  "${RAW_OAUTH}/sona-nas-oauth-provider.py" -o "$APP_DIR/oauth_provider.py"
curl --fail --silent --show-error --location --retry 3 \
  "${RAW_OAUTH}/sona-nas-oauth-login.py" -o "$APP_DIR/oauth_login.py"
curl --fail --silent --show-error --location --retry 3 \
  "${RAW_OAUTH}/sona-nas-oauth-settings.py" -o "$APP_DIR/oauth_settings.py"
cat > "$APP_DIR/Dockerfile" <<'DOCKER'
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends util-linux && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir 'mcp==1.28.0' 'uvicorn>=0.30,<1' 'python-multipart>=0.0.9,<1'
RUN mkdir -p /run/secrets /audit
WORKDIR /app
COPY server.py oauth_provider.py oauth_login.py oauth_settings.py /app/
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
DOCKER

docker build -t sona-nas-admin-mcp:local "$APP_DIR"
# Create or preserve the authentication secret in a Docker-managed, non-SMB volume.
docker run --rm --mount "type=volume,src=${SECRET_VOL},dst=/private" \
  --entrypoint python sona-nas-admin-mcp:local -c '
import os
import pathlib
import secrets
p = pathlib.Path("/private/token")
if not p.exists():
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    fd = os.open(str(p), flags, 0o600)
    with os.fdopen(fd, "w") as file:
        file.write(secrets.token_urlsafe(48))
os.chmod(str(p), 0o600)
if len(p.read_text().strip()) < 48:
    raise ValueError("Refusing to use a weak token")
'
# The earlier broken installer may have left a secret inside the SMB-shared dataset.
if [ -f /mnt/Pool/shared/sona-nas-admin-mcp/token ]; then
  rm -f /mnt/Pool/shared/sona-nas-admin-mcp/token || \
    echo 'WARNING: Delete the old token at /mnt/Pool/shared/sona-nas-admin-mcp/token manually.' >&2
fi
# Verify OAuth startup and discovery before stopping the old gateway.
PROBE="${CONTAINER}-oauth-smoke"
docker rm -f "$PROBE" >/dev/null 2>&1 || true
docker run -d \
  --name "$PROBE" \
  --publish "127.0.0.1::8080" \
  --mount "type=volume,src=${SECRET_VOL},dst=/run/secrets,readonly" \
  --mount "type=volume,src=${AUDIT_VOL},dst=/audit" \
  sona-nas-admin-mcp:local >/dev/null
PROBE_BIND="$(docker port "$PROBE" 8080/tcp | head -n 1)"
PROBE_PORT="${PROBE_BIND##*:}"
PROBE_STATUS=''
for i in $(seq 1 25); do
  PROBE_STATUS=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 \
    "http://127.0.0.1:${PROBE_PORT}/.well-known/oauth-authorization-server" || true)
  [ "$PROBE_STATUS" = '200' ] && break
  sleep 1
done
if [ "$PROBE_STATUS" != '200' ]; then
  echo 'OAuth preflight failed; existing gateway is unchanged.' >&2
  docker logs --tail 50 "$PROBE" >&2 || true
  docker rm -f "$PROBE" >/dev/null 2>&1 || true
  exit 1
fi
docker rm -f "$PROBE" >/dev/null
echo 'OAuth discovery preflight passed.'
if docker inspect "$CONTAINER" >/dev/null 2>&1; then docker rm -f "$CONTAINER"; fi

PORT=''
for candidate in 9443 9444 9445 10443 10444; do
  if ! ss -H -ltn | awk '{print $4}' | grep -qE ":${candidate}$"; then
    PORT="$candidate"
    break
  fi
done
[ -n "$PORT" ] || { echo 'No free gateway port found' >&2; exit 1; }
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --privileged \
  --pid host \
  --publish "${NAS_IP}:${PORT}:8080" \
  --mount "type=volume,src=${SECRET_VOL},dst=/run/secrets,readonly" \
  --mount "type=volume,src=${AUDIT_VOL},dst=/audit" \
  sona-nas-admin-mcp:local >/dev/null
status=''
for i in $(seq 1 25); do
  status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 "http://${NAS_IP}:${PORT}/mcp" || true)
  [ "$status" = '401' ] && break
  sleep 1
done
if [ "$status" != '401' ]; then
  echo 'Gateway startup failed:' >&2
  docker logs --tail 45 "$CONTAINER" >&2
  exit 1
fi

docker exec "$TAILSCALE_CONTAINER" tailscale funnel --bg "http://${NAS_IP}:${PORT}"
echo 'MCP endpoint: https://homelab.hippocampus-polaris.ts.net/mcp'
echo "NAS gateway: http://${NAS_IP}:${PORT}/mcp"
echo 'Authentication token is stored in the Docker-managed sona-nas-admin-private volume.'
echo 'Read privately: sudo docker exec sona-nas-admin-mcp cat /run/secrets/token'
echo 'Use the owner secret only on the NAS OAuth consent page opened by ChatGPT. Never paste it in this chat.'
echo 'Unauthenticated probe: curl -i https://homelab.hippocampus-polaris.ts.net/mcp (expect 401)'
echo 'OAuth metadata: https://homelab.hippocampus-polaris.ts.net/.well-known/oauth-authorization-server'
echo 'MCP resource metadata: https://homelab.hippocampus-polaris.ts.net/.well-known/oauth-protected-resource/mcp'
echo 'Security: An authorized OAuth connection retains unrestricted root administration.'
