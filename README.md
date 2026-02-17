# commit-it

An interactive CLI for creating standardized git commits with GitHub integration, AI-powered message generation, co-author support, and configurable validation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [Non-Interactive Mode](#non-interactive-mode)
- [Interactive Commit Flow](#interactive-commit-flow)
- [Configuration](#configuration)
- [Presets](#presets)
- [AI Commit Messages](#ai-commit-messages)
- [GitHub Integration](#github-integration)
- [Git Hook](#git-hook)
- [Validation Rules](#validation-rules)
- [Scope Suggestions](#scope-suggestions)
- [Co-authors](#co-authors)
- [Programmatic API](#programmatic-api)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Interactive commit creation** — Step-by-step prompts guide you through building a commit message
- **Default command** — Running `commit-it` with no arguments starts the commit flow immediately
- **Multiple presets** — Conventional Commits, Angular, and Gitmoji formats
- **GitHub integration** — Detect PR context, search/link issues, extract scopes from labels via `gh` CLI
- **AI-powered suggestions** — Generate commit messages from staged diffs using OpenAI or Anthropic
- **Smart scopes** — Suggest scopes from file paths, config glob maps, and GitHub labels
- **Multi-scope modes** — Single scope, comma-separated inline, or primary + body
- **Co-author support** — Add co-authors from config aliases, GitHub collaborators, or manual entry
- **Commit message validation** — Built-in rules plus custom regex rules with error/warning levels
- **Git hook** — Install a `commit-msg` hook to validate every commit automatically
- **Branch generation** — Create git branches from GitHub issue numbers and titles
- **Dry run** — Preview commits without creating them
- **Amend support** — Amend the last commit with pre-filled values
- **Non-interactive mode** — Pass `--type` and `--message` flags to create commits without prompts (ideal for CI/CD and scripting)
- **Programmatic API** — Import and use all services in your own scripts

## Installation

```bash
# npm
npm install -g commit-it

# bun
bun add -g commit-it

# or run without installing
npx commit-it
bunx commit-it
```

## Quick Start

```bash
# Run the interactive commit flow (default command)
commit-it

# Or use the shorter alias
cit

# Initialize a config file
commit-it init

# Install the commit-msg validation hook
commit-it install-hook
```

Running `commit-it` with no arguments (or with only flags) automatically runs the `commit` command. If the first argument isn't a recognized command, it's also treated as a `commit` invocation.

## Commands

| Command | Description |
|---|---|
| `commit-it` | Run the interactive commit flow (default when no command given) |
| `commit-it commit` | Same as above, explicitly |
| `commit-it branch` | Create a git branch from GitHub issues |
| `commit-it validate` | Validate a commit message against configured rules |
| `commit-it init` | Generate a config file interactively |
| `commit-it install-hook` | Install a `commit-msg` git hook for validation |
| `commit-it uninstall-hook` | Remove the `commit-msg` git hook |
| `commit-it presets` | List available commit format presets |
| `commit-it config` | Print the resolved configuration as JSON |
| `commit-it setup-alias` | Add a shell alias (e.g. `commit`) to your shell config |

### `commit` Options

```bash
commit-it commit [options]
```

| Flag | Alias | Description |
|---|---|---|
| `--type <type>` | `-t` | Commit type (e.g. `feat`, `fix`). When used with `--message`, enables non-interactive mode |
| `--message <msg>` | `-m` | Commit message. When used with `--type`, enables non-interactive mode |
| `--scope <scope>` | `-s` | Commit scope |
| `--body <text>` | | Commit body text |
| `--all` | `-a` | Stage all changes before committing |
| `--amend` | | Amend the last commit (pre-fills type, scope, message from previous) |
| `--breaking` | `-b` | Mark as a breaking change |
| `--ai` | | Generate commit message from staged diff using AI |
| `--no-ai` | | Disable AI even if configured |
| `--co-author <value>` | `-c` | Add a co-author by config alias or `"Name <email>"` |
| `--no-github` | | Skip all GitHub API calls |
| `--dry-run` | | Preview the commit message without creating it |

#### Non-Interactive Mode

When both `--type` and `--message` are provided, commit-it skips all interactive prompts and creates the commit directly. The commit is still validated against your configured preset and validation rules.

```bash
# Basic non-interactive commit
commit-it -t feat -m "add user authentication"

# With scope, body, and breaking change
commit-it -t fix -s auth -m "resolve token refresh race condition" --body "Tokens were being refreshed concurrently" -b

# Dry run to preview
commit-it -t refactor -s cli -m "extract validation logic" --dry-run

# Stage all + co-author
commit-it -t feat -m "add dark mode" -a -c "Alice Smith <alice@example.com>"
```

This is useful for CI/CD pipelines, scripting, and other CLI tools that want to create formatted commits programmatically while still enforcing your commit conventions. Invalid types or scopes will cause an error with a message listing the valid options.

### `validate` Options

```bash
commit-it validate [options]
```

| Flag | Alias | Description |
|---|---|---|
| `--message <msg>` | `-m` | Commit message string to validate |
| `--file <path>` | `-f` | File containing a commit message (e.g. `.git/COMMIT_EDITMSG`) |

One of `--message` or `--file` is required.

### `branch` Options

```bash
commit-it branch [options]
```

| Flag | Alias | Description |
|---|---|---|
| `--postfix <value>` | `-p` | Append a postfix to the generated branch name |

The branch command is interactive — it prompts you to search for issues, select one or more, and optionally add a postfix before creating the branch.

### `install-hook` Options

| Flag | Alias | Description |
|---|---|---|
| `--force` | `-f` | Overwrite an existing `commit-msg` hook |

## Interactive Commit Flow

Running `commit-it` walks through these steps:

1. **Select commit type** — `feat`, `fix`, `docs`, `refactor`, etc. (from your preset). Pre-selected from AI suggestion, previous commit (when amending), or PR labels.
2. **Select scope** — Suggested from changed file paths, config `scopeMap`, and GitHub label patterns. Supports single, multi-inline, or multi-body modes.
3. **Breaking change** — If `--breaking` is set, prompts for a description of what breaks.
4. **Reference issues** — Optionally search and link GitHub issues. Choose an action for each: `Closes`, `Fixes`, `Resolves`, or `Ref`. You can link multiple issues.
5. **Commit message** — The short description (pre-filled from AI or previous commit).
6. **Body** — Optional detailed description.
7. **Co-authors** — Select from config aliases, GitHub collaborators, or enter manually.
8. **Preview and validate** — See the full message, check against validation rules, then confirm.

When amending (`--amend`), all fields are pre-filled from the previous commit.

When using AI (`--ai`), the staged diff is sent to the configured provider and the suggestion is shown for you to accept or decline before proceeding.

## Configuration

### Generating a Config File

```bash
commit-it init
```

Choose from TypeScript, JavaScript, JSON, or YAML format. The generated file includes sensible defaults.

### Config File Locations

commit-it uses [c12](https://github.com/unjs/c12) for config loading. Supported files (in priority order):

- `commit.config.ts` (recommended)
- `commit.config.js` / `.mjs` / `.cjs`
- `.commitrc` / `.commitrc.json` / `.commitrc.yaml` / `.commitrc.yml`
- `.commit.json` / `.commit.yaml` / `.commit.yml`
- `commit` key in `package.json`

### Full Config Reference

```typescript
// commit.config.ts
import { defineConfig } from 'commit-it'

export default defineConfig({
  // Commit format preset: 'conventional' | 'angular' | 'gitmoji'
  // Default: 'conventional'
  preset: 'conventional',

  // Custom commit message template (overrides preset template)
  // Uses {type}, {scope}, {message}, {emoji} placeholders
  template: undefined,

  // How multiple scopes are handled
  // 'single'       — pick one scope (default)
  // 'multi-inline' — comma-separated in header: feat(cli,config): ...
  // 'multi-body'   — first scope in header, rest noted in body
  scopeMode: 'single',

  // Default values for commit fields
  defaults: {
    scope: '',          // Pre-selected scope
    includeBody: true,  // Default answer for "Add detailed body?"
  },

  // Plugins (reserved for future use)
  plugins: [],

  // Map file glob patterns to scope names
  // When changed files match a pattern, the scope is suggested
  scopeMap: {
    'src/cli/**': 'cli',
    'src/services/**': 'core',
    'src/config/**': 'config',
    'docs/**': 'docs',
  },

  // Co-author aliases for quick access via --co-author <alias>
  coauthors: {
    alice: 'Alice Smith <alice@example.com>',
    bob: 'Bob Jones <bob@example.com>',
  },

  // AI commit message generation
  ai: {
    enabled: false,                // Enable AI features
    provider: 'auto',             // 'openai' | 'anthropic' | 'auto'
    model: undefined,             // Override default model
  },

  // GitHub integration (requires gh CLI)
  github: {
    enabled: true,
    // Label prefixes used to extract scopes from PR/issue labels
    // e.g. label "scope:api" with prefix "scope:" -> scope "api"
    scopeLabelPatterns: [
      'scope:', 'scope/',
      'area:', 'area/',
      'component:', 'component/',
    ],
    auto: {
      detectIssues: true,         // Prompt for issue references by default
      suggestReviewers: false,    // Suggest reviewers from collaborators
    },
  },

  // Commit message validation rules
  validation: {
    enabled: true,
    maxHeaderLength: 72,          // Max first-line length
    maxBodyLineLength: 100,       // Max body line length (warning)
    requireScope: false,          // Scope is mandatory
    requireBody: false,           // Body is mandatory
    requireIssue: false,          // At least one issue reference required
    allowedTypes: undefined,      // Restrict to these types (undefined = all preset types)
    allowedScopes: undefined,     // Restrict to these scopes (undefined = unrestricted)
    noTrailingPeriod: true,       // Subject must not end with "."
    noLeadingCapital: false,      // Subject must start with lowercase
    customRules: [],              // Array of custom regex rules (see below)
  },
})
```

### Custom Validation Rules

Each custom rule is a regex-based check:

```typescript
customRules: [
  {
    name: 'no-wip',             // Rule identifier
    pattern: '\\bWIP\\b',       // Regex pattern
    message: 'WIP commits are not allowed',
    level: 'error',             // 'error' (blocks) or 'warning' (advisory)
    invert: true,               // true = fails when pattern MATCHES
                                // false = fails when pattern DOES NOT match
  },
  {
    name: 'require-ticket',
    pattern: 'JIRA-\\d+',
    message: 'Must reference a JIRA ticket',
    level: 'error',
    invert: false,              // Fails if no JIRA ticket found
  },
]
```

## Presets

| Preset | Format | Types |
|---|---|---|
| `conventional` | `type(scope): message` | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore` |
| `angular` | `type(scope): message` | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test` |
| `gitmoji` | `emoji message` | ✨, 🐛, 📚, 💅, ♻️, ⚡, ✅, 🔧, 🚀 |

Each preset includes its own validator regex and default scopes.

## AI Commit Messages

Generate a commit message from your staged diff:

```bash
commit-it --ai
```

### Setup

Set the API key for your provider:

```bash
# OpenAI (default model: gpt-4o-mini)
export OPENAI_API_KEY="sk-..."

# Anthropic (default model: claude-sonnet-4-20250514)
export ANTHROPIC_API_KEY="sk-ant-..."
```

Enable in config:

```typescript
ai: {
  enabled: true,
  provider: 'auto',    // Checks OPENAI_API_KEY first, then ANTHROPIC_API_KEY
  model: 'gpt-4o-mini', // Optional override
}
```

The AI analyzes up to 8000 characters of your staged diff and suggests a type, scope, message, body, and breaking change description. You can accept or decline the suggestion before proceeding through the normal flow.

## GitHub Integration

commit-it integrates with GitHub via the [`gh` CLI](https://cli.github.com).

### Setup

```bash
# Install
brew install gh        # macOS
winget install GitHub.cli  # Windows

# Authenticate
gh auth login
```

### What It Does

- **PR context detection** — Detects the current PR for your branch and reads its labels
- **Type suggestion from labels** — `bug` label suggests `fix`, `feature` suggests `feat`, `docs` suggests `docs`
- **Scope extraction from labels** — Labels like `scope:api` or `area:core` become scope suggestions (configurable patterns)
- **Issue search and linking** — Search issues by number or keyword, select action (`Closes`, `Fixes`, `Resolves`, `Ref`)
- **Branch creation** — Create branches named from issue numbers and titles (e.g. `42-43-add-oauth-fix-redirect`)

Pass `--no-github` to skip all GitHub API calls for faster local-only commits.

## Git Hook

Install a `commit-msg` hook that validates every commit:

```bash
commit-it install-hook
```

This writes a shell script to `.git/hooks/commit-msg` that runs `commit-it validate --file "$1"`. It looks for `commit-it` on `PATH` first, then falls back to `npx commit-it`.

```bash
# Remove the hook
commit-it uninstall-hook

# Overwrite an existing non-commit-it hook
commit-it install-hook --force
```

If a `commit-msg` hook already exists and wasn't installed by commit-it, you'll be prompted to use `--force` or manually add `commit-it validate --file "$1"` to your existing hook.

## Shell Alias

Set up a shell alias so you can type `commit` (or any name you choose) instead of `commit-it`:

```bash
commit-it setup-alias
```

This is also offered during `commit-it init`. It will:

1. Ask which shell you use (auto-detects from `$SHELL`)
2. Ask for an alias name (default: `commit`)
3. Append the alias to your shell config file
4. Show instructions to activate it

Supported shells:

| Shell | Config File | Alias Format |
|---|---|---|
| Zsh | `~/.zshrc` | `alias commit='commit-it'` |
| Bash | `~/.bashrc` | `alias commit='commit-it'` |
| Fish | `~/.config/fish/config.fish` | `alias commit 'commit-it'` |

After setup, activate immediately with:

```bash
source ~/.zshrc    # or ~/.bashrc, etc.
```

Then use your alias:

```bash
commit             # interactive commit (same as commit-it)
commit --ai        # AI-generated commit
commit branch      # create branch from issues
```

## Validation Rules

The validator checks these rules (all configurable):

| Rule | Default | Level | Description |
|---|---|---|---|
| `header-max-length` | 72 chars | error | First line must not exceed max length |
| `body-max-line-length` | 100 chars | warning | Body lines should not exceed max length |
| `conventional-format` | required | error | Must follow `type(scope): subject` format |
| `blank-line-after-header` | required | error | Second line must be blank |
| `scope-required` | off | error | Scope is mandatory |
| `body-required` | off | error | Body is mandatory |
| `issue-required` | off | error | At least one issue reference required |
| `type-enum` | unrestricted | error | Type must be in allowed list |
| `scope-enum` | unrestricted | error | Scope must be in allowed list |
| `subject-no-trailing-period` | on | warning | Subject should not end with `.` |
| `subject-no-leading-capital` | off | warning | Subject should not start with uppercase |
| Custom rules | none | configurable | Your own regex-based rules |

## Scope Suggestions

Scopes are suggested from three sources (in priority order):

1. **Config `scopeMap`** — Glob patterns matched against changed files
2. **GitHub labels** — Labels matching `scopeLabelPatterns` prefixes (e.g. `scope:api` → `api`)
3. **File paths** — Directory names extracted from changed files (e.g. `src/services/git.ts` → `services`)

All sources are deduplicated. Config scopes take priority over label scopes, which take priority over path scopes.

## Co-authors

### From Config Aliases

Define aliases in your config:

```typescript
coauthors: {
  alice: 'Alice Smith <alice@example.com>',
  bob: 'Bob Jones <bob@example.com>',
}
```

Use via CLI flag:

```bash
commit-it --co-author alice
```

### From GitHub Collaborators

During the interactive flow, selecting "Add co-authors?" fetches collaborators from the GitHub API (up to 10) and presents them for selection.

### Manual Entry

You can also type a co-author manually in `Name <email>` format during the interactive flow.

Co-authors are appended as `Co-authored-by:` trailers in the commit message footer.

## Programmatic API

commit-it exports all core services for use in scripts and tools:

```typescript
import {
  // Config
  defineConfig, loadConfig, getDefaultConfig,

  // Presets
  getPreset, listPresets, presets,

  // Commit flows
  interactiveCommit, directCommit,

  // Git operations
  createCommit, GitService,

  // GitHub
  GitHubService,

  // AI
  generateCommitMessage, isAIAvailable,

  // Validation
  validateCommitMessage, parseCommitMessage, formatValidationResult,
  getDefaultValidationConfig,

  // Templates
  renderTemplate, buildFullMessage, DEFAULT_TEMPLATES,

  // Co-authors
  parseCoAuthor, formatCoAuthor, formatCoAuthors,
  getAllCoAuthors, getCoAuthorsFromConfig,

  // Scopes
  getAllScopeSuggestions, getScopesFromConfig,
  getScopesFromPaths, getScopesFromLabels,

  // Format
  FormatValidator,
} from 'commit-it'
```

### Creating a Commit Programmatically

```typescript
import { GitService } from 'commit-it'

const git = new GitService()

const result = await git.createCommit({
  type: 'feat',
  scope: 'api',
  message: 'add user endpoint',
  body: 'Implements GET /users/:id',
  breaking: undefined,
  coauthors: ['Co-authored-by: Alice <alice@example.com>'],
  issueRefs: [{ action: 'Closes', number: 42 }],
  dryRun: false,
  stage: false,
  amend: false,
})

console.log(result.hash)    // commit SHA
console.log(result.message) // full formatted message
```

### Validating a Message

```typescript
import { validateCommitMessage } from 'commit-it'

const result = validateCommitMessage('feat(cli): add new command', {
  enabled: true,
  maxHeaderLength: 72,
  requireScope: true,
})

console.log(result.valid)    // true
console.log(result.errors)   // []
console.log(result.warnings) // []
```

### Parsing a Commit Message

```typescript
import { parseCommitMessage } from 'commit-it'

const parsed = parseCommitMessage('feat(cli)!: redesign interface\n\nNew layout\n\nBREAKING CHANGE: Old API removed\n\nCloses #42')

// {
//   header: 'feat(cli)!: redesign interface',
//   type: 'feat',
//   scope: 'cli',
//   subject: 'redesign interface',
//   body: 'New layout',
//   footer: 'BREAKING CHANGE: Old API removed\nCloses #42',
//   isBreaking: true,
//   issues: [42],
// }
```

### Generating an AI Message

```typescript
import { generateCommitMessage, loadConfig } from 'commit-it'

const config = await loadConfig()
const diff = '...' // staged diff output

const suggestion = await generateCommitMessage(diff, config, {
  branchName: 'feature/new-api',
  existingTypes: ['feat', 'fix', 'docs'],
})

// { type: 'feat', scope: 'api', message: 'add user endpoint', body: '...', breaking: undefined }
```

## Architecture

```
src/
├── cli.ts                     CLI entry point, default command routing
├── index.ts                   Public API exports
├── commands/
│   ├── branch.ts              Create branches from GitHub issues
│   ├── commit.ts              Interactive commit command
│   ├── config.ts              Print resolved config
│   ├── hook.ts                Install/uninstall commit-msg hook
│   ├── init.ts                Generate config file
│   ├── presets.ts             List available presets
│   └── validate.ts            Validate commit messages
├── config/
│   └── index.ts               Config schema (Zod), loading (c12), defaults
├── presets/
│   └── index.ts               Conventional, Angular, Gitmoji definitions
├── prompts/
│   └── commitFlow.ts          Full interactive commit flow orchestration
├── services/
│   ├── ai.ts                  AI generation (OpenAI/Anthropic via Vercel AI SDK)
│   ├── coauthor.ts            Co-author parsing, formatting, GitHub lookup
│   ├── format.ts              Preset-based format validation
│   ├── git.ts                 Git operations (simple-git wrapper)
│   ├── github.ts              GitHub CLI wrapper (gh)
│   ├── scope.ts               Scope suggestions from paths, config, labels
│   ├── template.ts            Mustache-like commit message templating
│   └── validation.ts          Rule-based commit message validation
└── utils/
    └── execFileNoThrow.ts     Child process helper
```

### Key Dependencies

| Package | Purpose |
|---|---|
| [@drizzle-team/brocli](https://github.com/drizzle-team/brocli) | CLI command framework |
| [@clack/prompts](https://github.com/bombshell-dev/clack) | Interactive terminal prompts |
| [simple-git](https://github.com/steveukx/git-js) | Git operations |
| [c12](https://github.com/unjs/c12) | Config file loading (TS, JS, JSON, YAML, package.json) |
| [ai](https://sdk.vercel.ai) | Vercel AI SDK for LLM integration |
| [@ai-sdk/openai](https://www.npmjs.com/package/@ai-sdk/openai) | OpenAI provider |
| [@ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic) | Anthropic provider |
| [micromatch](https://github.com/micromatch/micromatch) | Glob pattern matching for scope maps |
| [zod](https://zod.dev) | Config schema validation |

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Watch mode
bun run dev

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Lint
bun run lint

# Fix lint issues
bun run lint:fix

# Type check
bun run type-check
```

## Troubleshooting

### GitHub integration not working

Ensure `gh` CLI is installed and authenticated:

```bash
gh auth status
```

If not authenticated:

```bash
gh auth login
```

GitHub features degrade gracefully — if `gh` is unavailable, commit-it continues without GitHub context.

### AI generation not working

1. Check your API key is set:

```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
```

2. Ensure AI is enabled in config:

```typescript
ai: {
  enabled: true,
  provider: 'auto',
}
```

3. Ensure you have staged changes (AI generates from the staged diff).

### Validation hook not running

Reinstall the hook:

```bash
commit-it uninstall-hook
commit-it install-hook
```

Verify the hook exists and is executable:

```bash
ls -la .git/hooks/commit-msg
```

### Config not loading

Print the resolved config to see what commit-it is using:

```bash
commit-it config
```

This shows the merged result of your config file and defaults.

### Scopes not detected from file paths

Check that your `scopeMap` patterns use glob syntax matching your file paths:

```typescript
scopeMap: {
  'src/cli/**': 'cli',       // Matches src/cli/index.ts, src/cli/foo/bar.ts
  'src/services/*.ts': 'core', // Matches src/services/git.ts
}
```

Path-based scope detection (without `scopeMap`) extracts directory names, skipping common non-descriptive directories like `src`, `lib`, `app`, `dist`, and `node_modules`.

## License

MIT
