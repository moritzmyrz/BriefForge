#!/usr/bin/env bash
# BriefForge — example curl commands
# Make sure the server is running: pnpm dev
# BASE_URL defaults to localhost:3000

BASE_URL="${BRIEFFORGE_URL:-http://localhost:3000}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BriefForge API examples"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Health check
echo ""
echo "── 1. Health check ──────────────────────────────"
curl -s "$BASE_URL/health" | jq .

# 2. Ingest text (deferred extraction)
echo ""
echo "── 2. Ingest text (deferred) ────────────────────"
INGEST_RESPONSE=$(curl -s -X POST "$BASE_URL/ingest" \
  -H "Content-Type: application/json" \
  -d @examples/payloads/support-ticket.json)
echo "$INGEST_RESPONSE" | jq .
REQUEST_ID=$(echo "$INGEST_RESPONSE" | jq -r '.requestId')
echo "Request ID: $REQUEST_ID"

# 3. Fetch the request
echo ""
echo "── 3. Fetch request ─────────────────────────────"
curl -s "$BASE_URL/requests/$REQUEST_ID" | jq .

# 4. Run extraction on the ingested request
echo ""
echo "── 4. Run extraction ────────────────────────────"
EXTRACT_RESPONSE=$(curl -s -X POST "$BASE_URL/extract" \
  -H "Content-Type: application/json" \
  -d "{\"requestId\": \"$REQUEST_ID\"}")
echo "$EXTRACT_RESPONSE" | jq .
ARTIFACT_ID=$(echo "$EXTRACT_RESPONSE" | jq -r '.artifact.id')
echo "Artifact ID: $ARTIFACT_ID"

# 5. Fetch the artifact
echo ""
echo "── 5. Fetch artifact ────────────────────────────"
curl -s "$BASE_URL/artifacts/$ARTIFACT_ID" | jq .

# 6. Ingest + extract in one call
echo ""
echo "── 6. Ingest + extract immediately ──────────────"
curl -s -X POST "$BASE_URL/ingest" \
  -H "Content-Type: application/json" \
  -d @examples/payloads/meeting-notes.json | jq .

# 7. Promote an artifact to published
echo ""
echo "── 7. Promote artifact ──────────────────────────"
curl -s -X POST "$BASE_URL/workflows/$ARTIFACT_ID/promote" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# 8. Reject an artifact
echo ""
echo "── 8. Reject an artifact ────────────────────────"
echo "(Requires a validated artifact ID — substitute your own)"
# curl -s -X POST "$BASE_URL/workflows/art_.../promote" \
#   -H "Content-Type: application/json" \
#   -d '{"status": "rejected"}' | jq .
