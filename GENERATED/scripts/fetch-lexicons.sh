#!/bin/bash
#
# Fetch and merge lexicons from multiple sources.
#
# Sources (in priority order — later sources win on file conflicts):
#   1. GainForest/lexicons
#   2. hypercerts-org/hypercerts-lexicon
#
# Each source can be provided in one of two modes:
#   Remote — clone from GitHub at a specific branch (default: main)
#   Local  — copy from a local directory (must contain a lexicons/ subdir)
#
# Merge behaviour:
#   - Output directory is wiped clean once at the start.
#   - Files from source 1 are copied first.
#   - Files from source 2 overwrite any conflicts from source 1.
#   - Both sources must have a top-level "lexicons/" subdirectory.
#
# After merging, the script verifies that every $ref used across all
# fetched lexicons can be resolved locally. If any ref is missing,
# the script exits with a non-zero code and prints the missing IDs —
# so codegen fails loudly instead of silently generating broken types.
#
# Usage:
#   ./GENERATED/scripts/fetch-lexicons.sh [options]
#
# Options:
#   -gb, --gainforest-branch <branch>   Branch for GainForest/lexicons (default: main)
#   -gl, --gainforest-local  <path>     Use a local folder instead of cloning GainForest/lexicons
#   -hb, --hypercerts-branch <branch>   Branch for hypercerts-org/hypercerts-lexicon (default: main)
#   -hl, --hypercerts-local  <path>     Use a local folder instead of cloning hypercerts-org/hypercerts-lexicon
#   -h,  --help                         Show this help message
#
# Notes:
#   - Passing both --gainforest-branch and --gainforest-local is an error.
#   - Passing both --hypercerts-branch and --hypercerts-local is an error.
#   - Local paths must contain a "lexicons/" subdirectory, same as the remote repos.

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================

LEXICONS_SUBDIR="lexicons"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$GENERATED_DIR/lexicons"

# Default values — remote mode, main branch
GAINFOREST_BRANCH="main"
GAINFOREST_LOCAL=""
HYPERCERTS_BRANCH="main"
HYPERCERTS_LOCAL=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================
# HELPERS
# ============================================================

error() {
  echo -e "${RED}Error: $1${NC}" >&2
  exit 1
}

# Copy a lexicons/ subdir from a local path into $OUTPUT_DIR.
# Args: <label> <local-path>
copy_from_local() {
  local LABEL="$1"
  local LOCAL_PATH="$2"

  # Resolve to absolute path
  LOCAL_PATH="$(cd "$LOCAL_PATH" 2>/dev/null && pwd)" \
    || error "Path not found: $2"

  echo ""
  echo -e "${CYAN}── Source: ${GREEN}$LABEL${CYAN} (local) → ${GREEN}$LOCAL_PATH${NC}"

  local SUBDIR="$LOCAL_PATH/$LEXICONS_SUBDIR"
  if [ ! -d "$SUBDIR" ]; then
    error "No '$LEXICONS_SUBDIR/' subdirectory found in $LOCAL_PATH"
  fi

  local FILE_COUNT
  FILE_COUNT=$(find "$SUBDIR" -name "*.json" | wc -l | tr -d ' ')

  if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}  Warning: No lexicon files found in $SUBDIR${NC}"
    return 0
  fi

  echo -e "  Found ${GREEN}$FILE_COUNT${NC} file(s)"

  local COPIED=0
  local OVERWRITTEN=0

  while IFS= read -r -d '' file; do
    local REL_PATH="${file#$SUBDIR/}"
    local DEST_PATH="$OUTPUT_DIR/$REL_PATH"
    local DEST_DIR
    DEST_DIR=$(dirname "$DEST_PATH")

    mkdir -p "$DEST_DIR"

    local STATUS="new"
    if [ -f "$DEST_PATH" ]; then
      STATUS="overwrite"
    fi

    # Pretty-print JSON (validate) or copy as-is
    if python3 -m json.tool "$file" > "$DEST_PATH" 2>/dev/null; then
      :
    elif jq '.' "$file" > "$DEST_PATH" 2>/dev/null; then
      :
    else
      cp "$file" "$DEST_PATH"
    fi

    if [ "$STATUS" = "overwrite" ]; then
      echo -e "  ${YELLOW}[OVERWRITE]${NC} $REL_PATH"
      ((OVERWRITTEN++))
    else
      echo -e "  ${GREEN}[OK]${NC} $REL_PATH"
    fi
    ((COPIED++))
  done < <(find "$SUBDIR" -name "*.json" -print0)

  echo -e "  Copied: ${GREEN}$COPIED${NC} file(s)  (overwrites: ${YELLOW}$OVERWRITTEN${NC})"
}

# Clone a repo (sparse), copy its lexicons/ into $OUTPUT_DIR.
# Args: <repo> <branch> <temp-dir>
fetch_and_merge() {
  local REPO="$1"
  local BRANCH="$2"
  local TEMP_REPO="$3"

  echo ""
  echo -e "${CYAN}── Source: ${GREEN}$REPO${CYAN} @ ${GREEN}$BRANCH${NC} (remote)"

  cd "$TEMP_REPO"
  git clone --depth 1 --filter=blob:none --sparse \
    "https://github.com/$REPO.git" \
    --branch "$BRANCH" \
    repo 2>&1 | grep -v "^remote:" || true

  cd repo
  git sparse-checkout set "$LEXICONS_SUBDIR" 2>/dev/null

  if [ ! -d "$LEXICONS_SUBDIR" ]; then
    error "No '$LEXICONS_SUBDIR/' directory found in $REPO @ $BRANCH"
  fi

  local FILE_COUNT
  FILE_COUNT=$(find "$LEXICONS_SUBDIR" -name "*.json" | wc -l | tr -d ' ')

  if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}  Warning: No lexicon files found in $REPO${NC}"
    return 0
  fi

  echo -e "  Found ${GREEN}$FILE_COUNT${NC} file(s)"

  local COPIED=0
  local OVERWRITTEN=0

  while IFS= read -r -d '' file; do
    local REL_PATH="${file#$LEXICONS_SUBDIR/}"
    local DEST_PATH="$OUTPUT_DIR/$REL_PATH"
    local DEST_DIR
    DEST_DIR=$(dirname "$DEST_PATH")

    mkdir -p "$DEST_DIR"

    local STATUS="new"
    if [ -f "$DEST_PATH" ]; then
      STATUS="overwrite"
    fi

    # Pretty-print JSON (validate) or copy as-is
    if python3 -m json.tool "$file" > "$DEST_PATH" 2>/dev/null; then
      :
    elif jq '.' "$file" > "$DEST_PATH" 2>/dev/null; then
      :
    else
      cp "$file" "$DEST_PATH"
    fi

    if [ "$STATUS" = "overwrite" ]; then
      echo -e "  ${YELLOW}[OVERWRITE]${NC} $REL_PATH"
      ((OVERWRITTEN++))
    else
      echo -e "  ${GREEN}[OK]${NC} $REL_PATH"
    fi
    ((COPIED++))
  done < <(find "$LEXICONS_SUBDIR" -name "*.json" -print0)

  echo -e "  Copied: ${GREEN}$COPIED${NC} file(s)  (overwrites: ${YELLOW}$OVERWRITTEN${NC})"

  # Return to TEMP_DIR so the next clone starts clean
  cd "$TEMP_DIR"
}

# ============================================================
# ARG PARSING
# ============================================================

while [[ $# -gt 0 ]]; do
  case $1 in
    -gb|--gainforest-branch)
      [[ $# -lt 2 ]] && error "--gainforest-branch requires a value"
      GAINFOREST_BRANCH="$2"
      shift 2
      ;;
    -gl|--gainforest-local)
      [[ $# -lt 2 ]] && error "--gainforest-local requires a value"
      GAINFOREST_LOCAL="$2"
      shift 2
      ;;
    -hb|--hypercerts-branch)
      [[ $# -lt 2 ]] && error "--hypercerts-branch requires a value"
      HYPERCERTS_BRANCH="$2"
      shift 2
      ;;
    -hl|--hypercerts-local)
      [[ $# -lt 2 ]] && error "--hypercerts-local requires a value"
      HYPERCERTS_LOCAL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -gb, --gainforest-branch <branch>   Branch for GainForest/lexicons (default: main)"
      echo "  -gl, --gainforest-local  <path>     Use a local folder instead of cloning GainForest/lexicons"
      echo "  -hb, --hypercerts-branch <branch>   Branch for hypercerts-org/hypercerts-lexicon (default: main)"
      echo "  -hl, --hypercerts-local  <path>     Use a local folder instead of cloning hypercerts-org/hypercerts-lexicon"
      echo "  -h,  --help                         Show this help message"
      echo ""
      echo "Notes:"
      echo "  - --gainforest-branch and --gainforest-local are mutually exclusive."
      echo "  - --hypercerts-branch and --hypercerts-local are mutually exclusive."
      echo "  - Local paths must contain a 'lexicons/' subdirectory."
      echo ""
      echo "Examples:"
      echo "  $0                                              # fetch both from GitHub @ main"
      echo "  $0 --gainforest-branch feature-x               # GainForest from custom branch"
      echo "  $0 --gainforest-local ../lexicons               # GainForest from local sibling folder"
      echo "  $0 -gl ../lexicons -hl ../hypercerts-lexicon    # both from local folders"
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      ;;
  esac
done

# ── Conflict checks ───────────────────────────────────────────
if [[ -n "$GAINFOREST_LOCAL" && "$GAINFOREST_BRANCH" != "main" ]]; then
  error "Cannot specify both --gainforest-branch and --gainforest-local"
fi
if [[ -n "$HYPERCERTS_LOCAL" && "$HYPERCERTS_BRANCH" != "main" ]]; then
  error "Cannot specify both --hypercerts-branch and --hypercerts-local"
fi

# ============================================================
# MAIN
# ============================================================

echo ""
echo -e "${BLUE}=== GainForest Lexicon Fetcher ===${NC}"
echo ""
echo -e "Output dir: ${GREEN}$OUTPUT_DIR${NC}"
echo -e "Sources:"

if [[ -n "$GAINFOREST_LOCAL" ]]; then
  echo -e "  ${GREEN}GainForest/lexicons${NC}                  local → ${GREEN}$GAINFOREST_LOCAL${NC}"
else
  echo -e "  ${GREEN}GainForest/lexicons${NC}                  remote @ ${GREEN}$GAINFOREST_BRANCH${NC}"
fi

if [[ -n "$HYPERCERTS_LOCAL" ]]; then
  echo -e "  ${GREEN}hypercerts-org/hypercerts-lexicon${NC}    local → ${GREEN}$HYPERCERTS_LOCAL${NC}"
else
  echo -e "  ${GREEN}hypercerts-org/hypercerts-lexicon${NC}    remote @ ${GREEN}$HYPERCERTS_BRANCH${NC}"
fi

# ── Clean output dir once ──────────────────────────────────────
echo ""
echo -e "${YELLOW}Cleaning output directory...${NC}"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# ── Shared temp dir for remote clones ─────────────────────────
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# ── Source 1: GainForest/lexicons ─────────────────────────────
if [[ -n "$GAINFOREST_LOCAL" ]]; then
  copy_from_local "GainForest/lexicons" "$GAINFOREST_LOCAL"
else
  TEMP_REPO_1="$TEMP_DIR/repo1"
  mkdir -p "$TEMP_REPO_1"
  fetch_and_merge "GainForest/lexicons" "$GAINFOREST_BRANCH" "$TEMP_REPO_1"
fi

# ── Source 2: hypercerts-org/hypercerts-lexicon ───────────────
if [[ -n "$HYPERCERTS_LOCAL" ]]; then
  copy_from_local "hypercerts-org/hypercerts-lexicon" "$HYPERCERTS_LOCAL"
else
  TEMP_REPO_2="$TEMP_DIR/repo2"
  mkdir -p "$TEMP_REPO_2"
  fetch_and_merge "hypercerts-org/hypercerts-lexicon" "$HYPERCERTS_BRANCH" "$TEMP_REPO_2"
fi

# ============================================================
# REF RESOLUTION CHECK
# Collect every $ref / ref value across all fetched lexicons.
# Resolve each one to a local file. Fail if any is missing.
# ============================================================

echo ""
echo -e "${YELLOW}Checking all \$ref references are resolvable...${NC}"

# Extract every ref string: handles "ref": "x.y.z" and "refs": ["x.y.z"]
# Strip fragment (#fragment), deduplicate, sort.
ALL_REFS=$(
  find "$OUTPUT_DIR" -name "*.json" -print0 \
  | xargs -0 python3 -c "
import sys, json, re

refs = set()
for path in sys.argv[1:]:
    try:
        text = open(path).read()
        # find all \"ref\": \"...\" values
        for m in re.finditer(r'\"refs?\"\s*:\s*(?:\"([^\"]+)\"|(\[[^\]]*\]))', text):
            single, arr = m.group(1), m.group(2)
            if single:
                refs.add(single.split('#')[0])
            elif arr:
                for r in re.findall(r'\"([^\"]+)\"', arr):
                    refs.add(r.split('#')[0])
    except Exception:
        pass

for r in sorted(refs):
    print(r)
" 2>/dev/null
)

MISSING=()
while IFS= read -r ref; do
  # Skip self-refs (empty string after stripping fragment) and
  # refs that start with # (same-file fragment refs, no NSID)
  [[ -z "$ref" || "$ref" == \#* ]] && continue

  # Convert NSID to expected file path: dots → slashes + .json
  REL_FILE="${ref//.//}.json"
  FULL_PATH="$OUTPUT_DIR/$REL_FILE"

  if [ ! -f "$FULL_PATH" ]; then
    MISSING+=("$ref  →  lexicons/$REL_FILE")
  fi
done <<< "$ALL_REFS"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}ERROR: The following lexicon refs cannot be resolved locally:${NC}"
  for m in "${MISSING[@]}"; do
    echo -e "  ${RED}✗${NC} $m"
  done
  echo ""
  echo -e "${RED}Fix: add the missing lexicon files to one of the source repos,${NC}"
  echo -e "${RED}or add an additional source repo to this script.${NC}"
  echo -e "${RED}Do NOT add manual stubs — find the authoritative source.${NC}"
  exit 1
fi

echo -e "${GREEN}All refs resolved.${NC}"

# ── Summary ───────────────────────────────────────────────────
TOTAL=$(find "$OUTPUT_DIR" -name "*.json" | wc -l | tr -d ' ')

echo ""
echo -e "${BLUE}=== Results ===${NC}"
echo ""
echo -e "Total lexicon files: ${GREEN}$TOTAL${NC}"
echo -e "Output:              ${GREEN}$OUTPUT_DIR${NC}"
echo ""
echo -e "${GREEN}Done! Run 'bun run codegen' to generate types.${NC}"
