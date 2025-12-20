# commit-it

A powerful CLI tool for creating standardized commit messages with GitHub integration, AI assistance, and validation.

## Getting Started

### 1. Install

```bash
# npm
npm install -g commit-it

# bun
bun add -g commit-it

# pnpm
pnpm add -g commit-it
```

### 2. Create Your First Commit

Navigate to any git repository and run:

```bash
commit-it commit
```

You'll be guided through an interactive flow:

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

That's it! No configuration required to get started.

### 3. Optional: Add Configuration

For team standards or advanced features, create a config file:

```bash
commit-it init
```

Choose your preferred format (TypeScript, JavaScript, JSON, or YAML) and customize as needed.

### 4. Optional: Enable Validation Hook

Automatically validate all commits before they're created:

```bash
commit-it install-hook
```

Now invalid commits will be rejected with helpful error messages.

---

## Features

| Feature | Description |
|---------|-------------|
| **Interactive flow** | Guided prompts for type, scope, message, body, and more |
| **GitHub integration** | Search issues, detect PR context, extract scopes from labels |
| **AI generation** | Generate commit messages from diffs (OpenAI/Anthropic) |
| **Validation** | Built-in rules + custom regex patterns with git hook support |
| **Multi-format config** | TypeScript, JavaScript, JSON, YAML, or RC files |
| **Branch creation** | Create branches from GitHub issues |
| **Co-authors** | Add collaborators from saved aliases or GitHub |
| **Breaking changes** | `!` notation with BREAKING CHANGE footer |
| **Amend mode** | Modify last commit with pre-filled values |

---

## Commands

### `commit`

Create a commit interactively.

```bash
commit-it commit [options]

Options:
  --all, -a        Stage all changes before committing
  --amend, -m      Amend the last commit (pre-fills previous values)
  --breaking, -b   Mark as breaking change
  --ai             Generate message with AI
  --co-author, -c  Add co-author (alias or "Name <email>")
  --no-github      Skip GitHub integration
  --dry-run        Preview without committing
```

**Examples:**

```bash
# Basic interactive commit
commit-it commit

# Stage everything and use AI to generate the message
commit-it commit --all --ai

# Amend the last commit
commit-it commit --amend

# Breaking change with a co-author
commit-it commit --breaking --co-author alice
```

### `branch`

Create git branches from GitHub issues.

```bash
commit-it branch [options]

Options:
  --postfix, -p    Add suffix to branch name
```

**Example:**

```
? Search issues: authentication
? Select issues:
  ✓ #42 - Add OAuth support
  ✓ #43 - Fix login redirect

? Branch postfix (optional): wip

✓ Created branch: 42-add-oauth-support-43-fix-login-redirect-wip
```

### `validate`

Check if a commit message follows your rules.

```bash
commit-it validate --message "feat(cli): add validation"
commit-it validate --file .git/COMMIT_EDITMSG
```

**Output:**

```
Validating commit message:
  "feat(cli): add validation"

✓ Commit message is valid
```

Or with errors:

```
✗ Errors:
  • header-max-length (line 1): Header exceeds 72 characters (85)
  • type-enum: Type "feature" is not allowed. Use: feat, fix, docs...

⚠ Warnings:
  • subject-no-trailing-period: Subject should not end with a period
```

### `install-hook` / `uninstall-hook`

Manage the git commit-msg validation hook.

```bash
# Install (validates commits automatically)
commit-it install-hook

# Remove
commit-it uninstall-hook
```

### `init`

Create a config file interactively.

```bash
commit-it init
```

Prompts for format (TS, JS, JSON, YAML) and preset.

### `presets`

List available commit format presets.

```bash
commit-it presets
```

---

## Configuration

Config files are loaded in this order (first found wins):

1. `commit.config.ts`
2. `commit.config.js` / `.mjs` / `.cjs`
3. `.commitrc` / `.commitrc.json` / `.commitrc.yaml` / `.commitrc.yml`
4. `package.json` (under `"commit"` key)

### TypeScript (Recommended)

```typescript
// commit.config.ts
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',

  // Map file paths to scopes
  scopeMap: {
    'src/cli/**': 'cli',
    'src/services/**': 'core',
    'tests/**': 'test',
  },

  // Co-author aliases
  coauthors: {
    alice: 'Alice Smith <alice@example.com>',
    bob: 'Bob Jones <bob@company.com>',
  },

  // AI commit generation
  ai: {
    enabled: true,
    provider: 'auto', // detects from OPENAI_API_KEY or ANTHROPIC_API_KEY
  },

  // GitHub integration
  github: {
    enabled: true,
    scopeLabelPatterns: ['scope:', 'area:'],
  },

  // Validation rules
  validation: {
    enabled: true,
    maxHeaderLength: 72,
    allowedTypes: ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'],
    customRules: [
      {
        name: 'no-wip',
        pattern: '\\bWIP\\b',
        message: 'Remove WIP before committing',
        level: 'error',
        invert: true, // pattern must NOT match
      },
    ],
  },
})
```

### YAML

```yaml
# .commitrc.yaml
preset: conventional

scopeMap:
  src/cli/**: cli
  src/services/**: core

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
```

### JSON

```json
{
  "preset": "conventional",
  "scopeMap": {
    "src/cli/**": "cli",
    "src/services/**": "core"
  },
  "validation": {
    "enabled": true,
    "maxHeaderLength": 72
  }
}
```

---

## Configuration Reference

### `preset`

Commit format preset: `conventional`, `angular`, or `gitmoji`.

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

### Custom Rules

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

### More Custom Rule Examples

```typescript
customRules: [
  // Require GitHub issue reference
  {
    name: 'require-issue',
    pattern: '#\\d+',
    message: 'Must reference a GitHub issue (e.g., #123)',
    level: 'error',
    invert: false,
  },

  // Require Signed-off-by for DCO compliance
  {
    name: 'require-signoff',
    pattern: 'Signed-off-by: .+ <.+@.+>',
    message: 'Must include Signed-off-by line (use git commit -s)',
    level: 'error',
    invert: false,
  },

  // Block common typos and mistakes
  {
    name: 'no-typos',
    pattern: '\\b(teh|taht|funciton|recieve)\\b',
    message: 'Commit message contains common typos',
    level: 'warning',
    invert: true,
  },

  // Enforce present tense ("add" not "added")
  {
    name: 'present-tense',
    pattern: '^\\w+\\([^)]*\\): (added|removed|fixed|updated|changed)',
    message: 'Use present tense: "add" not "added"',
    level: 'warning',
    invert: true,
  },

  // Linear issue reference (e.g., ENG-123)
  {
    name: 'require-linear',
    pattern: '[A-Z]{2,}-\\d+',
    message: 'Must reference a Linear issue (e.g., ENG-123)',
    level: 'error',
    invert: false,
  },

  // Block merge commits
  {
    name: 'no-merge',
    pattern: '^Merge (branch|pull request)',
    message: 'Use rebase instead of merge commits',
    level: 'error',
    invert: true,
  },

  // Require semantic version for release commits
  {
    name: 'release-version',
    pattern: '^chore\\(release\\): v?\\d+\\.\\d+\\.\\d+',
    message: 'Release commits must include semver (e.g., chore(release): v1.2.3)',
    level: 'error',
    invert: false,
    // Only applies when type is chore and scope is release
    appliesTo: { type: 'chore', scope: 'release' },
  },

  // Warn on long subjects (stricter than default)
  {
    name: 'short-subject',
    pattern: '^.{51,}',
    message: 'Keep subject under 50 characters for better git log output',
    level: 'warning',
    invert: true,
  },
]
```

### Team-Specific Configurations

**Open Source Project** — require DCO sign-off and issue references:

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

**Enterprise with JIRA** — strict ticket requirements:

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

**Monorepo** — enforce package scopes:

```typescript
validation: {
  enabled: true,
  requireScope: true,
  allowedScopes: ['core', 'cli', 'web', 'api', 'shared', 'docs'],
  customRules: [
    {
      name: 'no-root-changes',
      pattern: '^\\w+: ', // no scope
      message: 'Monorepo commits must specify a package scope',
      level: 'error',
      invert: true,
    },
  ],
}
```

---

## Workflow Examples

### Bug Fix from GitHub Issue

```bash
$ commit-it commit

? Select commit type: fix
? Search issues (number or keyword):
    #142 - Dashboard loading slow on mobile
    #139 - API rate limiting not working
    #134 - OAuth state mismatch on mobile browsers
    #127 - Users redirected to 404 after OAuth login

# Type to filter, results update as you type
? Search issues (number or keyword): oauth
    #134 - OAuth state mismatch on mobile browsers
  ✓ #127 - Users redirected to 404 after OAuth login

? Select scope: auth
? Commit message: handle OAuth callback URL correctly

✓ Created commit: fix(auth): handle OAuth callback URL correctly

Closes #127
```

### Feature with AI-Generated Message

```bash
# Stage changes, let AI analyze the diff
$ git add src/api/users.ts src/api/users.test.ts
$ commit-it commit --ai

Analyzing diff...

? AI suggested: feat(api): add user profile endpoints with avatar upload
  Accept this message? Yes

? Add detailed body? Yes
? Body:
  - GET /users/:id/profile
  - PATCH /users/:id/profile
  - POST /users/:id/avatar

✓ Created commit: feat(api): add user profile endpoints with avatar upload
```

### Breaking Change with Co-Authors

```bash
$ commit-it commit --breaking --co-author alice --co-author bob

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

### Amend Last Commit

```bash
# Forgot to add a file
$ git add src/utils/helpers.ts
$ commit-it commit --amend

Previous commit: feat(utils): add string helpers

? Select commit type: feat (from previous)
? Select scope: utils (from previous)
? Commit message: add string helpers (from previous)

✓ Amended commit: feat(utils): add string helpers
```

### Quick Commit (No GitHub)

```bash
# Skip GitHub integration for faster local commits
$ commit-it commit --no-github --all

? Select commit type: chore
? Select scope: deps
? Commit message: update dependencies

✓ Created commit: chore(deps): update dependencies
```

---

## Scope Detection

Scopes are suggested from three sources:

1. **Config mappings** — `scopeMap` glob patterns matched against changed files
2. **GitHub labels** — PR labels matching `scopeLabelPatterns` (e.g., `scope:api` → `api`)
3. **File paths** — Auto-detected from directory names in changed files

---

## Presets

### Conventional Commits

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
refactor(scope): code refactoring
test(scope): add tests
chore(scope): maintenance
```

### Angular

Same types as Conventional with Angular-specific conventions.

### Gitmoji

```
✨ feat(scope): add new feature
🐛 fix(scope): fix bug
📝 docs(scope): update docs
♻️ refactor(scope): refactoring
✅ test(scope): add tests
🔧 chore(scope): maintenance
```

---

## Programmatic API

```typescript
import {
  defineConfig,
  loadConfig,
  validateCommitMessage,
  parseCommitMessage,
  GitService,
  GitHubService,
} from 'commit-it'

// Create a commit programmatically
const git = new GitService()
await git.createCommit({
  type: 'feat',
  scope: 'api',
  message: 'add user endpoint',
  issueRefs: [{ action: 'Closes', number: 123 }],
})

// Validate a message
const result = validateCommitMessage('feat: add feature', {
  enabled: true,
  maxHeaderLength: 72,
  // ...
})
console.log(result.valid) // true

// Parse a commit message
const parsed = parseCommitMessage('feat(api)!: breaking change')
console.log(parsed.type)       // 'feat'
console.log(parsed.scope)      // 'api'
console.log(parsed.isBreaking) // true
```

---

## License

MIT
