# commit-it

Interactive CLI for creating standardized git commits with GitHub integration, AI-powered message generation (via Claude Code, Codex, or any CLI), multi-commit splitting, co-author support, headless mode for agents, and configurable validation. Works as both a CLI tool and a programmatic library.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [`commit` (default)](#commit-default)
  - [`branch`](#branch)
  - [`validate`](#validate)
  - [`init`](#init)
  - [`install-hook` / `uninstall-hook`](#install-hook--uninstall-hook)
  - [`presets`](#presets)
  - [`config`](#config)
  - [`setup`](#setup)
  - [`setup-alias`](#setup-alias)
- [Interactive Commit Flow](#interactive-commit-flow)
- [Non-Interactive Mode](#non-interactive-mode)
- [Configuration](#configuration)
  - [Config File Locations](#config-file-locations)
  - [Full Config Reference](#full-config-reference)
  - [Scope Modes](#scope-modes)
  - [Custom Validation Rules](#custom-validation-rules)
  - [Config in package.json](#config-in-packagejson)
  - [Config in YAML](#config-in-yaml)
- [Presets](#presets-1)
- [AI Commit Messages](#ai-commit-messages)
- [GitHub Integration](#github-integration)
- [Git Hook](#git-hook)
- [Shell Alias](#shell-alias)
- [Validation Rules](#validation-rules)
- [Scope Suggestions](#scope-suggestions)
- [Co-authors](#co-authors)
- [Commit Message Templates](#commit-message-templates)
- [Programmatic API](#programmatic-api)
  - [Direct Commit](#direct-commit)
  - [Interactive Commit](#interactive-commit)
  - [Validate Commit Messages](#validate-commit-messages)
  - [Parse Commit Messages](#parse-commit-messages)
  - [Format Validation](#format-validation)
  - [Git Operations](#git-operations)
  - [GitHub Operations](#github-operations)
  - [Scope Suggestions](#scope-suggestions-api)
  - [Co-author Utilities](#co-author-utilities)
  - [Template Engine](#template-engine)
  - [AI Generation](#ai-generation)
  - [Config Utilities](#config-utilities)
  - [Preset Utilities](#preset-utilities)
- [Example Configurations](#example-configurations)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Installation

```bash
# npm
npm install commit-it

# bun
bun add commit-it

# pnpm
pnpm add commit-it

# global install
npm install -g commit-it

# or run without installing
npx commit-it
bunx commit-it
```

## Quick Start

```bash
# 1. Initialize config (optional - works without config too)
commit-it init

# 2. Set up a shell alias (optional - type "commit" instead of "commit-it")
commit-it setup-alias

# 3. Install the commit-msg validation hook (optional)
commit-it install-hook

# 4. Create your first commit
commit-it
```

The CLI is also available as `cit` or `commit`:

```bash
cit              # interactive commit
cit --ai         # AI-generated commit message
commit           # interactive commit
commit -t fix -m "resolve bug"  # non-interactive
```

Running `commit-it` with no arguments (or with only flags) defaults to the `commit` command. If the first argument isn't a recognized command, it's also treated as `commit`.

---

## Commands

### `commit` (default)

Create a standardized commit interactively or via flags.

```bash
# Interactive mode - walks through type, scope, message, issues, co-authors
commit-it

# Explicitly run the commit command
commit-it commit
```

**All flags:**

| Flag | Alias | Description |
|------|-------|-------------|
| `--type <type>` | `-t` | Commit type (e.g. `feat`, `fix`). Enables non-interactive mode when combined with `--message` |
| `--message <msg>` | `-m` | Commit message. Enables non-interactive mode when combined with `--type` |
| `--scope <scope>` | `-s` | Commit scope |
| `--body <text>` | | Commit body |
| `--all` | `-a` | Stage all changes before committing (`git add .`) |
| `--amend` | | Amend the last commit (pre-fills fields from previous commit) |
| `--breaking` | `-b` | Mark as a breaking change (adds `!` and `BREAKING CHANGE` footer) |
| `--ai` | | Generate commit message from staged diff using AI |
| `--no-ai` | | Disable AI even if enabled in config |
| `--provider <name>` | | AI provider to use (`claude`, `codex`, `agent`, `custom`) |
| `--multi` | | Split staged changes into multiple logical commits using AI |
| `--verbose` | | Show detailed output of AI commands being run |
| `--yes` | `-y` | Skip all prompts, accept defaults (headless mode for agents) |
| `--co-author <value>` | `-c` | Add co-author by config alias or `"Name <email>"` |
| `--no-github` | | Skip all GitHub API calls |
| `--dry-run` | | Preview the commit message without creating it |
| `--` | | Pass additional flags to `git commit` (e.g. `-- --no-verify --signoff`) |

**Examples:**

```bash
# Simple interactive commit
commit-it

# Stage everything, use AI to generate the message
commit-it -a --ai

# Quick fix with scope
commit-it -t fix -s auth -m "resolve token refresh race condition"

# Feature with body text
commit-it -t feat -m "add CSV export" --body "Supports UTF-8 encoding and custom delimiters"

# Breaking change
commit-it -t feat -m "redesign user API" --breaking

# Amend the last commit interactively
commit-it --amend

# Dry run to see what would be committed
commit-it -t refactor -s cli -m "extract validation logic" --dry-run

# Stage all + co-author by config alias
commit-it -a -t feat -m "add dark mode" -c alice

# Co-author by full name and email
commit-it -t feat -m "add dark mode" -c "Alice Smith <alice@example.com>"

# Skip GitHub for faster local-only commits
commit-it --no-github

# Headless mode for agents (AI generate + auto-accept + commit)
commit-it --ai -y

# Split staged changes into multiple logical commits
commit-it --all --multi

# See exactly what AI commands are being run
commit-it --ai --verbose

# Pass git commit flags after --
commit-it -- --no-verify
commit-it --ai -- --signoff --gpg-sign
commit-it -- --trailer "Reviewed-by: Alice <alice@co.org>"
```

### `branch`

Create a git branch from GitHub issues. Searches issues interactively, lets you select one or more, generates a slugified branch name from issue numbers and titles.

```bash
commit-it branch

# With a postfix
commit-it branch --postfix wip
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--postfix <value>` | `-p` | Append a postfix to the generated branch name |

**Interactive flow:**

1. Search for issues by number or keyword (e.g. `123` or `"login bug"`)
2. Select one or more issues from the results
3. Optionally add a postfix (e.g. `wip`, `quick-fix`)
4. Preview and confirm the branch name

**Example output:**

```
Search for issues: login bug
Select issues: #42 - Fix login redirect, #15 - Session timeout
Add postfix? wip

Branch preview: 15-42-fix-login-redirect-and-session-timeout-wip
Create this branch? Yes
✓ Created new branch: 15-42-fix-login-redirect-and-session-timeout-wip
```

### `validate`

Validate a commit message against your configured rules. Exits with code 1 if validation fails.

```bash
# Validate a message string
commit-it validate --message "feat(cli): add new command"

# Validate from a file (used by git hooks)
commit-it validate --file .git/COMMIT_EDITMSG
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--message <msg>` | `-m` | Commit message string to validate |
| `--file <path>` | `-f` | File containing a commit message |

One of `--message` or `--file` is required.

**Example output (valid):**

```
Validating commit message:

  "feat(cli): add new command"

✓ Commit message is valid
```

**Example output (invalid):**

```
Validating commit message:

  "this is not a conventional commit message that is way too long and exceeds the maximum header length"

✗ Errors:
  • header-max-length (line 1): Header exceeds 72 characters (97)
  • conventional-format: Message does not follow conventional commit format: type(scope): subject
```

### `init`

Generate a configuration file interactively.

```bash
commit-it init
```

**Interactive flow:**

1. Choose config format: TypeScript (recommended), JavaScript, JSON, or YAML
2. Choose default preset: `conventional` or `gitmoji`
3. Optionally set up a shell alias

**Generated TypeScript config:**

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  defaults: {
    scope: '',
    includeBody: true,
  },
  github: {
    enabled: true,
    auto: {
      detectIssues: true,
      suggestReviewers: false,
    },
  },
  validation: {
    enabled: true,
    maxHeaderLength: 72,
    requireScope: false,
  },
})
```

### `install-hook` / `uninstall-hook`

Install or remove a `commit-msg` git hook that validates every commit automatically.

```bash
# Install the hook
commit-it install-hook

# Overwrite an existing hook
commit-it install-hook --force

# Remove the hook
commit-it uninstall-hook
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--force` | `-f` | Overwrite an existing `commit-msg` hook |

The hook script looks for `commit-it` on `PATH` first, then falls back to `npx commit-it`. Once installed, every `git commit` runs validation before the commit is finalized.

If a non-commit-it `commit-msg` hook already exists, you'll be prompted to use `--force` or manually add the validation to your existing hook:

```bash
commit-it validate --file "$1"
```

### `presets`

List available commit format presets.

```bash
commit-it presets
```

**Output:**

```
Available presets:

  conventional: Conventional Commits
  gitmoji: Gitmoji
```

### `config`

Print the fully resolved configuration (merged config file + defaults) as JSON.

```bash
commit-it config
```

Useful for debugging config loading issues or verifying what rules are active.

### `setup`

Run (or re-run) the setup wizard to configure your AI provider, model, commit style, and editor.

```bash
commit-it setup
```

**Interactive flow:**

1. Choose AI provider (Claude Code, Codex, Cursor Agent, or Custom)
2. Choose model (e.g. Haiku 4.5 for fastest, Sonnet 4.6 for balanced, Opus 4.6 for most capable)
3. Choose whether to always use AI (use `--no-ai` to skip per commit)
4. Choose commit style (Conventional Commits or Gitmoji, with example previews)
5. Choose editor for commit editing (VS Code, Cursor, Vim, Neovim, Nano, Emacs, or custom command)

Saves to `~/.commit-it/config.json`. Run `commit-it setup` anytime to reconfigure.

### `setup-alias`

Add a shell alias so you can type `commit` (or any name) instead of `commit-it`.

```bash
commit-it setup-alias
```

Auto-detects your shell from `$SHELL` and supports:

| Shell | Config File | Alias Format |
|-------|-------------|--------------|
| Zsh | `~/.zshrc` | `alias commit='commit-it'` |
| Bash | `~/.bashrc` | `alias commit='commit-it'` |
| Fish | `~/.config/fish/config.fish` | `alias commit 'commit-it'` |

After setup, activate with `source ~/.zshrc` (or your shell's config file). This is also offered during `commit-it init`.

---

## Interactive Commit Flow

Running `commit-it` (or `cit`) walks through these steps:

```
1. Select commit type    ─── feat, fix, docs, refactor, etc. (from preset)
2. Select scope          ─── Suggested from changed files, scopeMap, PR labels
3. Breaking change       ─── If --breaking, describe what breaks
4. Reference issues      ─── Search GitHub issues, pick action (Closes/Fixes/Resolves/Ref)
5. Commit message        ─── Short description (pre-filled from AI or previous commit)
6. Body                  ─── Optional detailed description
7. Co-authors            ─── Select from config/GitHub or enter manually
8. Preview & validate    ─── See full message, check rules, confirm
```

**Smart defaults at each step:**

- **Type** is pre-selected from: AI suggestion > previous commit (when amending) > PR label (`bug` -> `fix`, `feature` -> `feat`)
- **Scope** is suggested from: AI suggestion > previous commit > config `scopeMap` matched against changed files > PR labels matching `scopeLabelPatterns`
- **Message** is pre-filled from: AI suggestion > previous commit message
- **Body** is pre-filled from: AI suggestion > previous commit body
- **Issue prompt** defaults to "yes" if `github.auto.detectIssues` is enabled (default)

When **amending** (`--amend`), all fields are pre-filled from the previous commit's parsed components (type, scope, message, body, breaking change).

When using **AI** (`--ai`), the staged diff is analyzed and a full suggestion (type, scope, message, body) is generated. You can accept, edit in `$EDITOR`, or decline. If accepted, the commit skips all manual prompts and goes straight to preview/confirm (with an option to edit again). If declined, you proceed through the manual flow. In headless mode (`--ai -y`), the suggestion is auto-accepted and committed immediately.

**Validation at preview:** If validation fails, you see the errors and can choose to continue anyway or cancel.

---

## Non-Interactive Mode

When both `--type` and `--message` are provided, commit-it skips all prompts and creates the commit directly. The message is still validated against your configured rules.

```bash
# Minimal
commit-it -t feat -m "add user authentication"

# With scope and body
commit-it -t fix -s auth -m "resolve token refresh" --body "Tokens now refresh 5 min before expiry"

# Breaking change
commit-it -t feat -m "redesign API" -b

# Stage all changes and commit with co-author
commit-it -a -t feat -m "add dark mode" -c alice

# Preview without committing
commit-it -t refactor -s cli -m "extract validation" --dry-run
```

Invalid types or scopes cause an error listing valid options:

```
✗ Error creating commit: Invalid commit type "yolo". Valid types: feat, fix, docs, style, refactor, perf, test, chore
```

This mode is ideal for CI/CD pipelines, scripts, git hooks, and any automation that needs structured commits.

---

## Configuration

### Config File Locations

commit-it uses [c12](https://github.com/unjs/c12) for configuration loading. Files are checked in this order:

| File | Format |
|------|--------|
| `commit.config.ts` | TypeScript (recommended) |
| `commit.config.js` | JavaScript ESM |
| `commit.config.mjs` | JavaScript ESM |
| `commit.config.cjs` | JavaScript CJS |
| `.commitrc` | JSON or YAML |
| `.commitrc.json` | JSON |
| `.commitrc.yaml` / `.commitrc.yml` | YAML |
| `.commit.json` | JSON |
| `.commit.yaml` / `.commit.yml` | YAML |
| `"commit"` key in `package.json` | JSON |

If no config file is found, commit-it uses sensible defaults (conventional preset, validation enabled, GitHub enabled).

### Full Config Reference

```typescript
// commit.config.ts
import { defineConfig } from 'commit-it'

export default defineConfig({
  // ─── Preset ───────────────────────────────────────────────
  // Commit format preset: 'conventional' | 'gitmoji'
  // Default: 'conventional'
  preset: 'conventional',

  // Custom commit message template (overrides preset template)
  // Uses {type}, {scope}, {message} placeholders
  template: undefined,

  // ─── Scope Mode ───────────────────────────────────────────
  // How multiple scopes are handled in the interactive flow
  // 'single'       — pick one scope (default)
  // 'multi-inline' — comma-separated in header: feat(cli,config): ...
  // 'multi-body'   — first scope in header, rest noted in body
  scopeMode: 'single',

  // ─── Defaults ─────────────────────────────────────────────
  defaults: {
    scope: '',           // Pre-selected scope value
    includeBody: true,   // Default answer for "Add detailed body?" prompt
  },

  // ─── Scope Map ────────────────────────────────────────────
  // Map glob patterns to scope names. When changed files match
  // a pattern, the scope is suggested in the interactive flow.
  scopeMap: {
    'src/cli/**': 'cli',
    'src/commands/**': 'cli',
    'src/services/**': 'core',
    'src/config/**': 'config',
    'src/utils/**': 'utils',
    'tests/**': 'test',
    'docs/**': 'docs',
    '*.md': 'docs',
  },

  // ─── Co-authors ───────────────────────────────────────────
  // Aliases for --co-author flag and interactive selection
  coauthors: {
    alice: 'Alice Smith <alice@example.com>',
    bob: 'Bob Jones <bob@example.com>',
  },

  // ─── GitHub ───────────────────────────────────────────────
  github: {
    enabled: true,
    // Label prefixes used to extract scopes from PR/issue labels
    // e.g. label "scope:api" with pattern "scope:" -> scope "api"
    scopeLabelPatterns: [
      'scope:', 'scope/',
      'area:', 'area/',
      'component:', 'component/',
    ],
    auto: {
      detectIssues: true,    // Default to "yes" for issue reference prompt
      suggestReviewers: false,
    },
  },

  // ─── Validation ───────────────────────────────────────────
  validation: {
    enabled: true,
    maxHeaderLength: 72,       // Max first-line length
    maxBodyLineLength: 100,    // Max body line length (warning level)
    requireScope: false,       // Scope is mandatory
    requireBody: false,        // Body is mandatory
    requireIssue: false,       // At least one issue reference required
    allowedTypes: undefined,   // Restrict to these types (undefined = preset types)
    allowedScopes: undefined,  // Restrict to these scopes (undefined = any)
    noTrailingPeriod: true,    // Subject must not end with "."
    noLeadingCapital: false,   // Subject must start with lowercase
    customRules: [],           // Array of custom regex rules
  },

  // ─── Plugins ──────────────────────────────────────────────
  plugins: [],  // Reserved for future use
})
```

### Scope Modes

The `scopeMode` setting controls how multiple scopes appear in the commit:

**`single`** (default) -- pick one scope:

```
feat(cli): add new command
```

**`multi-inline`** -- all scopes comma-separated in the header:

```
feat(cli,config): add new command with config support
```

**`multi-body`** -- first scope in header, rest noted in body:

```
feat(cli): add new command

Also affects: config, utils
```

### Custom Validation Rules

Each rule is a regex test against the full commit message:

```typescript
validation: {
  customRules: [
    // Block pattern: fails when the regex MATCHES (invert: true)
    {
      name: 'no-wip',
      pattern: '\\bWIP\\b',
      message: 'WIP commits are not allowed on this branch',
      level: 'error',
      invert: true,
    },

    // Require pattern: fails when the regex DOES NOT match (invert: false)
    {
      name: 'require-ticket',
      pattern: 'PROJ-\\d+',
      message: 'Must include a JIRA ticket (e.g., PROJ-123)',
      level: 'error',
      invert: false,
    },

    // Warning-level rule (doesn't block the commit)
    {
      name: 'suggest-issue',
      pattern: '#\\d+',
      message: 'Consider referencing a GitHub issue',
      level: 'warning',
      invert: false,
    },
  ],
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Rule identifier (shown in validation output) |
| `pattern` | `string` | Regex pattern (double-escape backslashes in JSON/TS) |
| `message` | `string` | Error/warning message when rule fails |
| `level` | `'error' \| 'warning'` | `error` blocks commit, `warning` is advisory |
| `invert` | `boolean` | `true`: fail when pattern matches. `false`: fail when pattern doesn't match |

### Config in package.json

```json
{
  "name": "my-app",
  "commit": {
    "preset": "conventional",
    "scopeMap": {
      "src/**": "core",
      "tests/**": "test"
    },
    "validation": {
      "enabled": true,
      "maxHeaderLength": 72,
      "requireScope": true
    }
  }
}
```

### Config in YAML

```yaml
# .commitrc.yaml
preset: conventional

scopeMap:
  "src/**": core
  "tests/**": test

validation:
  enabled: true
  maxHeaderLength: 72
  requireScope: true
  customRules:
    - name: no-wip
      pattern: "\\bWIP\\b"
      message: WIP commits not allowed
      level: error
      invert: true
```

---

## Presets

Two built-in presets define the commit format, available types, and validation regex:

### Conventional Commits (default)

```
type(scope): message
```

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that do not affect the meaning of code |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Code change that improves performance |
| `test` | Adding missing tests |
| `chore` | Changes to build process or dependencies |

### Gitmoji

```
emoji message
```

| Emoji | Description |
|-------|-------------|
| ✨ | New feature |
| 🐛 | Bug fix |
| 📚 | Documentation |
| 💅 | Style |
| ♻️ | Refactor |
| ⚡ | Performance |
| ✅ | Test |
| 🔧 | Chore |
| 🚀 | Deploy |

List presets from the CLI:

```bash
commit-it presets
```

---

## AI Commit Messages

Generate a commit message from your staged diff using a local AI CLI tool. No API keys needed -- commit-it shells out to whichever AI CLI you have installed.

### Supported Providers

| Provider | CLI | Install |
|----------|-----|---------|
| Claude Code | `claude` | [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) |
| OpenAI Codex | `codex` | [github.com/openai/codex](https://github.com/openai/codex) |
| Cursor Agent | `agent` | [cursor.com](https://www.cursor.com/) |
| Custom | any CLI | Configure a command template (see below) |

### Setup

No setup required if you have one of the supported CLIs installed. commit-it auto-detects them from your `$PATH` in the order: `claude` → `codex` → `agent`.

To configure a preferred provider or custom CLI, create `~/.commit-it/config.json`:

```json
{
  "ai": {
    "auto": true,
    "provider": "claude",
    "providers": [
      { "name": "claude", "model": "claude-haiku-4-5-20251001" },
      { "name": "custom", "command": "my-tool --prompt {{prompt}}" }
    ]
  },
  "preset": "conventional",
  "editor": "code --wait"
}
```

| Field | Description |
|-------|-------------|
| `ai.auto` | When `true`, always generate AI suggestions without needing `--ai` flag |
| `ai.provider` | Preferred provider name (`claude`, `codex`, `agent`, `custom`) |
| `ai.providers` | Ordered list of providers to try. Each can specify `model` or `command` |
| `preset` | Default commit style (`conventional` or `gitmoji`). Overridden by project config |
| `editor` | Editor command for commit editing. Falls back to `$VISUAL` > `$EDITOR` > `vi` |

### Usage

```bash
# Stage changes, then generate
git add .
commit-it --ai

# Use a specific provider
commit-it --ai --provider codex

# Disable AI even if auto is enabled in config
commit-it --no-ai
```

**What happens:**

1. The staged diff (up to 8000 chars) is sent to the AI CLI with your preset's types, template, and descriptions
2. The AI returns a JSON suggestion with `type`, `scope`, `message`, `body`, and optional `breaking`
3. You choose: **Accept**, **Edit in $EDITOR**, or **Decline**
4. If accepted, the commit goes straight to preview/confirm (no manual type/scope/message prompts)
5. At the preview, you can **Confirm**, **Edit in $EDITOR**, or **Cancel**
6. If declined at step 3, you proceed through the manual flow

The AI respects your chosen preset, so gitmoji users get emoji types and conventional users get `feat`/`fix`/etc.

### First-Run Setup

On your first run, commit-it walks you through a setup wizard:

1. Choose your preferred AI provider (auto-detects installed CLIs)
2. Choose a model (defaults to fastest: Haiku 4.5 for Claude, o4-mini for Codex)
3. Choose whether to always use AI (use `--no-ai` to skip per commit)
4. Choose commit style (Conventional Commits or Gitmoji)
5. Choose your editor for commit editing

The wizard writes `~/.commit-it/config.json` and is skipped in headless mode (`-y`). Run `commit-it setup` anytime to reconfigure.

### Headless Mode (for agents)

Use `--ai -y` for fully non-interactive, agent-friendly commits:

```bash
# Generate AI message, auto-accept, commit -- no prompts
commit-it --ai -y

# Stage all + headless
commit-it --ai -y -a

# Headless with specific provider
commit-it --ai -y --provider claude

# Headless dry run
commit-it --ai -y --dry-run
```

Exits non-zero if AI is unavailable, no staged changes exist, or generation fails.

### Provider Resolution Order

1. `--provider` flag (e.g. `--provider codex`)
2. `provider` field in `~/.commit-it/config.json`
3. First available entry in `providers` array
4. Auto-detect from `$PATH` (`claude` → `codex` → `agent`)

### Git Passthrough Flags

Any flags after `--` are forwarded directly to `git commit`:

```bash
commit-it --ai -- --no-verify
commit-it -- --signoff --gpg-sign
commit-it -- --trailer "Acked-by: Bob"
```

### Multi-Commit Mode

Use `--multi` to let AI analyze your staged changes and split them into multiple logical commits:

```bash
# Stage everything and split into multiple commits
commit-it --all --multi

# Dry run to preview the plan
commit-it --all --multi --dry-run
```

The AI groups related changes together (e.g. a feature and its tests in one commit, config changes in another). You can review the plan, edit it in `$EDITOR`, or cancel.

```
◇ Analyzing changes for multi-commit split...

╭─────────────────────────────────────────╮
│ 3 commits                               │
│                                         │
│ 1. feat(cli): add setup wizard          │
│    Files: src/commands/setup.ts, ...    │
│                                         │
│ 2. feat(ai): add model selection        │
│    Files: src/services/ai/index.ts, ... │
│                                         │
│ 3. docs: update README                  │
│    Files: README.md                     │
╰─────────────────────────────────────────╯

◆ Create these commits?
  ● Confirm
  ○ Edit in $EDITOR
  ○ Cancel
```

### Verbose Mode

Use `--verbose` to see exactly what commands are being run under the hood:

```bash
commit-it --ai --verbose
```

Shows provider resolution, CLI commands, prompt sizes, raw AI responses, and exit codes. Useful for debugging AI generation issues.

---

## GitHub Integration

commit-it uses the [GitHub CLI](https://cli.github.com/) (`gh`) for all GitHub features. Every GitHub feature degrades gracefully -- if `gh` is not installed or not authenticated, commit-it continues without GitHub context.

### Setup

```bash
# Install
brew install gh          # macOS
winget install GitHub.cli  # Windows
sudo apt install gh        # Debian/Ubuntu

# Authenticate
gh auth login
```

### Features

**PR context detection** -- Detects the current PR for your branch and reads its labels:

```
# If your branch has a PR with label "bug":
Select commit type: fix (pre-selected from PR label)
```

**Type suggestion from labels:**

| PR Label | Suggested Type |
|----------|---------------|
| `bug` | `fix` |
| `feature` | `feat` |
| `docs` | `docs` |

**Scope extraction from labels** -- Labels matching your `scopeLabelPatterns` become scope suggestions:

```
# PR has label "scope:auth" and config has pattern "scope:"
Select scope: auth (from PR label)
```

**Issue search and linking** -- Search issues during commit, attach closing references:

```
Reference a GitHub issue? Yes
Search issues: login
  #42 - Fix login redirect          bug, auth
  #38 - Login page slow             perf
  Skip
> #42 - Fix login redirect

How should this issue be referenced?
  Closes    (auto-close when merged)
  Fixes     (auto-close when merged)
  Resolves  (auto-close when merged)
  Ref       (just mention, no auto-close)
```

Multiple issues can be linked to a single commit. Each gets its own footer line:

```
Closes #42
Fixes #38
```

**Branch creation from issues:**

```bash
commit-it branch
# Search: oauth
# Select: #42 - Add OAuth support, #15 - Fix redirect
# Branch: 15-42-add-oauth-support-and-fix-redirect
```

**Co-author discovery** -- Fetches repo collaborators (up to 10) as co-author candidates.

**Disable GitHub:**

```bash
# Per-command
commit-it --no-github

# In config
github: {
  enabled: false,
}
```

---

## Git Hook

Install a `commit-msg` hook that validates every `git commit` automatically:

```bash
commit-it install-hook
```

This creates `.git/hooks/commit-msg` with a script that runs `commit-it validate --file "$1"`. The script:

1. Checks for `commit-it` on `PATH`
2. Falls back to `npx commit-it`
3. Skips validation with a warning if neither is found

```bash
# Remove the hook
commit-it uninstall-hook

# Force-overwrite a non-commit-it hook
commit-it install-hook --force
```

If a `commit-msg` hook already exists and wasn't installed by commit-it, you'll see:

```
✗ A commit-msg hook already exists
  Use --force to overwrite, or manually add commit-it to your hook

  Add this to your existing hook:
    commit-it validate --file "$1"
```

---

## Shell Alias

```bash
commit-it setup-alias
```

Walks you through adding a shell alias so you can type `commit` (or any name) instead of `commit-it`:

1. Detects your shell from `$SHELL`
2. Asks for an alias name (default: `commit`)
3. Previews the line to append
4. Writes to your shell config

| Shell | Config File | Format |
|-------|-------------|--------|
| Zsh | `~/.zshrc` | `alias commit='commit-it'` |
| Bash | `~/.bashrc` | `alias commit='commit-it'` |
| Fish | `~/.config/fish/config.fish` | `alias commit 'commit-it'` |

After setup:

```bash
source ~/.zshrc   # activate immediately

commit            # interactive commit
commit --ai       # AI-generated commit
commit branch     # create branch from issues
```

This is also offered during `commit-it init`.

---

## Validation Rules

The validator checks these rules (all configurable):

| Rule | Default | Level | Description |
|------|---------|-------|-------------|
| `header-max-length` | 72 chars | error | First line must not exceed max length |
| `body-max-line-length` | 100 chars | warning | Body lines should not exceed max length |
| `conventional-format` | on | error | Must follow `type(scope): subject` format |
| `blank-line-after-header` | on | error | Second line must be blank |
| `scope-required` | off | error | Scope is mandatory |
| `body-required` | off | error | Body is mandatory |
| `issue-required` | off | error | At least one issue reference required |
| `type-enum` | unrestricted | error | Type must be in allowed list |
| `scope-enum` | unrestricted | error | Scope must be in allowed list |
| `subject-no-trailing-period` | on | warning | Subject should not end with `.` |
| `subject-no-leading-capital` | off | warning | Subject should not start with uppercase |
| Custom rules | none | configurable | Your own regex-based rules |

**Recognized footer tokens** (parsed correctly and not treated as body text):

`BREAKING CHANGE`, `Co-authored-by`, `Closes`, `Fixes`, `Resolves`, `Ref`, `Signed-off-by`, `Acked-by`, `Reviewed-by`, `Tested-by`, `Cc`

---

## Scope Suggestions

Scopes are suggested from two sources during the interactive flow, in priority order:

### 1. Config `scopeMap` (highest priority)

Glob patterns matched against changed files using [micromatch](https://github.com/micromatch/micromatch):

```typescript
scopeMap: {
  'src/cli/**': 'cli',            // Matches src/cli/index.ts, src/cli/foo/bar.ts
  'src/services/**': 'core',      // Matches src/services/git.ts
  'src/config/**': 'config',
  'packages/web/src/**': 'web',   // Monorepo package
  '*.md': 'docs',                 // Root markdown files
}
```

When you edit `src/cli/commands.ts`, the scope `cli` is suggested.

### 2. GitHub PR labels

Labels on the current PR matching your `scopeLabelPatterns` prefixes:

```typescript
github: {
  scopeLabelPatterns: ['scope:', 'area:', 'component:'],
}
```

A PR with label `scope:auth` suggests scope `auth`. Labels are shown with their GitHub color in the terminal.

Both sources are deduplicated by value. Config scopes take priority over label scopes.

---

## Co-authors

Co-authors are added as `Co-authored-by:` trailer lines in the commit message footer, which GitHub recognizes for contribution attribution.

### From config aliases

```typescript
// commit.config.ts
coauthors: {
  alice: 'Alice Smith <alice@example.com>',
  bob: 'Bob Jones <bob@example.com>',
  'frontend-team': 'Frontend Team <frontend@company.com>',
}
```

```bash
# Use alias from CLI
commit-it -c alice

# Or full format
commit-it -c "Alice Smith <alice@example.com>"
```

### From GitHub collaborators

During the interactive flow, "Add co-authors?" fetches up to 10 collaborators from the repo via the GitHub API and presents them for multi-select.

### Manual entry

You can also type a co-author in `Name <email>` format when prompted.

### Result in commit

```
feat(auth): add OAuth support

Implements Google and GitHub OAuth providers.

Closes #42

Co-authored-by: Alice Smith <alice@example.com>
Co-authored-by: Bob Jones <bob@example.com>
```

---

## Commit Message Templates

commit-it includes a template engine with Mustache-like syntax for formatting commit headers:

**Placeholders:** `{{type}}`, `{{scope}}`, `{{message}}`, `{{body}}`, `{{breaking}}`, `{{issues}}`, `{{coauthors}}`

**Conditional sections:** `{{#field}}content{{/field}}` -- only rendered if `field` has a value.

Default templates per preset:

| Preset | Template |
|--------|----------|
| `conventional` | `{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}` |
| `gitmoji` | `{{type}} {{#scope}}({{scope}}) {{/scope}}{{message}}` |

Override with the `template` config option:

```typescript
export default defineConfig({
  template: '{{type}}[{{scope}}]: {{message}}',  // Custom bracket style
})
```

---

## Programmatic API

Every feature is importable for use in scripts, CI pipelines, custom tools, or your own CLIs. Install as a dependency:

```bash
npm install commit-it
```

### Direct Commit

Create commits non-interactively. Validates against your config before committing.

```typescript
import { directCommit } from 'commit-it'

// Minimal commit
const result = await directCommit({
  type: 'feat',
  message: 'add user authentication',
  dryRun: true,
})
console.log(result.hash)    // "dry-run"
console.log(result.message) // "feat: add user authentication"

// Full-featured commit
const result2 = await directCommit({
  type: 'feat',
  message: 'redesign user API',
  scope: 'api',
  body: 'Complete rewrite of REST endpoints for v2',
  breaking: true,
  breakingDescription: 'All endpoints now require Bearer token auth',
  issueRefs: [
    { action: 'Closes', number: 42 },
    { action: 'Ref', number: 10 },
  ],
  coAuthor: 'alice',   // config alias
  stageAll: true,
  amend: false,
  dryRun: false,
})
// result2.message:
//   feat(api)!: redesign user API
//
//   Complete rewrite of REST endpoints for v2
//
//   BREAKING CHANGE: All endpoints now require Bearer token auth
//
//   Closes #42
//   Ref #10
//
//   Co-authored-by: Alice Smith <alice@example.com>

// Breaking change with default description
const result3 = await directCommit({
  type: 'feat',
  message: 'change config format',
  breaking: true,
  dryRun: true,
})
// result3.message includes "BREAKING CHANGE: breaking change"
```

### Interactive Commit

Launch the full interactive flow programmatically:

```typescript
import { interactiveCommit } from 'commit-it'

const result = await interactiveCommit({
  preset: 'conventional',  // override config preset
  skipGithub: false,
  dryRun: false,
  stageAll: true,
  amend: false,
  breaking: false,
  useAI: true,
  provider: 'claude',       // AI provider override
  coAuthor: 'bob',
  headless: false,          // true for non-interactive (agent) mode
  extraArgs: ['--signoff'], // forwarded to git commit
})

console.log(result.hash)    // commit SHA
console.log(result.message) // full formatted message
```

### Validate Commit Messages

```typescript
import {
  validateCommitMessage,
  formatValidationResult,
  getDefaultValidationConfig,
} from 'commit-it'

// Validate with custom rules
const result = validateCommitMessage('feat(cli): add new command', {
  maxHeaderLength: 72,
  requireScope: true,
  allowedTypes: ['feat', 'fix', 'docs'],
  allowedScopes: ['cli', 'api', 'core'],
  noTrailingPeriod: true,
  customRules: [
    {
      name: 'no-wip',
      pattern: '\\bWIP\\b',
      message: 'WIP not allowed',
      level: 'error',
      invert: true,
    },
  ],
})

console.log(result.valid)    // true
console.log(result.errors)   // []
console.log(result.warnings) // []

// Invalid message
const bad = validateCommitMessage(
  'This is way too long and does not follow conventional format at all and keeps going forever',
  { maxHeaderLength: 72 },
)
console.log(bad.valid)   // false
console.log(bad.errors)  // [{ rule: 'header-max-length', message: '...', level: 'error', line: 1 }]

// Format for display
console.log(formatValidationResult(bad))
// ✗ Errors:
//   • header-max-length (line 1): Header exceeds 72 characters (90)

// Get the default validation config
const defaults = getDefaultValidationConfig()
// { enabled: true, maxHeaderLength: 72, maxBodyLineLength: 100, ... }
```

### Parse Commit Messages

Extract type, scope, subject, body, footer, breaking status, and issue references from any commit message:

```typescript
import { parseCommitMessage } from 'commit-it'

// Simple message
const simple = parseCommitMessage('feat(cli): add command')
// {
//   header: 'feat(cli): add command',
//   type: 'feat',
//   scope: 'cli',
//   subject: 'add command',
//   body: undefined,
//   footer: undefined,
//   isBreaking: false,
//   issues: [],
// }

// Full message with body, breaking change, and issues
const full = parseCommitMessage(
  'feat(api)!: redesign endpoints\n\nComplete rewrite for v2\n\nBREAKING CHANGE: Auth required\n\nCloses #42\nFixes #99'
)
// {
//   header: 'feat(api)!: redesign endpoints',
//   type: 'feat',
//   scope: 'api',
//   subject: 'redesign endpoints',
//   body: 'Complete rewrite for v2',
//   footer: 'BREAKING CHANGE: Auth required\nCloses #42\nFixes #99',
//   isBreaking: true,
//   issues: [42, 99],
// }

// Non-conventional message (still parsed)
const plain = parseCommitMessage('just a plain message')
// { type: '', scope: undefined, subject: 'just a plain message', ... }
```

### Format Validation

Validate against a specific preset's format:

```typescript
import { FormatValidator, getPreset } from 'commit-it'

const preset = getPreset('conventional')
const validator = new FormatValidator(preset)

// Validate full message format
validator.validateMessage('feat(cli): add command')
// { valid: true }

validator.validateMessage('not a conventional commit')
// { valid: false, error: 'Message does not match Conventional Commits format' }

// Validate individual fields
validator.validateType('feat')     // true
validator.validateType('yolo')     // false
validator.validateScope('cli')     // true (no scope restrictions in conventional)

// List available options
validator.getAvailableTypes()
// [
//   { value: 'feat', desc: '✨ A new feature' },
//   { value: 'fix', desc: '🐛 A bug fix' },
//   { value: 'docs', desc: '📚 Documentation only changes' },
//   ...
// ]

validator.getAvailableScopes()     // [] (conventional has no scope restrictions)

// Format a commit message from components
validator.formatMessage({
  type: 'feat',
  scope: 'api',
  message: 'add endpoint',
  body: 'Implements GET /users',
  footer: 'Closes #42',
})
// "feat(api): add endpoint\n\nImplements GET /users\n\nCloses #42"
```

### Git Operations

Full git operations via the `GitService` wrapper around [simple-git](https://github.com/steveukx/git-js):

```typescript
import { GitService, createCommit } from 'commit-it'

const git = new GitService()                // uses process.cwd()
const git2 = new GitService('/path/to/repo') // or specify a directory

// Branch info
await git.getBranchName()
// "feature/new-api"

// File status
await git.getStatus()
// { staged: ['src/index.ts'], unstaged: ['README.md'] }

await git.getChangedFiles()
// ['src/index.ts', 'README.md', 'package.json']

// Staged diff (for AI generation)
await git.getStagedDiff()
// "diff --git a/src/index.ts b/src/index.ts\n..."

// Stage all files
await git.stageAll()

// Last commit info (parsed into components)
const last = await git.getLastCommit()
// {
//   type: 'feat', scope: 'cli', message: 'add command',
//   body: undefined, breaking: undefined, isBreaking: false,
//   hash: 'abc1234', fullMessage: 'feat(cli): add command'
// }

// Branch operations
await git.branchExists('feature-x')      // true/false
await git.createOrSwitchBranch('new-branch')
// { created: true } or { created: false } if already exists

// Create a formatted commit
const result = await git.createCommit({
  type: 'fix',
  scope: 'auth',
  message: 'resolve token refresh',
  body: 'Tokens now refresh 5 minutes before expiry',
  breaking: undefined,                    // or 'description of breaking change'
  issueRefs: [
    { action: 'Fixes', number: 99 },
    { action: 'Ref', number: 50 },
  ],
  coauthors: [
    'Co-authored-by: Alice <alice@example.com>',
  ],
  dryRun: false,
  stage: false,                           // true to run git add . first
  amend: false,                           // true to amend last commit
})
// result.hash = "abc1234..."
// result.message = "fix(auth): resolve token refresh\n\n..."

// Convenience function (creates a GitService internally)
const result2 = await createCommit({
  type: 'docs',
  message: 'update README',
})
```

### GitHub Operations

Interact with GitHub via the `gh` CLI:

```typescript
import { GitHubService } from 'commit-it'

const github = new GitHubService()          // enabled by default
const github2 = new GitHubService(false)    // disabled (all methods return empty)

// Search issues
const issues = await github.searchIssues('login bug')
// [
//   { number: 42, title: 'Fix login redirect', labels: [...], state: 'open' },
//   { number: 38, title: 'Login page slow', labels: [...], state: 'open' },
// ]

// Get a specific issue
const issue = await github.getIssue(42)
// { number: 42, title: 'Fix login redirect', labels: [...], state: 'open' }

// Current PR for this branch
const pr = await github.getCurrentPR()
// { number: 10, title: 'Add OAuth', labels: [...], state: 'open' }

// Get a specific PR
const pr2 = await github.getPR(10)

// List repo labels
const labels = await github.getLabels()
// ['bug', 'feature', 'scope:auth', 'scope:api', ...]

// List collaborators
const collabs = await github.getCollaborators()
// ['alice', 'bob', 'charlie']

// Detect full context for the current branch
const context = await github.detectContext()
// {
//   currentPR: { number: 10, ... },
//   relatedIssues: [],
//   suggestedType: 'fix',       // from PR labels
//   prLabels: [{ name: 'bug', color: 'ff0000' }],
// }

// Create branch name from issues
const branch = await github.createBranchName([42, 15])
// "15-42-fix-login-redirect-and-session-timeout"

const branch2 = await github.createBranchName([42], 'wip')
// "42-fix-login-redirect-wip"

// Slugify utility
github.slugify('Fix Login Redirect!')
// "fix-login-redirect"
```

### Scope Suggestions (API)

Get scope suggestions from file paths and labels programmatically:

```typescript
import {
  getScopesFromConfig,
  getScopesFromLabels,
  getAllScopeSuggestions,
} from 'commit-it'

// From file paths + config scopeMap
const configScopes = getScopesFromConfig(
  ['src/cli/index.ts', 'src/api/users.ts', 'src/cli/commands.ts'],
  {
    'src/cli/**': 'cli',
    'src/api/**': 'api',
    'src/services/**': 'core',
  },
)
// [
//   { value: 'cli', source: 'config' },
//   { value: 'api', source: 'config' },
// ]
// Note: 'cli' is deduplicated even though two files matched

// From GitHub PR labels
const labelScopes = getScopesFromLabels(
  [
    { name: 'scope:auth', color: 'ff0000' },
    { name: 'area:api', color: '00ff00' },
    { name: 'bug', color: '0000ff' },         // doesn't match any pattern
  ],
  ['scope:', 'area:'],
)
// [
//   { value: 'auth', source: 'label', label: 'scope:auth', color: 'ff0000' },
//   { value: 'api', source: 'label', label: 'area:api', color: '00ff00' },
// ]

// All sources combined and deduplicated (config wins over labels)
const all = getAllScopeSuggestions(
  ['src/api/users.ts'],
  { 'src/api/**': 'api' },
  [{ name: 'scope:api', color: '00ff00' }, { name: 'scope:auth', color: 'ff0000' }],
  ['scope:'],
)
// [
//   { value: 'api', source: 'config' },       // config wins over label
//   { value: 'auth', source: 'label', ... },   // only from labels
// ]
```

### Co-author Utilities

Parse, format, and collect co-authors from multiple sources:

```typescript
import {
  parseCoAuthor,
  formatCoAuthor,
  formatCoAuthors,
  getCoAuthorsFromConfig,
  getAllCoAuthors,
} from 'commit-it'

// Parse a "Name <email>" string
parseCoAuthor('Alice Smith <alice@example.com>')
// { name: 'Alice Smith', email: 'alice@example.com', source: 'manual' }

parseCoAuthor('invalid string')
// null

// Format for commit footer
formatCoAuthor({ name: 'Alice', email: 'alice@example.com', source: 'manual' })
// "Co-authored-by: Alice <alice@example.com>"

// Format multiple
formatCoAuthors([
  { name: 'Alice', email: 'alice@example.com', source: 'manual' },
  { name: 'Bob', email: 'bob@example.com', source: 'manual' },
])
// "Co-authored-by: Alice <alice@example.com>\nCo-authored-by: Bob <bob@example.com>"

// From config aliases
const fromConfig = getCoAuthorsFromConfig({
  alice: 'Alice Smith <alice@example.com>',
  bob: 'Bob Jones <bob@example.com>',
})
// [
//   { name: 'Alice Smith', email: 'alice@example.com', alias: 'alice', source: 'config' },
//   { name: 'Bob Jones', email: 'bob@example.com', alias: 'bob', source: 'config' },
// ]

// All sources (config + GitHub collaborators, deduplicated by email)
const all = await getAllCoAuthors(
  { alice: 'Alice Smith <alice@example.com>' },  // config aliases
  true,  // include GitHub collaborators
)
// Config co-authors first, then GitHub collaborators (deduped)
```

### Template Engine

Render commit message templates with variable substitution and conditional sections:

```typescript
import { renderTemplate, buildFullMessage, DEFAULT_TEMPLATES } from 'commit-it'

// Simple placeholder substitution
renderTemplate('{{type}}: {{message}}', {
  type: 'feat',
  message: 'add feature',
})
// "feat: add feature"

// Conditional sections: {{#field}}...{{/field}} only renders if field has a value
renderTemplate('{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}', {
  type: 'feat',
  scope: 'cli',
  message: 'add command',
})
// "feat(cli): add command"

renderTemplate('{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}', {
  type: 'docs',
  message: 'update README',
})
// "docs: update README"   (scope section omitted)

// Breaking change indicator
renderTemplate('{{type}}{{#breaking}}!{{/breaking}}: {{message}}', {
  type: 'feat',
  message: 'change API',
  breaking: 'removes old endpoints',
})
// "feat!: change API"

// Build full message with header + body + footer
buildFullMessage({
  type: 'feat',
  scope: 'api',
  message: 'add user endpoint',
  body: 'Implements GET /users/:id with pagination support',
  breaking: 'Changes response format from array to object',
  issues: 'Closes #42\nRef #10',
  coauthors: 'Co-authored-by: Alice <alice@example.com>',
})
// feat(api)!: add user endpoint
//
// Implements GET /users/:id with pagination support
//
// BREAKING CHANGE: Changes response format from array to object
//
// Closes #42
// Ref #10
//
// Co-authored-by: Alice <alice@example.com>

// Minimal message
buildFullMessage({ type: 'fix', message: 'resolve bug' })
// "fix: resolve bug"

// Use a custom template
buildFullMessage(
  { type: 'feat', scope: 'ui', message: 'add button' },
  '{{type}}[{{scope}}] {{message}}',
)
// "feat[ui] add button"

// Access default templates
DEFAULT_TEMPLATES.conventional
// "{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}"

DEFAULT_TEMPLATES.gitmoji
// "{{type}} {{#scope}}({{scope}}) {{/scope}}{{message}}"
```

### AI Generation

Generate commit messages from diffs programmatically:

```typescript
import { generateCommitMessage, isAIAvailable } from 'commit-it'

// Check if any AI CLI is available (claude, codex, agent, or custom)
if (await isAIAvailable()) {
  const diff = await git.getStagedDiff()

  const suggestion = await generateCommitMessage(diff, {
    branchName: 'feature/new-api',
    existingTypes: ['feat', 'fix', 'docs', 'refactor'],
  })

  if (suggestion) {
    console.log(suggestion.type)     // "feat"
    console.log(suggestion.scope)    // "api"
    console.log(suggestion.message)  // "add user endpoint"
    console.log(suggestion.body)     // "Implements GET /users/:id..."
    console.log(suggestion.breaking) // undefined
  }
}

// Use a specific provider
const suggestion = await generateCommitMessage(diff, {}, 'codex')
```

Returns `null` if no AI CLI is available, the CLI call fails, or the response can't be parsed.

### Config Utilities

```typescript
import { defineConfig, loadConfig, getDefaultConfig } from 'commit-it'

// Type-safe config helper for commit.config.ts files
const config = defineConfig({
  preset: 'conventional',
  scopeMap: { 'src/**': 'core' },
})

// Load resolved config (file + defaults merged)
const resolved = await loadConfig()

// Get default config (no file needed)
const defaults = getDefaultConfig()
// {
//   preset: 'conventional',
//   scopeMode: 'single',
//   defaults: { scope: '', includeBody: true },
//   plugins: [],
//   validation: { enabled: true, maxHeaderLength: 72, ... },
//   github: { enabled: true, scopeLabelPatterns: [...], ... },
// }
```

### Preset Utilities

```typescript
import { getPreset, listPresets, presets } from 'commit-it'

// List all preset names
listPresets()
// ['conventional', 'gitmoji']

// Get a preset by name
const preset = getPreset('conventional')
preset.name       // "Conventional Commits"
preset.template   // "{type}({scope}): {message}"
preset.types      // [{ value: 'feat', desc: '✨ A new feature' }, ...]
preset.scopes     // []
preset.validator   // (msg: string) => boolean

// Throws on unknown preset
getPreset('unknown')
// Error: Unknown preset: unknown

// Access presets directly
presets.conventional.types[0]  // { value: 'feat', desc: '✨ A new feature' }
presets.gitmoji.types[0]       // { value: '✨', desc: 'New feature' }
```

### Full Type Reference

```typescript
import type {
  Config,
  CustomRule,
  ValidationConfig,
  DirectCommitOptions,
  InteractiveOptions,
  AICommitSuggestion,
  CoAuthor,
  CommitData,
  CommitType,
  Preset,
  CommitOptions,
  CommitResult,
  IssueReference,
  ParsedCommit,
  CommitContext,
  ScopeSuggestion,
  TemplateData,
  ParsedMessage,
  ValidationIssue,
  ValidationResult,
  FormatValidationResult,
} from 'commit-it'
```

---

## Example Configurations

Ready-to-use configurations are available in [`examples/configs/`](./examples/configs/):

### Minimal (personal projects)

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
})
```

### AI-First (let the AI handle it)

AI config is per-user, not per-project. Run `commit-it` once to go through the setup wizard, or create `~/.commit-it/config.json` with `{ "ai": { "auto": true, "provider": "claude" } }`.

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  scopeMap: {
    'src/api/**': 'api',
    'src/cli/**': 'cli',
    'src/ui/**': 'ui',
    'docs/**': 'docs',
    'package.json': 'deps',
  },
  validation: {
    enabled: true,
    maxHeaderLength: 100,
    customRules: [
      {
        name: 'no-wip',
        pattern: '\\bWIP\\b',
        message: 'Remove WIP before committing',
        level: 'warning',
        invert: true,
      },
    ],
  },
})
```

### Monorepo (multi-package)

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  scopeMap: {
    'packages/core/**': 'core',
    'packages/cli/**': 'cli',
    'packages/web/**': 'web',
    'packages/api/**': 'api',
    'apps/admin/**': 'admin',
    'docs/**': 'docs',
  },
  github: {
    enabled: true,
    scopeLabelPatterns: ['pkg:', 'package:'],
  },
  validation: {
    enabled: true,
    requireScope: true,
    allowedScopes: ['core', 'cli', 'web', 'api', 'admin', 'docs', 'deps'],
  },
})
```

### Enterprise JIRA

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  github: { enabled: false },
  validation: {
    enabled: true,
    maxHeaderLength: 100,
    requireScope: true,
    requireBody: true,
    allowedTypes: ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'],
    customRules: [
      {
        name: 'require-jira-ticket',
        pattern: '[A-Z]{2,}-\\d+',
        message: 'Must include JIRA ticket (e.g., PROJ-123)',
        level: 'error',
        invert: false,
      },
      {
        name: 'no-wip',
        pattern: '\\b(WIP|wip)\\b',
        message: 'WIP commits not allowed',
        level: 'error',
        invert: true,
      },
    ],
  },
})
```

### Security-Focused

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  validation: {
    enabled: true,
    requireScope: true,
    customRules: [
      {
        name: 'no-api-keys',
        pattern: '\\b(api[_-]?key|apikey|api[_-]?secret)\\b',
        message: 'Possible API key in commit message',
        level: 'error',
        invert: true,
      },
      {
        name: 'no-passwords',
        pattern: '\\b(password|passwd|pwd)\\s*[:=]',
        message: 'Possible password in commit message',
        level: 'error',
        invert: true,
      },
      {
        name: 'no-tokens',
        pattern: '\\b(token|bearer|jwt)\\s*[:=]\\s*["\']?[A-Za-z0-9+/=]{20,}',
        message: 'Possible token in commit message',
        level: 'error',
        invert: true,
      },
      {
        name: 'no-private-keys',
        pattern: 'BEGIN (RSA |DSA |EC )?PRIVATE KEY',
        message: 'Private key detected in commit message',
        level: 'error',
        invert: true,
      },
    ],
  },
})
```

### Team Collaboration (pair/mob programming)

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  coauthors: {
    alice: 'Alice Smith <alice@company.com>',
    bob: 'Bob Jones <bob@company.com>',
    charlie: 'Charlie Wilson <charlie@company.com>',
    'frontend-team': 'Frontend Team <frontend@company.com>',
    'backend-team': 'Backend Team <backend@company.com>',
  },
  github: {
    enabled: true,
    auto: {
      detectIssues: true,
      suggestReviewers: true,
    },
  },
})
```

### Open Source (DCO sign-off)

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  github: {
    enabled: true,
    auto: { detectIssues: true, suggestReviewers: true },
  },
  validation: {
    enabled: true,
    customRules: [
      {
        name: 'require-signoff',
        pattern: 'Signed-off-by: .+ <.+@.+>',
        message: 'DCO sign-off required. Use: git commit -s',
        level: 'error',
        invert: false,
      },
      {
        name: 'no-merge',
        pattern: '^Merge (branch|pull request)',
        message: 'Use rebase instead of merge commits',
        level: 'error',
        invert: true,
      },
    ],
  },
})
```

### Strict Validation

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',
  validation: {
    enabled: true,
    maxHeaderLength: 50,
    maxBodyLineLength: 72,
    requireScope: true,
    requireBody: true,
    requireIssue: true,
    noTrailingPeriod: true,
    noLeadingCapital: true,
    allowedTypes: ['feat', 'fix', 'docs', 'refactor', 'test'],
    allowedScopes: ['core', 'api', 'ui', 'db', 'auth', 'docs', 'test', 'deps'],
    customRules: [
      {
        name: 'imperative-mood',
        pattern: '^\\w+\\([^)]*\\): (add|fix|update|remove|refactor|improve|implement)',
        message: 'Use imperative mood: "add" not "adds" or "added"',
        level: 'error',
        invert: false,
      },
      {
        name: 'no-wip',
        pattern: '\\b(WIP|wip|work in progress)\\b',
        message: 'WIP commits not allowed',
        level: 'error',
        invert: true,
      },
      {
        name: 'no-fixup',
        pattern: '^fixup!',
        message: 'Squash fixup commits before pushing',
        level: 'error',
        invert: true,
      },
    ],
  },
})
```

All example configs are in [`examples/configs/`](./examples/configs/) -- copy any to your project root as `commit.config.ts` and customize.

---

## Architecture

```
src/
├── cli.ts                       CLI entry point, default command routing
├── index.ts                     Public API exports
├── commands/
│   ├── alias.ts                 Shell alias setup (zsh/bash/fish)
│   ├── branch.ts                Create branches from GitHub issues
│   ├── commit.ts                Interactive and non-interactive commit
│   ├── config.ts                Print resolved config
│   ├── hook.ts                  Install/uninstall commit-msg hook
│   ├── init.ts                  Generate config file interactively
│   ├── presets.ts               List available presets
│   └── validate.ts              Validate commit messages
├── config/
│   └── index.ts                 Config schema (Zod), loading (c12), defaults
├── presets/
│   └── index.ts                 Conventional, Gitmoji preset definitions
├── prompts/
│   └── commitFlow.ts            Full interactive commit flow orchestration
├── services/
│   ├── ai.ts                    AI generation orchestration (provider resolution, prompt, parsing)
│   ├── ai/
│   │   ├── adapters/            CLI adapters (claude, codex, agent, custom)
│   │   ├── config.ts            Per-user AI config (~/.commit-it/config.json)
│   │   ├── detect.ts            Auto-detect available AI CLIs from $PATH
│   │   └── types.ts             AI types and Zod schemas
│   ├── coauthor.ts              Co-author parsing, formatting, GitHub lookup
│   ├── editor.ts                Open $EDITOR for commit message editing
│   ├── format.ts                Preset-based format validation
│   ├── git.ts                   Git operations (simple-git wrapper)
│   ├── github.ts                GitHub CLI (gh) wrapper
│   ├── scope.ts                 Scope suggestions from config map + labels
│   ├── setup.ts                 First-run setup wizard
│   ├── template.ts              Mustache-like commit message templating
│   └── validation.ts            Rule-based commit message validation
└── utils/
    ├── commitTokens.ts          Shared footer token list and regex
    └── execFileNoThrow.ts       Child process helpers (throw/no-throw)
```

### Dependencies

| Package | Purpose |
|---------|---------|
| [@drizzle-team/brocli](https://github.com/drizzle-team/brocli) | CLI command framework |
| [@clack/prompts](https://github.com/bombshell-dev/clack) | Interactive terminal prompts |
| [@inquirer/search](https://github.com/SBoudrias/Inquirer.js) | Async search prompt (issue search) |
| [simple-git](https://github.com/steveukx/git-js) | Git operations |
| [c12](https://github.com/unjs/c12) | Config file loading (TS, JS, JSON, YAML, package.json) |
| [micromatch](https://github.com/micromatch/micromatch) | Glob pattern matching for scope maps |
| [zod](https://zod.dev) | Config schema validation |

---

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Watch mode (rebuild on changes)
bun run dev

# Run tests
bun test

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch

# Lint (check)
bun run lint

# Lint (auto-fix)
bun run lint:fix

# Type check
bun run type-check
```

---

## Troubleshooting

### GitHub integration not working

```bash
# Check if gh is installed and authenticated
gh auth status
```

If not authenticated, run `gh auth login`. GitHub features degrade gracefully -- if `gh` is unavailable, commit-it continues without GitHub context.

### AI generation not working

1. Check if a supported CLI is installed:

```bash
claude --version   # Claude Code
codex --version    # OpenAI Codex
agent --version    # Cursor Agent
```

2. Check your AI config:

```bash
cat ~/.commit-it/config.json
```

If missing, run `commit-it` to go through the setup wizard, or create it manually.

3. Ensure you have staged changes (`git add`). AI generates from the staged diff -- if nothing is staged, there's no diff to analyze.

### Validation hook not running

```bash
# Reinstall
commit-it uninstall-hook
commit-it install-hook

# Verify the hook exists and is executable
ls -la .git/hooks/commit-msg
```

### Config not loading

```bash
# Print the resolved config
commit-it config
```

This shows the merged result of your config file and defaults. If you see only defaults, your config file may have a syntax error or be in an unsupported location.

### Scopes not suggested

Check that your `scopeMap` patterns use valid glob syntax:

```typescript
scopeMap: {
  'src/cli/**': 'cli',          // ** matches any depth
  'src/services/*.ts': 'core',  // * matches single level
  '*.md': 'docs',               // root-level markdown files
}
```

Run `commit-it config` to verify your `scopeMap` is loaded correctly.

### Invalid type or scope errors in non-interactive mode

```
✗ Error creating commit: Invalid commit type "yolo". Valid types: feat, fix, ...
```

Check your preset and `allowedTypes`/`allowedScopes` in config. Use `commit-it presets` to see available types.

## License

MIT
