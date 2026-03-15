#!/usr/bin/env bash
# Bootstraps the Zitadel instance with the project, application, roles, user grants,
# and the Action that injects permissions into JWTs.
# Idempotent: safe to re-run; existing resources are reused.
#
# Usage:
#   ./docker/setup-zitadel.sh
#
# Optional env vars:
#   ZITADEL_PAT    — override auto-extracted PAT
#   ZITADEL_BASE   — default: http://localhost:8080
#   ADMIN_LOGIN    — default: admin@zitadel.localhost

set -euo pipefail

ZITADEL_BASE="${ZITADEL_BASE:-http://localhost:8080}"
ADMIN_LOGIN="${ADMIN_LOGIN:-admin@macularsociety.localhost}"

# Auto-extract the setup-sa PAT from Docker init logs if not provided explicitly.
# Zitadel prints the machine user PAT as a bare base64url string during first-instance init.
if [[ -z "${ZITADEL_PAT:-}" ]]; then
	echo "ZITADEL_PAT not set — attempting to extract from macular-zitadel init logs..."
	ZITADEL_PAT=$(docker logs macular-zitadel 2>&1 |
		grep -E '^[A-Za-z0-9_-]{40,}$' |
		head -1)
	if [[ -z "$ZITADEL_PAT" ]]; then
		echo ""
		echo "Could not auto-extract PAT. Run this to find it manually:"
		echo "  docker logs macular-zitadel 2>&1 | grep -E '^[A-Za-z0-9_-]{40,}$'"
		echo "Then re-run: ZITADEL_PAT=<token> ./docker/setup-zitadel.sh"
		exit 1
	fi
	echo "PAT extracted from logs."
fi

PAT="$ZITADEL_PAT"

# ── Helpers ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
info() { echo -e "${GREEN}[setup]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
die() {
	echo -e "${RED}[error]${NC} $*" >&2
	exit 1
}

command -v curl >/dev/null || die "curl is required"
command -v jq >/dev/null || die "jq is required (brew install jq)"

# api METHOD path [curl-args...]
# Returns response body; exits with error message on non-2xx.
# Uses a tmpfile to avoid BSD head -n -1 incompatibility.
api() {
	local method="$1" path="$2"
	shift 2
	local tmpfile http_code body
	tmpfile=$(mktemp)
	http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" -X "$method" "$ZITADEL_BASE/$path" \
		-H "Authorization: Bearer $PAT" \
		-H "Content-Type: application/json" \
		"$@")
	body=$(cat "$tmpfile")
	rm -f "$tmpfile"
	if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
		die "HTTP $http_code from $method $path — $body"
	fi
	printf '%s' "$body"
}

# api_or_conflict METHOD path [curl-args...]
# Like api() but returns empty string on 409 instead of exiting.
api_or_conflict() {
	local method="$1" path="$2"
	shift 2
	local tmpfile http_code body
	tmpfile=$(mktemp)
	http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" -X "$method" "$ZITADEL_BASE/$path" \
		-H "Authorization: Bearer $PAT" \
		-H "Content-Type: application/json" \
		"$@")
	body=$(cat "$tmpfile")
	rm -f "$tmpfile"
	if [[ "$http_code" == "409" ]]; then
		printf ''
		return 0
	fi
	if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
		die "HTTP $http_code from $method $path — $body"
	fi
	printf '%s' "$body"
}

# ── 1. Verify connectivity ────────────────────────────────────────────────────

info "Verifying Zitadel connectivity..."
api GET "management/v1/orgs/me" >/dev/null || die "Cannot reach $ZITADEL_BASE — is Zitadel running and is the PAT valid?"
info "Connected to $ZITADEL_BASE"

# ── 2. Create project (idempotent) ────────────────────────────────────────────

info "Creating project..."
PROJECT=$(api_or_conflict POST "management/v1/projects" -d '{
  "name": "Macular Society",
  "projectRoleAssertion": true,
  "projectRoleCheck": false
}')

if [[ -z "$PROJECT" ]]; then
	warn "Project already exists — looking up existing ID..."
	PROJECT=$(api POST "management/v1/projects/_search" -d '{
    "queries": [{"nameQuery": {"name": "Macular Society", "method": "TEXT_QUERY_METHOD_EQUALS"}}]
  }')
	PROJECT_ID=$(printf '%s' "$PROJECT" | jq -r '.result[0].id')
	info "Reusing existing project — ID: $PROJECT_ID"
else
	PROJECT_ID=$(printf '%s' "$PROJECT" | jq -r '.id')
	info "Project created — ID: $PROJECT_ID"
fi

# ── 3. Create API application (idempotent) ────────────────────────────────────

info "Creating API application..."
APP=$(api_or_conflict POST "management/v1/projects/$PROJECT_ID/apps/api" -d '{
  "name": "API",
  "authMethodType": "API_AUTH_METHOD_TYPE_BASIC"
}')

if [[ -z "$APP" ]]; then
	warn "API app already exists — looking up existing client ID..."
	APP=$(api POST "management/v1/projects/$PROJECT_ID/apps/_search" -d '{
    "queries": [{"nameQuery": {"name": "API", "method": "TEXT_QUERY_METHOD_EQUALS"}}]
  }')
	# In the list response the clientId is nested under apiConfig
	CLIENT_ID=$(printf '%s' "$APP" | jq -r '.result[0].apiConfig.clientId')
	info "Reusing existing app — Client ID: $CLIENT_ID"
else
	CLIENT_ID=$(printf '%s' "$APP" | jq -r '.clientId')
	info "Application created — Client ID (ZITADEL_AUDIENCE): $CLIENT_ID"
fi

# ── 3b. Create web app for frontend OIDC (PKCE, idempotent) ──────────────────

info "Creating web application (PKCE)..."
WEB_APP=$(api_or_conflict POST "management/v1/projects/$PROJECT_ID/apps/oidc" -d '{
  "name": "Frontend",
  "redirectUris": [
    "http://localhost:5173/callback",
    "http://localhost:5174/callback",
    "http://localhost:3030/callback"
  ],
  "responseTypes": ["OIDC_RESPONSE_TYPE_CODE"],
  "grantTypes": ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"],
  "appType": "OIDC_APP_TYPE_USER_AGENT",
  "authMethodType": "OIDC_AUTH_METHOD_TYPE_NONE",
  "postLogoutRedirectUris": [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3030"
  ],
  "version": "OIDC_VERSION_1",
  "devMode": true,
  "accessTokenType": "OIDC_TOKEN_TYPE_JWT",
  "accessTokenRoleAssertion": true,
  "idTokenRoleAssertion": true,
  "idTokenUserinfoAssertion": true
}')

if [[ -z "$WEB_APP" ]]; then
	warn "Frontend app already exists — deleting and recreating to apply current redirect URIs..."
	EXISTING=$(api POST "management/v1/projects/$PROJECT_ID/apps/_search" -d '{
    "queries": [{"nameQuery": {"name": "Frontend", "method": "TEXT_QUERY_METHOD_EQUALS"}}]
  }')
	WEB_APP_ID=$(printf '%s' "$EXISTING" | jq -r '.result[0].id')
	api DELETE "management/v1/projects/$PROJECT_ID/apps/$WEB_APP_ID" > /dev/null
	info "Deleted existing Frontend app (ID: $WEB_APP_ID) — recreating..."
	WEB_APP=$(api POST "management/v1/projects/$PROJECT_ID/apps/oidc" -d '{
    "name": "Frontend",
    "redirectUris": [
      "http://localhost:5173/callback",
      "http://localhost:5174/callback",
      "http://localhost:3030/callback"
    ],
    "responseTypes": ["OIDC_RESPONSE_TYPE_CODE"],
    "grantTypes": ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"],
    "appType": "OIDC_APP_TYPE_USER_AGENT",
    "authMethodType": "OIDC_AUTH_METHOD_TYPE_NONE",
    "postLogoutRedirectUris": [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3030"
    ],
    "version": "OIDC_VERSION_1",
    "devMode": true,
    "accessTokenType": "OIDC_TOKEN_TYPE_JWT",
    "accessTokenRoleAssertion": true,
    "idTokenRoleAssertion": true,
    "idTokenUserinfoAssertion": true
  }')
	WEB_CLIENT_ID=$(printf '%s' "$WEB_APP" | jq -r '.clientId')
	info "Frontend app recreated — Client ID: $WEB_CLIENT_ID"
else
	WEB_CLIENT_ID=$(printf '%s' "$WEB_APP" | jq -r '.clientId')
	info "Frontend app created — Client ID: $WEB_CLIENT_ID"
fi

# ── 4. Create roles (idempotent — 409 = already exists, skip) ────────────────

info "Creating roles..."
# key|display — plain array for bash 3.2 compatibility (macOS default shell)
ROLES=(
	"analytics:read|Analytics Read"
	"pipeline:write|Pipeline Write"
	"system:read|System Read"
	"sessions.consented:read|Consented Sessions Read"
	"sessions:read|Sessions Read"
)

for role_def in "${ROLES[@]}"; do
	role_key="${role_def%%|*}"
	role_display="${role_def##*|}"
	api_or_conflict POST "management/v1/projects/$PROJECT_ID/roles" -d "{
    \"roleKey\": \"$role_key\",
    \"displayName\": \"$role_display\"
  }" >/dev/null
	info "  Role: $role_key"
done

# ── 5. Grant all roles to admin user (idempotent) ─────────────────────────────

info "Looking up admin user ($ADMIN_LOGIN)..."
# Fetch all human users in the org and filter by preferredLoginName in jq —
# avoids relying on query method enum values that vary across Zitadel versions.
ALL_USERS=$(api POST "management/v1/users/_search" -d '{"type": "TYPE_HUMAN"}')
USER_ID=$(printf '%s' "$ALL_USERS" | jq -r --arg login "$ADMIN_LOGIN" \
	'.result[] | select(.preferredLoginName == $login) | .id' | head -1)
[[ "$USER_ID" == "null" || -z "$USER_ID" ]] && die "Admin user $ADMIN_LOGIN not found in org. Users found: $(printf '%s' "$ALL_USERS" | jq -r '.result[].preferredLoginName')"
info "Admin user ID: $USER_ID"

info "Granting roles to admin..."
api_or_conflict POST "management/v1/users/$USER_ID/grants" -d "{
  \"projectId\": \"$PROJECT_ID\",
  \"roleKeys\": [\"analytics:read\", \"pipeline:write\", \"system:read\", \"sessions.consented:read\", \"sessions:read\"]
}" >/dev/null
info "Roles granted"

# ── 5b. Grant roles to setup-sa machine user (for API testing via PAT) ────────

info "Looking up setup-sa machine user..."
SA_USERS=$(api POST "management/v1/users/_search" -d '{"type": "TYPE_MACHINE"}')
SA_ID=$(printf '%s' "$SA_USERS" | jq -r '.result[] | select(.userName == "setup-sa") | .id' | head -1)
if [[ -n "$SA_ID" && "$SA_ID" != "null" ]]; then
	api_or_conflict POST "management/v1/users/$SA_ID/grants" -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"roleKeys\": [\"analytics:read\", \"pipeline:write\", \"system:read\", \"sessions.consented:read\", \"sessions:read\"]
  }" >/dev/null
	info "Roles granted to setup-sa — use its PAT from init logs for API testing"
else
	warn "setup-sa not found — skipping machine user grant"
fi

# ── 6. Create permissions Action (idempotent) ─────────────────────────────────

info "Creating/updating addPermissionsToToken Action..."
# Uses ES5 — Zitadel's Action runtime does not support full ES6.
# Guards against grants.list or grant.roles being undefined (Zitadel can return
# grants.count > 0 while list is still undefined for certain token flows).
SCRIPT='function addPermissionsToToken(ctx, api) {
  var permissions = [];
  var grants = ctx.v1.user.grants;
  if (grants && grants.count > 0 && grants.list) {
    for (var i = 0; i < grants.count; i++) {
      var grant = grants.list[i];
      if (grant && grant.roles) {
        for (var j = 0; j < grant.roles.length; j++) {
          permissions.push(grant.roles[j]);
        }
      }
    }
  }
  api.v1.claims.setClaim("permissions", permissions);
}'

ACTION=$(api_or_conflict POST "management/v1/actions" -d "{
  \"name\": \"addPermissionsToToken\",
  \"script\": $(printf '%s' "$SCRIPT" | jq -Rs .),
  \"timeout\": \"10s\",
  \"allowedToFail\": false
}")

if [[ -z "$ACTION" ]]; then
	warn "Action already exists — looking up and updating script..."
	ACTION=$(api POST "management/v1/actions/_search" -d '{
    "queries": [{"actionNameQuery": {"name": "addPermissionsToToken", "method": "TEXT_QUERY_METHOD_EQUALS"}}]
  }')
	ACTION_ID=$(printf '%s' "$ACTION" | jq -r '.result[0].id')
	# Update the script in case it changed.
	# 400 "No changes" means already up to date — treat as success.
	_tmpfile=$(mktemp)
	_code=$(curl -s -o "$_tmpfile" -w "%{http_code}" -X PUT "$ZITADEL_BASE/management/v1/actions/$ACTION_ID" \
		-H "Authorization: Bearer $PAT" \
		-H "Content-Type: application/json" \
		-d "{
      \"name\": \"addPermissionsToToken\",
      \"script\": $(printf '%s' "$SCRIPT" | jq -Rs .),
      \"timeout\": \"10s\",
      \"allowedToFail\": false
    }")
	rm -f "$_tmpfile"
	if [[ "$_code" != "200" && "$_code" != "400" ]]; then
		die "HTTP $_code updating action $ACTION_ID"
	fi
	info "Action up to date — ID: $ACTION_ID"
else
	ACTION_ID=$(printf '%s' "$ACTION" | jq -r '.id')
	info "Action created — ID: $ACTION_ID"
fi

# ── 7. Register Action on Complement Token flow ───────────────────────────────
# SetTriggerActions uses PUT in the Zitadel Management REST API.
# Complement Token flow (type 2) valid trigger types:
#   4 = TRIGGER_TYPE_PRE_USERINFO_CREATION
#   5 = TRIGGER_TYPE_PRE_ACCESS_TOKEN_CREATION
# Probe both integer values and string enum names for compatibility.

probe_trigger() {
	local method="$1" api_path="$2" trigger="$3"
	local tmpfile http_code body
	tmpfile=$(mktemp)
	http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" -X "$method" \
		"$ZITADEL_BASE/$api_path/flows/2/trigger/$trigger" \
		-H "Authorization: Bearer $PAT" \
		-H "Content-Type: application/json" \
		-d "{\"actionIds\": [\"$ACTION_ID\"]}")
	body=$(cat "$tmpfile")
	rm -f "$tmpfile"
	printf '%s' "$http_code"
}

info "Registering Action on Complement Token flow triggers..."
REGISTERED=0

# Complement Token flow (type 2) has two trigger points.
# SetTriggerActions is PUT in the REST API (not POST).
# Try each trigger type independently across management/admin APIs and PUT/POST.
register_trigger() {
	local trigger="$1"
	for api_path in "management/v1" "admin/v1"; do
		for method in PUT POST; do
			local code
			code=$(probe_trigger "$method" "$api_path" "$trigger")
			if [[ "$code" == "200" ]]; then
				info "  $method $api_path trigger=$trigger → registered"
				return 0
			fi
		done
	done
	return 1
}

# Trigger 4 = TRIGGER_TYPE_PRE_USERINFO_CREATION
if register_trigger 4 || register_trigger TRIGGER_TYPE_PRE_USERINFO_CREATION; then
	REGISTERED=$((REGISTERED + 1))
fi

# Trigger 5 = TRIGGER_TYPE_PRE_ACCESS_TOKEN_CREATION
if register_trigger 5 || register_trigger TRIGGER_TYPE_PRE_ACCESS_TOKEN_CREATION; then
	REGISTERED=$((REGISTERED + 1))
fi

if [[ "$REGISTERED" -eq 0 ]]; then
	warn "Flow trigger auto-registration not supported on this Zitadel version."
	warn "One-time manual step in UI:"
	warn "  Actions → Flows → Complement Token → pencil on Pre Userinfo Creation → select addPermissionsToToken → Add trigger"
	warn "  Repeat for Pre Access Token Creation"
else
	info "Flow triggers registered ($REGISTERED/2 trigger(s))"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}=== Zitadel setup complete ===${NC}"
echo ""
echo "Add these to your .env.config:"
echo ""
echo "  ZITADEL_JWKS_URI=$ZITADEL_BASE/oauth/v2/keys"
echo "  ZITADEL_ISSUER=$ZITADEL_BASE"
echo "  ZITADEL_AUDIENCE=$CLIENT_ID"
echo "  AUTH_ENABLED=true"
echo ""
echo "Frontend OIDC client ID (for browser login flow):"
echo "  VITE_ZITADEL_CLIENT_ID=$WEB_CLIENT_ID"
echo "  VITE_ZITADEL_AUTHORITY=$ZITADEL_BASE"
echo ""
echo "To test permissions claim — browser login:"
echo "  $ZITADEL_BASE/oauth/v2/authorize?client_id=$WEB_CLIENT_ID&redirect_uri=http://localhost:5173/callback&response_type=code&scope=openid+profile+email+urn:zitadel:iam:org:project:id:$PROJECT_ID:aud"
