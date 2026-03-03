#!/usr/bin/env bash
# Claude Code PostToolUse hook: after a phase completion commit, remind Claude
# to update the wiki Phase-XX.md and Phase-Log.md with what was built.
#
# Detects commits matching: docs(phase-XX): complete phase execution
# Reads SUMMARY.md and VERIFICATION.md from the completed phase to provide
# context for the wiki update.
#
# Receives tool input as JSON on stdin.

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only act on git commit commands
if [[ ! "$command" =~ git\ commit ]]; then
    exit 0
fi

# Check if the latest commit is a phase completion commit
msg=$(git log -1 --format=%s HEAD 2>/dev/null)
if [[ ! "$msg" =~ ^docs\(phase-([0-9]+)\):\ complete\ phase ]]; then
    exit 0
fi

phase_num="${BASH_REMATCH[1]}"
phase_padded=$(printf "%02d" "$phase_num")

# Find the phase directory
phase_dir=$(find .planning/phases/ -maxdepth 1 -type d -name "${phase_padded}-*" 2>/dev/null | head -1)
if [[ -z "$phase_dir" ]]; then
    exit 0
fi

# Check if wiki page already has "What Was Built" (already updated)
wiki_page="docs/wiki/Phase-${phase_padded}.md"
if [[ -f "$wiki_page" ]] && grep -q "What Was Built" "$wiki_page" 2>/dev/null; then
    exit 0
fi

# Collect summary files for context
summaries=""
for f in "$phase_dir"/*-SUMMARY.md; do
    [[ -f "$f" ]] && summaries="$summaries $f"
done

verification=""
for f in "$phase_dir"/*-VERIFICATION.md; do
    [[ -f "$f" ]] && verification="$f"
done

cat <<EOF
WIKI UPDATE REQUIRED: Phase ${phase_padded} was just completed but the wiki hasn't been updated yet.

You MUST update the wiki now:

1. Read the phase SUMMARY files: ${summaries}
   ${verification:+And verification: $verification}

2. Update docs/wiki/Phase-${phase_padded}.md:
   - Change Status to: Complete (with today's date)
   - Add "What Was Built" section with subsection per plan (from SUMMARY files)
   - Add "Key Decisions" table (from SUMMARY frontmatter key-decisions)
   - Add "Key Files" section (from SUMMARY frontmatter key-files)
   - Add "Requirements Satisfied" (from SUMMARY frontmatter requirements-completed)
   - Add "Verification" summary (from VERIFICATION.md score)

3. Update docs/wiki/Phase-Log.md:
   - Change Phase ${phase_padded} status to "Complete"
   - Set the next phase status to "Next"

4. Commit the wiki changes.

The wiki push hook will auto-sync to GitHub when you write the files.
EOF

exit 0
