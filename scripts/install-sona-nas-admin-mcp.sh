#!/usr/bin/env bash
# Authenticated TrueNAS MCP root-management gateway. Review before running as root.
set -Eeuo pipefail
if [ "$(id -u)" -ne 0 ]; then echo "Run using sudo bash" >&2; exit 1; fi
NAS_IP='192.168.1.152'
APP_DIR='/mnt/Pool/shared/sona-nas-admin-mcp'
CONTAINER='sona-nas-admin-mcp'
TAILSCALE_CONTAINER='ix-tailscale-tailscale-1'
command -v docker >/dev/null || { echo 'Docker not available on the TrueNAS host' >&2; exit 1; }
command -v curl >/dev/null || { echo 'curl is required' >&2; exit 1; }
docker inspect "$TAILSCALE_CONTAINER" >/dev/null 2>&1 || { echo 'Tailscale app container not found' >&2; exit 1; }
[ -d /mnt/Pool/shared ] || { echo 'The /mnt/Pool/shared dataset is missing' >&2; exit 1; }
umask 077
mkdir -p "$APP_DIR/audit"
[ -s "$APP_DIR/token" ] || python3 -c 'import secrets,sys;open(sys.argv[1],"w").write(secrets.token_urlsafe(48))' "$APP_DIR/token"
chmod 600 "$APP_DIR/token"
chmod 700 "$APP_DIR/audit"
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

TOKEN = Path('/run/secrets/nas_mcp_token').read_text().strip()
if len(TOKEN) < 48:
    raise RuntimeError('Missing or weak server authentication secret')

mcp = FastMCP('TrueNAS Admin', host='0.0.0.0', stateless_http=True, json_response=True)
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


core = mcp.streamable_http_app()


class AuthenticationGateway:
    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http':
            headers = dict((k.lower(), v) for k, v in scope.get('headers', []))
            supplied = headers.get(b'authorization', b'').decode('latin-1', errors='replace')
            if not hmac.compare_digest(supplied, 'Bearer ' + TOKEN):
                await send({'type':'http.response.start','status':401,
                            'headers':[(b'content-type',b'text/plain'),
                                       (b'www-authenticate',b'Bearer realm="nas-mcp"'),
                                       (b'cache-control',b'no-store')]})
                await send({'type':'http.response.body','body':b'Unauthorized'})
                return
        await core(scope, receive, send)


app = AuthenticationGateway()
PY
cat > "$APP_DIR/Dockerfile" <<'DOCKER'
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends util-linux && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir 'mcp>=1.28,<2' 'uvicorn>=0.30,<1'
RUN mkdir -p /run/secrets /audit
WORKDIR /app
COPY server.py /app/server.py
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
DOCKER

docker build -t sona-nas-admin-mcp:local "$APP_DIR"
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
  --mount "type=bind,src=${APP_DIR}/token,dst=/run/secrets/nas_mcp_token,readonly" \
  --mount "type=bind,src=${APP_DIR}/audit,dst=/audit" \
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
echo "Authentication token file: ${APP_DIR}/token"
echo "Read privately: sudo cat ${APP_DIR}/token"
echo 'Never paste the token into a chat or public issue; configure it in the MCP plugin authentication UI.'
echo 'Unauthenticated probe: curl -i https://homelab.hippocampus-polaris.ts.net/mcp (expect 401)'
echo 'Security: anyone possessing the token has full root administration.'
