#!/bin/bash
set -euo pipefail

# Only needed on ephemeral Claude Code on the web containers: this repo's
# .gitignore deliberately keeps .claude/skills, .agents/skills and
# skills-lock.json out of version control (same as node_modules), so a
# skill installed on one container is gone on the next. Reinstall it here.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

npx --yes skills@latest add https://github.com/latent-spaces/brag --skill brag
