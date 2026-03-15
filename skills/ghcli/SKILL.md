---
name: ghcli
description: GitHub CLI for issues, PRs, starred repos, notifications, and repository exploration. Use when user asks about GitHub activity, starred projects, PR reviews, or issue management.
---

# GitHub CLI

Command-line interface for GitHub operations via `gh`.

## Authentication

Already configured via `GITHUB_PERSONAL_ACCESS_TOKEN` in Claude Code settings.

## Common Operations

### Issues

```bash
gh issue list -R owner/repo                       # List open issues
gh issue list -R owner/repo --state all --limit 20 # All issues
gh issue view 123 -R owner/repo                    # View issue details
gh issue create -R owner/repo --title "T" --body "B"  # Create issue
gh issue comment 123 -R owner/repo --body "comment"
```

### Pull Requests

```bash
gh pr list -R owner/repo                          # List open PRs
gh pr view 123 -R owner/repo                      # View PR details
gh pr diff 123 -R owner/repo                      # View PR diff
gh pr checks 123 -R owner/repo                    # CI status
gh pr status                                       # PRs involving you
gh pr create --title "T" --body "B"                # Create PR
gh pr review 123 --approve                         # Approve PR
gh api repos/owner/repo/pulls/123/comments         # PR comments
```

### Starred Repos (Interests & Network)

```bash
# Recent stars (latest first)
gh api user/starred --paginate --jq '.[:10][] | {full_name, description, language, stargazers_count}'

# Search by topic/language
gh api user/starred --paginate --jq '[.[] | select(.language == "Rust")] | length'
gh api user/starred --paginate --jq '.[] | select(.topics[]? == "emacs") | .full_name'
gh api user/starred --paginate --jq '.[] | select(.description? // "" | test("mcp|agent"; "i")) | {full_name, description}'

# Star count & language stats
gh api user/starred --paginate --jq 'group_by(.language) | map({language: .[0].language, count: length}) | sort_by(-.count) | .[:10][]'

# Recently active starred repos
gh api user/starred --paginate --jq '[.[] | select(.pushed_at > "2026-01-01")] | sort_by(.pushed_at) | reverse | .[:10][] | {full_name, pushed_at, language}'

# People (starred repo owners = interests network)
gh api user/starred --paginate --jq '[.[].owner.login] | group_by(.) | map({user: .[0], repos: length}) | sort_by(-.repos) | .[:10][]'
```

### Starred repos with star date

```bash
# With starred_at timestamp (when you starred it)
gh api user/starred --paginate -H "Accept: application/vnd.github.star+json" --jq '.[:5][] | {starred_at, repo: .repo.full_name, desc: .repo.description}'

# Stars from this month
gh api user/starred --paginate -H "Accept: application/vnd.github.star+json" --jq '.[] | select(.starred_at > "2026-02-01") | {starred_at, repo: .repo.full_name}'
```

### Repository Exploration

```bash
gh repo view owner/repo                           # Repo overview
gh repo view owner/repo --json description,stargazerCount,languages
gh api repos/owner/repo/contributors --jq '.[:5][] | {login, contributions}'
gh api repos/owner/repo/releases --jq '.[0] | {tag_name, published_at, name}'
gh search repos "keyword" --language rust --sort stars
```

### Notifications

```bash
gh api notifications --jq '.[:10][] | {reason, title: .subject.title, repo: .repository.full_name, updated_at}'
```

### User accounts

The user has two GitHub accounts:
- **Personal**: junghan0611 (junghanacs@gmail.com) - repos in ~/repos/gh/
- **Work**: jhkim2goqual (jhkim2@goqual.com) - repos in ~/repos/work/

Default `gh` auth uses the personal account.

## BibTeX Export (Offline Reference)

For full starred repos export to BibTeX (Citar/Emacs integration):
```bash
~/repos/gh/memex-kb/scripts/gh_starred_to_bib.sh [output.bib]
# Default output: ~/org/resources/github-starred.bib
```

## Tips

- Use `--paginate` for starred repos (may have hundreds)
- Use `--jq` for filtering (avoids piping to jq separately)
- `-R owner/repo` specifies repo without cd-ing into it
- `gh api` can call any GitHub REST API endpoint
