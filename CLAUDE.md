# Repository rules

- Claude must never appear as a GitHub contributor of this repository. Every commit's author and committer is `ToughkidDEV <toughkiddev@gmail.com>`; wherever a name is needed, use ToughkidDEV.
- Before committing, make sure `git config user.name` / `user.email` are ToughkidDEV / toughkiddev@gmail.com (the SessionStart hook in `.claude/settings.json` sets them). Never commit as Claude or with a `noreply@anthropic.com` address.
- Never add Claude attribution anywhere: no `Co-Authored-By: Claude`, no `Claude-Session:` line, no "Generated with Claude Code" in commits, pull requests, issues or comments.
