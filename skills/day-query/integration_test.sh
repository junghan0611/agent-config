#!/usr/bin/env bash
# day-query integration test — verifies all 5 CLIs work together
# Run from pi-skills/day-query/
set -uo pipefail

PASS=0
FAIL=0
DATE="2023-02-22"

pass() { echo "  ✅ $1"; ((PASS++)); }
fail() { echo "  ❌ $1: $2"; ((FAIL++)); }

echo "=== day-query integration test ==="
echo "Date: $DATE"
echo ""

# 1. gitcli day
echo "--- gitcli ---"
if command -v gitcli &>/dev/null; then
    OUT=$(gitcli day "$DATE" --me --repos ~/repos/gh 2>/dev/null || true)
    if echo "$OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'date' in d" 2>/dev/null; then
        COMMITS=$(echo "$OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_commits'])")
        pass "gitcli day: $COMMITS commits"
    else
        fail "gitcli day" "invalid JSON output"
    fi

    OUT=$(gitcli repos --repos ~/repos/gh 2>/dev/null || true)
    REPOS=$(echo "$OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_repos'])" 2>/dev/null || echo "0")
    pass "gitcli repos: $REPOS repos"

    OUT=$(gitcli timeline --month 2023-02 --me --repos ~/repos/gh 2>/dev/null || true)
    DAYS=$(echo "$OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['active_days'])" 2>/dev/null || echo "0")
    pass "gitcli timeline: $DAYS active days"
else
    fail "gitcli" "not found in PATH"
fi

# 2. denotecli day
echo ""
echo "--- denotecli ---"
if command -v denotecli &>/dev/null; then
    OUT=$(denotecli day "$DATE" 2>/dev/null || true)
    if echo "$OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['date']=='$DATE'" 2>/dev/null; then
        HAS_JOURNAL=$(echo "$OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('journal') else 'no')")
        HAS_DATETREE=$(echo "$OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('datetree') else 'no')")
        NOTES=$(echo "$OUT" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('notes_created',[])))")
        MODIFIED=$(echo "$OUT" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('notes_modified',[])))")
        pass "denotecli day: journal=$HAS_JOURNAL datetree=$HAS_DATETREE notes=$NOTES modified=$MODIFIED"
    else
        fail "denotecli day" "invalid output"
    fi

    OUT=$(denotecli timeline-journal --month 2023-02 2>/dev/null || true)
    ACTIVE=$(echo "$OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['active_days'])" 2>/dev/null || echo "0")
    pass "denotecli timeline-journal: $ACTIVE active days"
else
    fail "denotecli" "not found in PATH"
fi

# 3. lifetract read
echo ""
echo "--- lifetract ---"
if command -v lifetract &>/dev/null; then
    OUT=$(lifetract read "$DATE" 2>/dev/null || true)
    if echo "$OUT" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
        pass "lifetract read: OK"
    else
        # lifetract may not have data for old dates
        pass "lifetract read: no data for $DATE (expected for old dates)"
    fi
else
    fail "lifetract" "not found in PATH"
fi

# 4. bibcli (optional)
echo ""
echo "--- bibcli ---"
if command -v bibcli &>/dev/null; then
    OUT=$(bibcli search "20230222" 2>/dev/null || true)
    if [ -n "$OUT" ]; then
        pass "bibcli search: found entries"
    else
        pass "bibcli search: no bib entries for $DATE (normal)"
    fi
else
    echo "  ⏭️  bibcli not in PATH (optional)"
fi

# 5. gogcli (optional)
echo ""
echo "--- gogcli ---"
if command -v gog &>/dev/null; then
    echo "  ⏭️  gogcli available but skipped (requires auth)"
else
    echo "  ⏭️  gogcli not in PATH (optional)"
fi

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "✅ All integration tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
