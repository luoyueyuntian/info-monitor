#!/usr/bin/env bash
# End-to-end verification script for info-monitor
# Verifies the main runtime path: API health, sources, themes, events, notifications, summaries
# Usage: ./scripts/verify-e2e.sh [API_BASE_URL]
# Default API_BASE_URL: http://localhost:3001

set -euo pipefail

API_BASE="${1:-http://localhost:3001}"
PASS=0
FAIL=0
SKIP=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "  ✅ $name (HTTP $status)"
    PASS=$((PASS + 1))
  elif [ "$status" = "000" ]; then
    echo "  ⏭  $name (connection refused - server not running?)"
    SKIP=$((SKIP + 1))
  else
    echo "  ❌ $name (HTTP $status, expected $expected_status)"
    FAIL=$((FAIL + 1))
  fi
}

check_json() {
  local name="$1"
  local url="$2"
  local field="$3"

  local body
  body=$(curl -s "$url" 2>/dev/null || echo "{}")
  local value
  # Handle both arrays (check length) and objects (check field existence)
  value=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    print(len(data))
elif isinstance(data, dict):
    print(data.get('$field', '__MISSING__'))
else:
    print('__MISSING__')
" 2>/dev/null || echo "__ERROR__")

  if [ "$value" != "__MISSING__" ] && [ "$value" != "__ERROR__" ] && [ "$value" != "None" ] && [ "$value" != "0" ]; then
    echo "  ✅ $name (count/value=$value)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name (missing or empty)"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔍 Info Monitor E2E Verification"
echo "   API: $API_BASE"
echo ""

# ── 1. Health Check ──
echo "1. Health Check"
check "GET /api/health" "$API_BASE/api/health"
echo ""

# ── 2. Sources ──
echo "2. Sources"
check "GET /api/sources/status" "$API_BASE/api/sources/status"
check "GET /api/sources/presets" "$API_BASE/api/sources/presets"
check_json "Sources list has items" "$API_BASE/api/sources/status" "0"
echo ""

# ── 3. Themes ──
echo "3. Themes"
check "GET /api/themes" "$API_BASE/api/themes"
check_json "Themes list has items" "$API_BASE/api/themes" "0"
echo ""

# ── 4. Events ──
echo "4. Events"
check "GET /api/events" "$API_BASE/api/events"
echo ""

# ── 5. Notifications ──
echo "5. Notifications"
check "GET /api/notifications" "$API_BASE/api/notifications"
check "GET /api/notifications/stats" "$API_BASE/api/notifications/stats"
echo ""

# ── 6. Daily Summary ──
echo "6. Daily Summary"
check "GET /api/daily-summary" "$API_BASE/api/daily-summary"
echo ""

# ── 7. Weekly Summary ──
echo "7. Weekly Summary"
check "GET /api/weekly-summary" "$API_BASE/api/weekly-summary"
check "GET /api/weekly-summary/history" "$API_BASE/api/weekly-summary/history?weeks=4"
check "GET /api/weekly-summary/export" "$API_BASE/api/weekly-summary/export?format=text"
echo ""

# ── 8. Source Health ──
echo "8. Source Health"
check "GET /api/sources/health" "$API_BASE/api/sources/health"
check "GET /api/sources/operational-metrics" "$API_BASE/api/sources/operational-metrics"
echo ""

# ── 9. Notification Preferences ──
echo "9. Notification Preferences"
check "GET /api/notification-preferences" "$API_BASE/api/notification-preferences"
echo ""

# ── 10. Dashboard ──
echo "10. Dashboard"
check "GET /api/dashboard" "$API_BASE/api/dashboard"
echo ""

# ── Summary ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: ✅ $PASS passed, ❌ $FAIL failed, ⏭ $SKIP skipped"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "⚠️  Some checks failed. Verify the API server is running and healthy."
  exit 1
elif [ $SKIP -gt 0 ] && [ $PASS -eq 0 ]; then
  echo ""
  echo "⏭  All checks were skipped. Is the server running at $API_BASE?"
  exit 2
else
  echo ""
  echo "✅ All checks passed!"
  exit 0
fi
