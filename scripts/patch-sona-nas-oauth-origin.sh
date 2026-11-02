#!/usr/bin/env bash
# Patch the existing TrueNAS root MCP OAuth approval handler in place.
# Preserves owner secret, OAuth database, Docker mounts and Tailscale Funnel.
set -Eeuo pipefail
if [ "$(id -u)" -ne 0 ]; then
  echo 'Run with sudo bash.' >&2
  exit 1
fi

CONTAINER='sona-nas-admin-mcp'
SOURCE_REF="${SONA_SOURCE_REF:-main}"
IMAGE='sona-nas-admin-mcp:local'
for command in docker curl python3; do
  command -v "$command" >/dev/null || { echo "Missing $command" >&2; exit 1; }
done

docker inspect "$CONTAINER" >/dev/null 2>&1 || {
  echo "Existing container $CONTAINER not found. No changes made." >&2
  exit 1
}
docker exec "$CONTAINER" test -f /app/oauth_login.py || {
  echo 'Running gateway lacks /app/oauth_login.py. No changes made.' >&2
  exit 1
}
docker exec "$CONTAINER" test -s /run/secrets/token || {
  echo 'Existing owner credential is missing. No changes made.' >&2
  exit 1
}
PUBLISHED="$(docker port "$CONTAINER" 8080/tcp | head -n 1)"
PORT="${PUBLISHED##*:}"
case "$PORT" in
  ''|*[!0-9]*) echo 'Cannot determine gateway port. No changes made.' >&2; exit 1;;
esac
LOCAL="http://192.168.1.152:$PORT"

umask 077
TMP="$(mktemp -d /tmp/sona-nas-origin.XXXXXXXX)"
PATCHED=0
cleanup() { rm -rf -- "$TMP"; }
restore() {
  result="$?"
  trap - ERR
  if [ "$PATCHED" = 1 ]; then
    echo 'OAuth patch failed; restoring previous login code.' >&2
    docker cp "$TMP/oauth_login.original.py" "$CONTAINER:/app/oauth_login.py" || true
    docker restart "$CONTAINER" >/dev/null || true
  fi
  exit "$result"
}
trap restore ERR
trap cleanup EXIT

docker cp "$CONTAINER:/app/oauth_login.py" "$TMP/oauth_login.original.py"
RAW="https://raw.githubusercontent.com/dcazih/Sona/$SOURCE_REF/scripts/sona-nas-oauth-login.py"
curl --fail --silent --show-error --location --retry 3 \
  "$RAW" -o "$TMP/oauth_login.py"
python3 -m py_compile "$TMP/oauth_login.py"
grep -q 'request.cookies.get("sona_oauth_csrf", "")' "$TMP/oauth_login.py" || {
  echo 'CSRF session validation missing; refusing patch.' >&2
  exit 1
}
grep -q 'hmac.compare_digest(supplied, owner_secret)' "$TMP/oauth_login.py" || {
  echo 'Owner secret validation missing; refusing patch.' >&2
  exit 1
}
if grep -q 'return HTMLResponse("Invalid origin"' "$TMP/oauth_login.py"; then
  echo 'Downloaded source still contains the broken Origin rejection.' >&2
  exit 1
fi

echo 'Updating NAS OAuth login handler; preserving owner secret and tokens.'
PATCHED=1
docker cp "$TMP/oauth_login.py" "$CONTAINER:/app/oauth_login.py"
docker restart "$CONTAINER" >/dev/null

DISCOVERY_OK=0
for n in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if curl --fail --silent --show-error --max-time 3 \
     "$LOCAL/.well-known/oauth-authorization-server" -o "$TMP/metadata.json" 2>/dev/null; then
    if python3 - "$TMP/metadata.json" <<'PY'
import json,sys
with open(sys.argv[1]) as handle: m=json.load(handle)
assert m.get("issuer")=="https://homelab.hippocampus-polaris.ts.net"
assert "nas:root" in m.get("scopes_supported",[])
PY
    then
      DISCOVERY_OK=1
      break
    fi
  fi
  sleep 1
done
if [ "$DISCOVERY_OK" != 1 ]; then
  echo 'Gateway failed OAuth discovery after patch.' >&2
  docker logs --tail 30 "$CONTAINER" >&2 || true
  false
fi

UNAUTH="$(curl --silent --show-error --max-time 5 \
  --output /dev/null --write-out '%{http_code}' "$LOCAL/mcp")"
if [ "$UNAUTH" != '401' ]; then
  echo "Gateway /mcp must require OAuth (expected 401, got $UNAUTH)." >&2
  false
fi

# Reproduce the old Origin rejection without ever sending the owner secret.
# The nonexistent ticket must yield 400, not "Invalid origin" 403.
POST_CODE="$(curl --silent --show-error --max-time 5 --output "$TMP/post-response" \
  --write-out '%{http_code}' \
  -H 'Origin: https://chatgpt.com' \
  --data-urlencode 'ticket=not-a-real-authorization-ticket' \
  --data-urlencode 'secret=not-a-real-owner-key' \
  "$LOCAL/login")"
if [ "$POST_CODE" != '400' ] ||
   ! grep -q 'Authorization request expired' "$TMP/post-response"; then
  echo "OAuth origin regression test failed (HTTP $POST_CODE)." >&2
  false
fi
PATCHED=0

# Preserve fix in local image for container recreation. Docker does not copy
# the mounted private owner-secret or OAuth storage volumes into the image.
docker commit --pause=true "$CONTAINER" "$IMAGE" >/dev/null || {
  echo 'WARNING: live patch succeeded, but local Docker image persistence failed.' >&2
}

echo 'SUCCESS: NAS authorization no longer rejects browser Origin headers.'
echo 'CSRF cookie, one-time ticket, owner key and OAuth scopes remain enforced.'
echo 'Existing owner key, OAuth data, and Tailscale Funnel remain unchanged.'
echo 'Retry the ChatGPT authorization using a NEW connection attempt.'
