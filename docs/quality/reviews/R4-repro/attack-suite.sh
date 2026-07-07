#!/usr/bin/env bash
# R4 Red-Team attack battery (NON-PRODUCTION probe). Execute against the live stack (CI/Docker).
# Requires: docker compose up --build  (app on ${BASE:-http://localhost:8080})
# This script only reports what the server does; it fixes nothing.
set -u
BASE="${BASE:-http://localhost:8080}"
API="$BASE/api"
pass(){ echo "PASS: $1"; }
fail(){ echo "FAIL: $1"; }
hr(){ echo "----- $1 -----"; }

# --- helper: signup+verify is manual (needs mail). These probes assume you already
# have a verified account and exported TOKEN=<bearer> for the authz/business probes. ---
TOKEN="${TOKEN:-}"

hr "INVALID AUTH — no token on a business endpoint (expect 401 UNAUTHORIZED)"
curl -s -o /dev/null -w "  GET /teams no-auth -> %{http_code}\n" "$API/teams"

hr "INVALID AUTH — malformed Authorization header (expect 401)"
curl -s -o /dev/null -w "  bad scheme -> %{http_code}\n" -H "Authorization: Token abc" "$API/teams"
curl -s -o /dev/null -w "  garbage bearer -> %{http_code}\n" -H "Authorization: Bearer not.a.jwt" "$API/teams"

hr "UNKNOWN ROUTE (expect 404 NOT_FOUND ErrorBody, never 401)"
curl -s -w "\n  status=%{http_code}\n" "$API/does-not-exist"

hr "MALFORMED — bad JSON body (expect 400 VALIDATION_ERROR ErrorBody, no stack)"
curl -s -w "\n  status=%{http_code}\n" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' --data '{"email":'

hr "MALFORMED — wrong content-type with JSON payload (expect 4xx)"
curl -s -o /dev/null -w "  text/plain body -> %{http_code}\n" -X POST "$API/auth/login" \
  -H 'Content-Type: text/plain' --data '{"email":"a@b.co","password":"secret12"}'

hr "BOUNDARY — signup password 7 chars (expect 400) vs 8 chars (expect 201)"
curl -s -o /dev/null -w "  7-char pw -> %{http_code}\n" -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' --data '{"email":"b7@example.com","password":"1234567"}'
curl -s -o /dev/null -w "  8-char pw -> %{http_code}\n" -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' --data '{"email":"b8@example.com","password":"12345678"}'

hr "ACCOUNT ENUMERATION — signup existing email returns 409 EMAIL_TAKEN (enumeration oracle)"
curl -s -w "\n  status=%{http_code}\n" -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' --data '{"email":"b8@example.com","password":"12345678"}'

hr "VERIFICATION TOKEN — invalid / reused / expired (expect 400 TOKEN_INVALID/USED/EXPIRED)"
curl -s -w "\n  bogus token -> %{http_code}\n" "$API/auth/verify-email?token=deadbeef"

hr "SQL INJECTION — via login email, team name, ticket title search q (expect NO 500 / NO leak)"
curl -s -o /dev/null -w "  login email inj -> %{http_code}\n" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' --data "{\"email\":\"a' OR '1'='1@x.co\",\"password\":\"x\"}"
if [ -n "$TOKEN" ]; then
  curl -s -o /dev/null -w "  team name inj  -> %{http_code}\n" -X POST "$API/teams" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    --data "{\"name\":\"Robert'); DROP TABLE teams;--\"}"
  curl -s -o /dev/null -w "  ticket q inj   -> %{http_code}\n" -G "$API/tickets" \
    -H "Authorization: Bearer $TOKEN" --data-urlencode "teamId=$TEAM_ID" \
    --data-urlencode "q=%'; DROP TABLE tickets;--"
fi

hr "XSS — store script payload in ticket title/body & comment; assert it is stored VERBATIM"
echo "  (Then load the ticket in Chrome; React must render <script> as inert text, no alert())"
if [ -n "$TOKEN" ]; then
  curl -s -w "\n  create ticket status=%{http_code}\n" -X POST "$API/tickets" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    --data "{\"teamId\":\"$TEAM_ID\",\"type\":\"bug\",\"title\":\"<script>alert(1)</script>\",\"body\":\"<img src=x onerror=alert(2)>\"}"
fi

hr "WHITESPACE-ONLY TICKET TITLE/BODY (M1: expect 400 after trim; ACTUAL likely 201)"
if [ -n "$TOKEN" ]; then
  curl -s -w "\n  status=%{http_code}\n" -X POST "$API/tickets" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    --data "{\"teamId\":\"$TEAM_ID\",\"type\":\"bug\",\"title\":\"   \",\"body\":\"   \"}"
fi

hr "INVALID IDs — nonexistent ticket (expect 404), non-uuid id (expect 404 or 400, never 500)"
if [ -n "$TOKEN" ]; then
  curl -s -o /dev/null -w "  missing ticket -> %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" "$API/tickets/00000000-0000-0000-0000-000000000000"
  curl -s -o /dev/null -w "  non-uuid ticket -> %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" "$API/tickets/not-a-uuid"
fi

echo
echo "Review each status against ../R4-redteam.md expected-vs-actual."
