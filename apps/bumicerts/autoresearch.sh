#!/bin/bash
set -euo pipefail

missing=4
screenshots=0
videos=0
exit_code=0
failures=0
unpassed=0
evidence_assertions=0

if [ -d e2e ]; then
  if find e2e -type f | grep -Eq 'auth|setup'; then missing=$((missing - 1)); fi
  if find e2e -type f | xargs grep -E "(/|explore|leaderboard|organizations|create|checkout|dashboard|account)" >/dev/null 2>&1; then missing=$((missing - 1)); fi
  if find e2e -type f | xargs grep -Ei "create.*bumicert|bumicert.*create" >/dev/null 2>&1; then missing=$((missing - 1)); fi
  if find e2e -type f | xargs grep -Ei "evidence|timeline" >/dev/null 2>&1; then missing=$((missing - 1)); fi
  screenshots=$(find e2e -type f | xargs grep -E "screenshot|screenshotStep|attach\(" 2>/dev/null | wc -l | tr -d ' ')
  videos=$(find e2e -type f | xargs grep -E "video|recordVideo" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -f e2e/tests/evidence-timeline.spec.ts ]; then
  evidence_assertions=$(grep -Ec 'await expect\(' e2e/tests/evidence-timeline.spec.ts || true)
fi

output_file=$(mktemp)
if CI=1 bun run test:e2e >"$output_file" 2>&1; then
  exit_code=0
else
  exit_code=$?
  failures=1
fi

failed_count=$(grep -Eo '^[[:space:]]*[0-9]+ failed' "$output_file" | tail -1 | awk '{print $1}' || true)
did_not_run_count=$(grep -Eo '^[[:space:]]*[0-9]+ did not run' "$output_file" | tail -1 | awk '{print $1}' || true)
failed_count=${failed_count:-0}
did_not_run_count=${did_not_run_count:-0}
unpassed=$((failed_count + did_not_run_count))

if [ "$unpassed" -ne 0 ]; then
  evidence_assertions=0
fi

tail -80 "$output_file"

printf 'METRIC evidence_assertions=%s\n' "$evidence_assertions"
printf 'METRIC e2e_unpassed_tests=%s\n' "$unpassed"
printf 'METRIC e2e_failures=%s\n' "$failures"
printf 'METRIC missing_required_flows=%s\n' "$missing"
printf 'METRIC e2e_exit_code=%s\n' "$exit_code"
printf 'METRIC screenshots_found=%s\n' "$screenshots"
printf 'METRIC videos_found=%s\n' "$videos"
