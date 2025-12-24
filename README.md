# Commit-It

A CLI tool that creates standardized commits with GitHub integration and AI assistance.

![Placeholder: hero-screenshot.png]

## Features

- **Interactive commit creation** - Beautiful CLI prompts guide you through the process
- **Multiple presets** - Conventional Commits, Angular, and Gitmoji formats included
- **GitHub integration** - Auto-detect context from PRs, issues, and labels via gh CLI
- **AI-powered suggestions** - Generate commit messages from diffs using OpenAI or Anthropic
- **Smart scopes** - Extract scopes from file paths, labels, and configuration
- **Co-authors** - Add co-author attribution with simple aliases
- **Validation** - Enforce commit message standards with customizable rules
- **Git hooks** - Enable pre-commit validation
- **Branch generation** - Create branches from issue numbers and titles

## Installation

```bash
# npm
npm install -g commit-it

# pnpm
pnpm add -g commit-it

# bun
bun add -g commit-it
```

## Getting Started

### 1. Create Your First Commit

Navigate to any git repository and run:

```bash
commit-it commit
```

The interactive prompts guide you through:
- Type selection (feat, fix, docs, etc.)
- Scope (optional)
- Commit message
- Body (optional)
- Breaking changes (optional)
- Issue references (optional)
- Co-authors (optional)

![Placeholder: basic-commit-flow.gif]

### 2. Initialize Configuration (Optional)

For team standards or advanced features:

```bash
commit-it init
```

Choose your preferred format (TypeScript, JavaScript, JSON, or YAML) and customize as needed.

### 3. Enable Validation Hook (Optional)

Automatically validate all commits:

```bash
commit-it install-hook
```

Invalid commits will be rejected with helpful error messages.

## Usage Examples

### Basic Interactive Commit

```bash
commit-it commit
```

```
? Select commit type
  feat       A new feature
  fix        A bug fix
  docs       Documentation only changes
  ...

? Select scope (or skip)
  (none)
  cli (path)
  services (path)

? Commit message
  add user authentication

? Add detailed body? No

? Create commit? Yes

✓ Created commit: feat(cli): add user authentication
```

![Placeholder: interactive-commit.gif]

### Commit with AI Generation

```bash
# Stage changes
git add src/api/users.ts

# Generate message from diff
commit-it commit --ai
```

```
Analyzing diff...

? AI suggested: feat(api): add user profile endpoints
  Accept this message? Yes

? Add detailed body? Yes
? Body:
  - GET /users/:id/profile
  - PATCH /users/:id/profile

✓ Created commit: feat(api): add user profile endpoints
```

![Placeholder: ai-commit.gif]

### Commit with GitHub Integration

When working on a PR with labels `bug` and `scope:api`:

```bash
commit-it commit
```

```
GitHub context detected:
  PR #42: Fix API timeout
  Labels: bug, scope:api

? Select commit type: fix (suggested from "bug" label)
? Select scope: api (from "scope:api" label)
? Commit message: resolve timeout in user endpoint

✓ Created commit: fix(api): resolve timeout in user endpoint

Closes #42
```

![Placeholder: github-integration.gif]

### Stage All and Commit

```bash
commit-it commit --all
```

Stages all changes before creating the commit.

### Amend Last Commit

```bash
# Forgot to add a file
git add src/utils/helpers.ts

commit-it commit --amend
```

```
Previous commit: feat(utils): add string helpers

? Select commit type: feat (from previous)
? Select scope: utils (from previous)
? Commit message: add string helpers (from previous)

✓ Amended commit: feat(utils): add string helpers
```

### Breaking Change with Co-Authors

```bash
commit-it commit --breaking --co-author alice --co-author bob
```

```
? Select commit type: feat
? Select scope: api
? Commit message: redesign authentication flow

? Describe breaking change:
  JWT tokens now use RS256 instead of HS256.
  All existing tokens will be invalidated.

✓ Created commit: feat(api)!: redesign authentication flow

BREAKING CHANGE: JWT tokens now use RS256 instead of HS256.
All existing tokens will be invalidated.

Co-authored-by: Alice Smith <alice@example.com>
Co-authored-by: Bob Jones <bob@company.com>
```

![Placeholder: breaking-change.gif]

### Create Branch from Issue

```bash
commit-it branch
```

```
? Search issues: authentication

? Select issues:
  ✓ #42 - Add OAuth support
  ✓ #43 - Fix login redirect

? Branch postfix (optional): wip

✓ Created branch: 42-add-oauth-support-43-fix-login-redirect-wip
```

Or specify issues directly:

```bash
commit-it branch --issue 42 --issue 43 --postfix wip
```

![Placeholder: branch-creation.gif]

### Validate a Message

```bash
commit-it validate "feat(cli): add new command"
```

```
Validating commit message:
  "feat(cli): add new command"

✓ Commit message is valid
```

With errors:

```bash
commit-it validate "feature(cli): Add new command."
```

```
✗ Errors:
  • type-enum: Type "feature" is not allowed. Use: feat, fix, docs...
  • subject-no-trailing-period: Subject should not end with a period

⚠ Warnings:
  • subject-case: Subject should be lowercase
```

### Quick Commit (Skip GitHub)

```bash
commit-it commit --no-github --all
```

Skips GitHub integration for faster local commits.

### Dry Run

```bash
commit-it commit --dry-run
```

Shows what would be committed without creating the commit.

## Configuration

### Config File Formats

Commit-it loads config from (first found wins):

1. `commit.config.ts` (recommended)
2. `commit.config.js` / `.mjs` / `.cjs`
3. `.commitrc` / `.commitrc.json` / `.commitrc.yaml` / `.commitrc.yml`
4. `package.json` (under `"commit"` key)

### TypeScript Configuration

```typescript
// commit.config.ts
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',

  defaults: {
    scope: '',
    includeBody: true,
  },

  // GitHub integration
  github: {
    enabled: true,
    scopeLabelPatterns: ['scope:', 'area:', 'component:'],
    auto: {
      detectIssues: true,
      suggestReviewers: false,
    },
  },

  // AI configuration
  ai: {
    enabled: true,
    provider: 'auto', // 'openai' | 'anthropic' | 'auto'
    model: 'gpt-4o-mini', // or 'claude-sonnet-4-20250514'
  },

  // Map file paths to scopes
  scopeMap: {
    'src/cli/**': 'cli',
    'src/services/**': 'services',
    'src/api/**': 'api',
    'docs/**': 'docs',
    'tests/**': 'test',
  },

  // Co-author aliases
  coauthors: {
    alice: 'Alice Smith <alice@example.com>',
    bob: 'Bob Jones <bob@example.com>',
  },

  // Validation rules
  validation: {
    enabled: true,
    maxHeaderLength: 72,
    maxBodyLineLength: 100,
    requireScope: false,
    requireBody: false,
    requireIssue: false,
    noTrailingPeriod: true,
    noLeadingCapital: false,
    allowedTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore'],
    allowedScopes: ['cli', 'api', 'core', 'ui', 'docs'],
    customRules: [
      {
        name: 'no-wip',
        pattern: '\\bWIP\\b',
        message: 'Commit messages should not contain WIP',
        level: 'error',
        invert: true,
      },
    ],
  },
})
```

### YAML Configuration

```yaml
# .commitrc.yaml
preset: conventional

scopeMap:
  src/cli/**: cli
  src/services/**: services

coauthors:
  alice: Alice Smith <alice@example.com>

ai:
  enabled: true
  provider: auto

github:
  enabled: true
  scopeLabelPatterns:
    - "scope:"
    - "area:"

validation:
  enabled: true
  maxHeaderLength: 72
  requireScope: false
```

### JSON Configuration

```json
{
  "preset": "conventional",
  "scopeMap": {
    "src/cli/**": "cli",
    "src/services/**": "services"
  },
  "validation": {
    "enabled": true,
    "maxHeaderLength": 72
  }
}
```

## Configuration Options

### `preset`

Commit format preset: `conventional`, `angular`, or `gitmoji`.

**Default:** `conventional`

### `template`

Custom commit message template (overrides preset template).

**Example:** `{emoji} {type}({scope}): {message}`

### `scopeMode`

How multiple scopes are handled.

**Options:** `single`, `multi-inline`, `multi-body`

**Default:** `single`

### `defaults`

Default values for commit fields.

```typescript
defaults: {
  scope: 'core',
  includeBody: true,
}
```

### `scopeMap`

Map glob patterns to scope names. Scopes are suggested when matching files are changed.

```typescript
scopeMap: {
  'src/api/**': 'api',
  'src/components/**': 'ui',
  'docs/**': 'docs',
}
```

### `coauthors`

Named aliases for co-authors. Use with `--co-author <alias>`.

```typescript
coauthors: {
  alice: 'Alice <alice@example.com>',
  bob: 'Bob <bob@example.com>',
}
```

### `ai`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable AI features |
| `provider` | string | `'auto'` | `'openai'`, `'anthropic'`, or `'auto'` |
| `model` | string | - | Override default model |

Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in your environment.

### `github`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable GitHub features |
| `scopeLabelPatterns` | string[] | `['scope:', 'area:']` | Label prefixes to extract scopes |
| `auto.detectIssues` | boolean | `true` | Auto-detect issues from branch/PR |
| `auto.suggestReviewers` | boolean | `false` | Suggest reviewers from collaborators |

### `validation`

| Rule | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable validation |
| `maxHeaderLength` | number | `72` | Max header characters |
| `maxBodyLineLength` | number | `100` | Max body line characters |
| `requireScope` | boolean | `false` | Require scope |
| `requireBody` | boolean | `false` | Require body |
| `requireIssue` | boolean | `false` | Require issue reference |
| `allowedTypes` | string[] | - | Restrict to these types |
| `allowedScopes` | string[] | - | Restrict to these scopes |
| `noTrailingPeriod` | boolean | `true` | Disallow trailing `.` |
| `noLeadingCapital` | boolean | `false` | Require lowercase start |
| `customRules` | array | `[]` | Custom regex rules |

### Custom Validation Rules

```typescript
customRules: [
  {
    name: 'require-ticket',
    pattern: 'JIRA-\\d+',
    message: 'Must reference a JIRA ticket',
    level: 'error',
    invert: false, // pattern MUST match
  },
  {
    name: 'no-fixup',
    pattern: '^fixup!',
    message: 'Squash fixup commits before merging',
    level: 'warning',
    invert: true, // pattern must NOT match
  },
]
```

## Presets

### Conventional Commits (default)

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
refactor(scope): code refactoring
test(scope): add tests
chore(scope): maintenance
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### Angular

```
feat(core): implement feature
fix(ui): correct styling
```

Same types as Conventional with Angular-specific conventions.

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`

### Gitmoji

```
✨ add new feature
🐛 fix critical bug
📚 update documentation
```

**Emojis:** ✨ 🐛 📚 💅 ♻️ ⚡ ✅ 🔧 🚀

## GitHub Integration

Commit-it integrates with GitHub via the `gh` CLI.

### Requirements

Install the GitHub CLI:

```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
# See https://github.com/cli/cli#installation
```

Authenticate:

```bash
gh auth login
```

### Features

- **Current PR detection** - Detects the PR for your branch
- **PR labels** - Suggests commit type from labels (bug → fix, feature → feat)
- **Issue search** - Search and link issues interactively
- **Scope extraction** - Extract scopes from label patterns
- **Branch creation** - Create branches from issue numbers and titles

### Label Patterns

Configure patterns to extract scopes from labels:

```typescript
github: {
  scopeLabelPatterns: [
    'scope:',    // scope:cli → cli
    'scope/',    // scope/api → api
    'area:',     // area:core → core
    'component:', // component:ui → ui
  ],
}
```

## AI Integration

Generate commit messages from diffs using AI.

### Setup

Set your API key:

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

Enable in config:

```typescript
ai: {
  enabled: true,
  provider: 'auto', // auto-detects from env
  model: 'gpt-4o-mini', // optional
}
```

### Usage

```bash
# Generate with AI
commit-it commit --ai
```

AI analyzes your staged changes and suggests:
- Commit type (feat, fix, etc.)
- Scope (if applicable)
- Message (concise, imperative mood)
- Body (for complex changes)
- Breaking changes (if detected)

### Supported Providers

- **OpenAI** - gpt-4o-mini (default), gpt-4o, gpt-3.5-turbo
- **Anthropic** - claude-sonnet-4-20250514 (default), claude-opus-4-20250514

## Commands

### `commit`

Create a standardized commit.

```bash
commit-it commit [options]
```

**Options:**
- `--all, -a` - Stage all changes
- `--amend, -m` - Amend last commit
- `--breaking, -b` - Mark as breaking change
- `--ai` - Generate message with AI
- `--co-author, -c <author>` - Add co-author (alias or "Name <email>")
- `--no-github` - Skip GitHub integration
- `--dry-run` - Show commit without creating

### `branch`

Create a branch from issue(s).

```bash
commit-it branch [options]
```

**Options:**
- `--issue, -i <number>` - Issue number (repeatable)
- `--postfix, -p <text>` - Additional text for branch name

**Examples:**

```bash
# Interactive issue search
commit-it branch

# From specific issues
commit-it branch --issue 42 --issue 43

# With postfix
commit-it branch --issue 42 --postfix wip
```

### `validate`

Validate a commit message.

```bash
commit-it validate <message>
```

**Examples:**

```bash
commit-it validate "feat(cli): add command"
commit-it validate "$(cat .git/COMMIT_EDITMSG)"
```

### `install-hook`

Install git commit-msg hook for validation.

```bash
commit-it install-hook
```

Now `git commit` will validate messages automatically.

### `uninstall-hook`

Remove git commit-msg hook.

```bash
commit-it uninstall-hook
```

### `init`

Create a config file interactively.

```bash
commit-it init
```

Prompts for format (TypeScript, JavaScript, JSON, YAML) and preset.

### `presets`

List available presets.

```bash
commit-it presets list
```

Show preset details:

```bash
commit-it presets show conventional
commit-it presets show angular
commit-it presets show gitmoji
```

### `config`

Show current configuration:

```bash
commit-it config show
```

Edit configuration file:

```bash
commit-it config edit
```

## Programmatic API

Commit-it exports all core functionality for programmatic use.

### Creating Commits

```typescript
import { interactiveCommit } from 'commit-it'

const result = await interactiveCommit({
  skipGithub: false,
  dryRun: false,
  stageAll: false,
  amend: false,
  breaking: false,
  useAI: true,
})

console.log('Created commit:', result.hash)
```

### Format Service

```typescript
import { FormatValidator, getPreset } from 'commit-it'

const preset = getPreset('conventional')
const validator = new FormatValidator(preset)

const result = validator.validate('feat(cli): add command')
console.log(result.valid) // true
```

### GitHub Service

```typescript
import { GitHubService } from 'commit-it'

const github = new GitHubService()

// Get current PR
const pr = await github.getCurrentPR()
console.log(pr?.number, pr?.title)

// Search issues
const issues = await github.searchIssues('bug')

// Detect context
const context = await github.detectContext()
console.log(context.suggestedType) // 'fix' (from bug label)
console.log(context.currentPR)
```

### AI Service

```typescript
import { generateCommitMessage, loadConfig } from 'commit-it'

const config = await loadConfig()
const diff = '...' // git diff output

const suggestion = await generateCommitMessage(diff, config, {
  branchName: 'feature/new-api',
  existingTypes: ['feat', 'fix'],
})

console.log(suggestion)
// {
//   type: 'feat',
//   scope: 'api',
//   message: 'add new endpoint',
//   body: 'Implements RESTful endpoint for...'
// }
```

### Git Service

```typescript
import { createCommit, GitService } from 'commit-it'

const git = new GitService()

// Get staged diff
const diff = await git.getStagedDiff()

// Create commit
const result = await createCommit({
  message: 'feat(cli): add command',
  amend: false,
  noVerify: false,
})

console.log('Hash:', result.hash)
```

### Scope Service

```typescript
import { getAllScopeSuggestions, loadConfig } from 'commit-it'

const config = await loadConfig()
const suggestions = await getAllScopeSuggestions({
  config,
  labels: ['scope:cli', 'area:core'],
  changedFiles: ['src/cli/index.ts'],
})

console.log(suggestions)
// ['cli', 'core']
```

### Validation Service

```typescript
import { validateCommitMessage, parseCommitMessage, loadConfig } from 'commit-it'

// Parse a commit message
const parsed = parseCommitMessage('feat(cli): add command')
console.log(parsed)
// {
//   type: 'feat',
//   scope: 'cli',
//   subject: 'add command',
//   ...
// }

// Validate a message
const config = await loadConfig()
const result = await validateCommitMessage('feat(cli): add command', config)
console.log(result.valid) // true
console.log(result.errors) // []
console.log(result.warnings) // []
```

### Configuration Service

```typescript
import { loadConfig, defineConfig, getDefaultConfig } from 'commit-it'

// Load config from file
const config = await loadConfig()

// Get defaults
const defaults = getDefaultConfig()

// Define config (type-safe helper)
export default defineConfig({
  preset: 'conventional',
  // ...
})
```

### Preset Service

```typescript
import { getPreset, listPresets, presets } from 'commit-it'

// List all presets
const names = listPresets()
console.log(names) // ['conventional', 'angular', 'gitmoji']

// Get a preset
const preset = getPreset('conventional')
console.log(preset.name) // 'Conventional Commits'
console.log(preset.types) // [{ value: 'feat', desc: '✨ A new feature' }, ...]

// Access all presets
console.log(presets.conventional)
console.log(presets.angular)
console.log(presets.gitmoji)
```

### Co-author Service

```typescript
import {
  getAllCoAuthors,
  getCoAuthorsFromConfig,
  formatCoAuthor,
  parseCoAuthor,
} from 'commit-it'

// Get all co-authors (config + git)
const authors = await getAllCoAuthors(config)

// Get from config only
const configAuthors = getCoAuthorsFromConfig(config)

// Format co-author
const formatted = formatCoAuthor('Alice', 'alice@example.com')
console.log(formatted) // 'Co-authored-by: Alice <alice@example.com>'

// Parse co-author string
const parsed = parseCoAuthor('Alice <alice@example.com>')
console.log(parsed) // { name: 'Alice', email: 'alice@example.com' }
```

### Template Service

```typescript
import { renderTemplate, buildFullMessage, DEFAULT_TEMPLATES } from 'commit-it'

// Render a template
const header = renderTemplate('{type}({scope}): {message}', {
  type: 'feat',
  scope: 'cli',
  message: 'add command',
})
console.log(header) // 'feat(cli): add command'

// Build full message
const full = buildFullMessage({
  type: 'feat',
  scope: 'api',
  message: 'add endpoint',
  body: 'Implements new endpoint',
  breaking: 'Changes API contract',
  issueRefs: [{ action: 'Closes', number: 42 }],
  coauthors: ['Alice <alice@example.com>'],
})
console.log(full)
// feat(api): add endpoint
//
// Implements new endpoint
//
// BREAKING CHANGE: Changes API contract
//
// Closes #42
//
// Co-authored-by: Alice <alice@example.com>
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

### AI generation not working

Check your API key is set:

```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
```

Enable AI in config:

```typescript
ai: {
  enabled: true,
  provider: 'auto',
}
```

### Validation hook not running

Reinstall the hook:

```bash
commit-it uninstall-hook
commit-it install-hook
```

Check the hook exists:

```bash
cat .git/hooks/commit-msg
```

### Config not loading

Check config file exists and is valid:

```bash
commit-it config show
```

Verify file location:

```bash
ls -la commit.config.ts .commitrc.json
```

### Scopes not detected

Verify `scopeMap` patterns match your files:

```typescript
scopeMap: {
  'src/cli/**': 'cli',  // Matches src/cli/index.ts
}
```

Check changed files:

```bash
git status --short
```

### Co-authors not working

Verify aliases in config:

```typescript
coauthors: {
  alice: 'Alice Smith <alice@example.com>',
}
```

Use with `--co-author alice`.

## Team Workflows

### Open Source Project

Require DCO sign-off and issue references:

```typescript
validation: {
  enabled: true,
  customRules: [
    {
      name: 'require-signoff',
      pattern: 'Signed-off-by: .+ <.+>',
      message: 'DCO sign-off required. Use: git commit -s',
      level: 'error',
      invert: false,
    },
    {
      name: 'require-issue',
      pattern: '(#\\d+|fixes #\\d+|closes #\\d+)',
      message: 'Reference a GitHub issue',
      level: 'warning',
      invert: false,
    },
  ],
}
```

### Enterprise with JIRA

Strict ticket requirements:

```typescript
validation: {
  enabled: true,
  requireScope: true,
  customRules: [
    {
      name: 'jira-ticket',
      pattern: '[A-Z]+-\\d+',
      message: 'Must include JIRA ticket (e.g., PROJ-123)',
      level: 'error',
      invert: false,
    },
  ],
}
```

### Monorepo

Enforce package scopes:

```typescript
validation: {
  enabled: true,
  requireScope: true,
  allowedScopes: ['core', 'cli', 'web', 'api', 'shared', 'docs'],
}

scopeMap: {
  'packages/core/**': 'core',
  'packages/cli/**': 'cli',
  'packages/web/**': 'web',
  'packages/api/**': 'api',
}
```

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/TimMikeladze/commit-it/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TimMikeladze/commit-it/discussions)

---

Made with ❤️ by [Tim Mikeladze](https://github.com/TimMikeladze)
