# Comprehensive Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create comprehensive test coverage for all README examples and core functionality

**Architecture:** Build from bottom-up - unit tests for services first, then integration tests for commands, finally end-to-end tests for README workflows. Use TDD throughout.

**Tech Stack:** Bun test runner, mocks for external dependencies (git, gh CLI, AI APIs)

---

## Task 1: Test Infrastructure Setup

**Files:**
- Create: `test/helpers/mocks.ts`
- Create: `test/helpers/fixtures.ts`
- Create: `test/helpers/testUtils.ts`

**Step 1: Write test for mock git operations**

```typescript
// test/helpers/mocks.test.ts
import { describe, expect, test } from 'bun:test'
import { mockGitService } from './mocks'

describe('Mock Git Service', () => {
	test('should mock getStagedDiff', async () => {
		const git = mockGitService({
			stagedDiff: 'test diff content',
		})
		const diff = await git.getStagedDiff()
		expect(diff).toBe('test diff content')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/helpers/mocks.test.ts`
Expected: FAIL with "mockGitService is not defined"

**Step 3: Implement mock helpers**

```typescript
// test/helpers/mocks.ts
import type { GitService } from '../../src/services/git'
import type { GitHubService } from '../../src/services/github'

export function mockGitService(overrides: {
	stagedDiff?: string
	currentBranch?: string
	changedFiles?: string[]
} = {}): Partial<GitService> {
	return {
		getStagedDiff: async () => overrides.stagedDiff || '',
		getCurrentBranch: async () => overrides.currentBranch || 'main',
		getChangedFiles: async () => overrides.changedFiles || [],
		getStagedFiles: async () => overrides.changedFiles || [],
	}
}

export function mockGitHubService(overrides: {
	currentPR?: any
	labels?: string[]
} = {}): Partial<GitHubService> {
	return {
		getCurrentPR: async () => overrides.currentPR || null,
		getLabels: async () => overrides.labels || [],
		isAvailable: () => true,
	}
}

export function mockAI(overrides: {
	suggestion?: any
} = {}) {
	return {
		generateCommitMessage: async () => overrides.suggestion || {
			type: 'feat',
			scope: 'test',
			message: 'add test feature',
		},
	}
}
```

**Step 4: Create test fixtures**

```typescript
// test/helpers/fixtures.ts
import type { Config } from '../../src/config'
import type { ParsedCommit } from '../../src/services/git'

export const testConfig: Config = {
	preset: 'conventional',
	scopeMode: 'single',
	defaults: {
		scope: '',
		includeBody: true,
	},
	plugins: [],
	validation: {
		enabled: true,
		maxHeaderLength: 72,
		maxBodyLineLength: 100,
		requireScope: false,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,
		customRules: [],
	},
	ai: {
		enabled: false,
		provider: 'auto',
	},
	github: {
		enabled: true,
		scopeLabelPatterns: ['scope:', 'area:'],
		auto: {
			detectIssues: true,
			suggestReviewers: false,
		},
	},
}

export const validCommitMessages = [
	'feat(cli): add new command',
	'fix(api): resolve timeout issue',
	'docs: update README',
	'test(unit): add validation tests',
]

export const invalidCommitMessages = [
	'Feature: add new command', // wrong type
	'feat(cli): Add new command.', // capital + period
	'fix: this is a very long message that exceeds the maximum header length allowed by the validation rules configured', // too long
]

export const testDiff = `
diff --git a/src/cli.ts b/src/cli.ts
index 123..456 100644
--- a/src/cli.ts
+++ b/src/cli.ts
@@ -1,3 +1,4 @@
+import { newFeature } from './features'
 console.log('hello')
`
```

**Step 5: Create test utilities**

```typescript
// test/helpers/testUtils.ts
import type { Config } from '../../src/config'

export function createTestConfig(overrides: Partial<Config> = {}): Config {
	return {
		preset: 'conventional',
		scopeMode: 'single',
		defaults: { scope: '', includeBody: true },
		plugins: [],
		validation: {
			enabled: true,
			maxHeaderLength: 72,
			maxBodyLineLength: 100,
			requireScope: false,
			requireBody: false,
			requireIssue: false,
			noTrailingPeriod: true,
			noLeadingCapital: false,
			customRules: [],
		},
		ai: { enabled: false, provider: 'auto' },
		github: {
			enabled: true,
			scopeLabelPatterns: ['scope:', 'area:'],
			auto: { detectIssues: true, suggestReviewers: false },
		},
		...overrides,
	}
}

export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
```

**Step 6: Run tests to verify they pass**

Run: `bun test test/helpers/`
Expected: PASS

**Step 7: Commit**

```bash
git add test/helpers/
git commit -m "test: add test infrastructure (mocks, fixtures, utils)"
```

---

## Task 2: Validation Service Tests

**Files:**
- Create: `test/services/validation.test.ts`
- Reference: `src/services/validation.ts`

**Step 1: Write tests for parseCommitMessage**

```typescript
// test/services/validation.test.ts
import { describe, expect, test } from 'bun:test'
import { parseCommitMessage } from '../../src/services/validation'

describe('Validation Service', () => {
	describe('parseCommitMessage', () => {
		test('should parse conventional commit', () => {
			const result = parseCommitMessage('feat(cli): add new command')
			expect(result.type).toBe('feat')
			expect(result.scope).toBe('cli')
			expect(result.subject).toBe('add new command')
			expect(result.breaking).toBe(false)
		})

		test('should parse breaking change with !', () => {
			const result = parseCommitMessage('feat(api)!: redesign auth')
			expect(result.type).toBe('feat')
			expect(result.scope).toBe('api')
			expect(result.breaking).toBe(true)
		})

		test('should parse commit without scope', () => {
			const result = parseCommitMessage('docs: update README')
			expect(result.type).toBe('docs')
			expect(result.scope).toBeUndefined()
			expect(result.subject).toBe('update README')
		})

		test('should parse multi-line commit', () => {
			const msg = 'feat(cli): add command\n\nThis is the body\n\nBREAKING CHANGE: breaks stuff'
			const result = parseCommitMessage(msg)
			expect(result.body).toBe('This is the body')
			expect(result.breaking).toBe(true)
		})
	})
})
```

**Step 2: Run test to verify existing implementation**

Run: `bun test test/services/validation.test.ts`
Expected: PASS (implementation exists)

**Step 3: Write tests for validateCommitMessage**

```typescript
describe('validateCommitMessage', () => {
	test('should validate correct commit', async () => {
		const config = createTestConfig()
		const result = await validateCommitMessage('feat(cli): add command', config)
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	test('should reject invalid type', async () => {
		const config = createTestConfig()
		const result = await validateCommitMessage('invalid(cli): test', config)
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
	})

	test('should enforce maxHeaderLength', async () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 20,
				maxBodyLineLength: 100,
				requireScope: false,
				requireBody: false,
				requireIssue: false,
				noTrailingPeriod: true,
				noLeadingCapital: false,
				customRules: [],
			},
		})
		const result = await validateCommitMessage('feat(cli): this is way too long', config)
		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.message.includes('length'))).toBe(true)
	})

	test('should enforce requireScope', async () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 72,
				maxBodyLineLength: 100,
				requireScope: true,
				requireBody: false,
				requireIssue: false,
				noTrailingPeriod: true,
				noLeadingCapital: false,
				customRules: [],
			},
		})
		const result = await validateCommitMessage('feat: no scope here', config)
		expect(result.valid).toBe(false)
	})

	test('should enforce custom rules', async () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 72,
				maxBodyLineLength: 100,
				requireScope: false,
				requireBody: false,
				requireIssue: false,
				noTrailingPeriod: true,
				noLeadingCapital: false,
				customRules: [
					{
						name: 'no-wip',
						pattern: '\\bWIP\\b',
						message: 'No WIP commits',
						level: 'error',
						invert: true,
					},
				],
			},
		})
		const result = await validateCommitMessage('feat: WIP test', config)
		expect(result.valid).toBe(false)
	})
})
```

**Step 4: Run tests**

Run: `bun test test/services/validation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add test/services/validation.test.ts
git commit -m "test(validation): add comprehensive validation service tests"
```

---

## Task 3: Format Service Tests

**Files:**
- Create: `test/services/format.test.ts`
- Reference: `src/services/format.ts`

**Step 1: Write tests for FormatValidator**

```typescript
// test/services/format.test.ts
import { describe, expect, test } from 'bun:test'
import { FormatValidator, getPreset } from '../../src'

describe('Format Service', () => {
	describe('FormatValidator', () => {
		test('should validate conventional commit', () => {
			const preset = getPreset('conventional')
			const validator = new FormatValidator(preset)
			const result = validator.validate('feat(cli): add command')
			expect(result.valid).toBe(true)
		})

		test('should reject invalid type', () => {
			const preset = getPreset('conventional')
			const validator = new FormatValidator(preset)
			const result = validator.validate('invalid(cli): test')
			expect(result.valid).toBe(false)
		})

		test('should validate angular format', () => {
			const preset = getPreset('angular')
			const validator = new FormatValidator(preset)
			const result = validator.validate('feat(core): implement feature')
			expect(result.valid).toBe(true)
		})

		test('should validate gitmoji format', () => {
			const preset = getPreset('gitmoji')
			const validator = new FormatValidator(preset)
			const result = validator.validate('✨ add new feature')
			expect(result.valid).toBe(true)
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/services/format.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/services/format.test.ts
git commit -m "test(format): add format validation tests"
```

---

## Task 4: Template Service Tests

**Files:**
- Create: `test/services/template.test.ts`
- Reference: `src/services/template.ts`

**Step 1: Write tests for renderTemplate**

```typescript
// test/services/template.test.ts
import { describe, expect, test } from 'bun:test'
import { renderTemplate, buildFullMessage } from '../../src'

describe('Template Service', () => {
	describe('renderTemplate', () => {
		test('should render basic template', () => {
			const result = renderTemplate('{type}({scope}): {message}', {
				type: 'feat',
				scope: 'cli',
				message: 'add command',
			})
			expect(result).toBe('feat(cli): add command')
		})

		test('should handle missing scope', () => {
			const result = renderTemplate('{type}({scope}): {message}', {
				type: 'feat',
				message: 'add command',
			})
			expect(result).toBe('feat(): add command')
		})

		test('should render with emoji', () => {
			const result = renderTemplate('{emoji} {message}', {
				emoji: '✨',
				message: 'add feature',
			})
			expect(result).toBe('✨ add feature')
		})
	})

	describe('buildFullMessage', () => {
		test('should build message with body', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
				body: 'This adds a new endpoint',
			})
			expect(result).toContain('feat(api): add endpoint')
			expect(result).toContain('This adds a new endpoint')
		})

		test('should build message with breaking change', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'redesign auth',
				breaking: 'Changes API contract',
			})
			expect(result).toContain('BREAKING CHANGE:')
			expect(result).toContain('Changes API contract')
		})

		test('should build message with issue references', () => {
			const result = buildFullMessage({
				type: 'fix',
				message: 'resolve bug',
				issueRefs: [{ action: 'Closes', number: 42 }],
			})
			expect(result).toContain('Closes #42')
		})

		test('should build message with co-authors', () => {
			const result = buildFullMessage({
				type: 'feat',
				message: 'add feature',
				coauthors: ['Alice <alice@example.com>'],
			})
			expect(result).toContain('Co-authored-by: Alice <alice@example.com>')
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/services/template.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/services/template.test.ts
git commit -m "test(template): add template rendering tests"
```

---

## Task 5: Scope Service Tests

**Files:**
- Create: `test/services/scope.test.ts`
- Reference: `src/services/scope.ts`

**Step 1: Write tests for scope extraction**

```typescript
// test/services/scope.test.ts
import { describe, expect, test } from 'bun:test'
import { getScopesFromPaths, getScopesFromLabels, getScopesFromConfig } from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('Scope Service', () => {
	describe('getScopesFromPaths', () => {
		test('should extract scopes from file paths', () => {
			const config = createTestConfig({
				scopeMap: {
					'src/cli/**': 'cli',
					'src/api/**': 'api',
					'docs/**': 'docs',
				},
			})
			const scopes = getScopesFromPaths(['src/cli/index.ts'], config)
			expect(scopes).toContain('cli')
		})

		test('should handle multiple matching paths', () => {
			const config = createTestConfig({
				scopeMap: {
					'src/cli/**': 'cli',
					'src/api/**': 'api',
				},
			})
			const scopes = getScopesFromPaths(['src/cli/index.ts', 'src/api/routes.ts'], config)
			expect(scopes).toContain('cli')
			expect(scopes).toContain('api')
		})

		test('should return empty for no matches', () => {
			const config = createTestConfig({
				scopeMap: {
					'src/cli/**': 'cli',
				},
			})
			const scopes = getScopesFromPaths(['other/file.ts'], config)
			expect(scopes).toHaveLength(0)
		})
	})

	describe('getScopesFromLabels', () => {
		test('should extract scope from labels', () => {
			const config = createTestConfig()
			const scopes = getScopesFromLabels(['scope:cli', 'bug'], config)
			expect(scopes).toContain('cli')
		})

		test('should handle multiple scope labels', () => {
			const config = createTestConfig()
			const scopes = getScopesFromLabels(['scope:cli', 'area:api'], config)
			expect(scopes).toContain('cli')
			expect(scopes).toContain('api')
		})

		test('should use custom label patterns', () => {
			const config = createTestConfig({
				github: {
					enabled: true,
					scopeLabelPatterns: ['component:', 'module:'],
					auto: { detectIssues: true, suggestReviewers: false },
				},
			})
			const scopes = getScopesFromLabels(['component:auth'], config)
			expect(scopes).toContain('auth')
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/services/scope.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/services/scope.test.ts
git commit -m "test(scope): add scope extraction tests"
```

---

## Task 6: Co-author Service Tests

**Files:**
- Create: `test/services/coauthor.test.ts`
- Reference: `src/services/coauthor.ts`

**Step 1: Write tests for co-author parsing and formatting**

```typescript
// test/services/coauthor.test.ts
import { describe, expect, test } from 'bun:test'
import {
	parseCoAuthor,
	formatCoAuthor,
	formatCoAuthors,
	getCoAuthorsFromConfig,
} from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('Co-author Service', () => {
	describe('parseCoAuthor', () => {
		test('should parse name and email', () => {
			const result = parseCoAuthor('Alice Smith <alice@example.com>')
			expect(result?.name).toBe('Alice Smith')
			expect(result?.email).toBe('alice@example.com')
		})

		test('should handle various formats', () => {
			const result = parseCoAuthor('Bob<bob@example.com>')
			expect(result?.name).toBe('Bob')
			expect(result?.email).toBe('bob@example.com')
		})

		test('should return null for invalid format', () => {
			const result = parseCoAuthor('invalid')
			expect(result).toBeNull()
		})
	})

	describe('formatCoAuthor', () => {
		test('should format co-author line', () => {
			const result = formatCoAuthor('Alice', 'alice@example.com')
			expect(result).toBe('Co-authored-by: Alice <alice@example.com>')
		})
	})

	describe('formatCoAuthors', () => {
		test('should format multiple co-authors', () => {
			const result = formatCoAuthors([
				'Alice <alice@example.com>',
				'Bob <bob@example.com>',
			])
			expect(result).toContain('Co-authored-by: Alice <alice@example.com>')
			expect(result).toContain('Co-authored-by: Bob <bob@example.com>')
		})
	})

	describe('getCoAuthorsFromConfig', () => {
		test('should return co-authors from config', () => {
			const config = createTestConfig({
				coauthors: {
					alice: 'Alice Smith <alice@example.com>',
					bob: 'Bob Jones <bob@example.com>',
				},
			})
			const authors = getCoAuthorsFromConfig(config)
			expect(authors).toHaveLength(2)
			expect(authors.some(a => a.name === 'Alice Smith')).toBe(true)
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/services/coauthor.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/services/coauthor.test.ts
git commit -m "test(coauthor): add co-author service tests"
```

---

## Task 7: Configuration Tests

**Files:**
- Create: `test/config/index.test.ts`
- Reference: `src/config/index.ts`

**Step 1: Write tests for config loading and defaults**

```typescript
// test/config/index.test.ts
import { describe, expect, test } from 'bun:test'
import { getDefaultConfig, defineConfig } from '../../src'

describe('Configuration', () => {
	describe('getDefaultConfig', () => {
		test('should return default config', () => {
			const config = getDefaultConfig()
			expect(config.preset).toBe('conventional')
			expect(config.validation?.enabled).toBe(true)
			expect(config.github?.enabled).toBe(true)
		})

		test('should have validation defaults', () => {
			const config = getDefaultConfig()
			expect(config.validation?.maxHeaderLength).toBe(72)
			expect(config.validation?.maxBodyLineLength).toBe(100)
			expect(config.validation?.noTrailingPeriod).toBe(true)
		})
	})

	describe('defineConfig', () => {
		test('should define config with type safety', () => {
			const config = defineConfig({
				preset: 'angular',
				scopeMap: {
					'src/**': 'src',
				},
			})
			expect(config.preset).toBe('angular')
			expect(config.scopeMap?.['src/**']).toBe('src')
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/config/`
Expected: PASS

**Step 3: Commit**

```bash
git add test/config/
git commit -m "test(config): add configuration tests"
```

---

## Task 8: Preset Tests

**Files:**
- Create: `test/presets/index.test.ts`
- Reference: `src/presets/index.ts`

**Step 1: Write tests for preset loading**

```typescript
// test/presets/index.test.ts
import { describe, expect, test } from 'bun:test'
import { getPreset, listPresets, presets } from '../../src'

describe('Presets', () => {
	describe('listPresets', () => {
		test('should list all presets', () => {
			const list = listPresets()
			expect(list).toContain('conventional')
			expect(list).toContain('angular')
			expect(list).toContain('gitmoji')
		})
	})

	describe('getPreset', () => {
		test('should get conventional preset', () => {
			const preset = getPreset('conventional')
			expect(preset.name).toBe('Conventional Commits')
			expect(preset.types).toBeDefined()
			expect(preset.types.length).toBeGreaterThan(0)
		})

		test('should get angular preset', () => {
			const preset = getPreset('angular')
			expect(preset.name).toBe('Angular')
		})

		test('should get gitmoji preset', () => {
			const preset = getPreset('gitmoji')
			expect(preset.name).toBe('Gitmoji')
		})
	})

	describe('presets', () => {
		test('should have conventional types', () => {
			const types = presets.conventional.types.map(t => t.value)
			expect(types).toContain('feat')
			expect(types).toContain('fix')
			expect(types).toContain('docs')
			expect(types).toContain('style')
			expect(types).toContain('refactor')
			expect(types).toContain('perf')
			expect(types).toContain('test')
			expect(types).toContain('chore')
		})

		test('should have gitmoji types', () => {
			const types = presets.gitmoji.types
			expect(types.some(t => t.emoji === '✨')).toBe(true)
			expect(types.some(t => t.emoji === '🐛')).toBe(true)
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/presets/`
Expected: PASS

**Step 3: Commit**

```bash
git add test/presets/
git commit -m "test(presets): add preset tests"
```

---

## Task 9: README Example Tests - Basic Commit Flow

**Files:**
- Create: `test/examples/basic-commit.test.ts`

**Step 1: Write test for basic commit workflow**

```typescript
// test/examples/basic-commit.test.ts
import { describe, expect, test } from 'bun:test'
import { buildFullMessage, parseCommitMessage } from '../../src'

describe('README Examples - Basic Commit Flow', () => {
	test('should create basic feat commit', () => {
		const message = buildFullMessage({
			type: 'feat',
			scope: 'cli',
			message: 'add user authentication',
		})

		expect(message).toContain('feat(cli): add user authentication')

		const parsed = parseCommitMessage(message)
		expect(parsed.type).toBe('feat')
		expect(parsed.scope).toBe('cli')
		expect(parsed.subject).toBe('add user authentication')
	})

	test('should create fix commit', () => {
		const message = buildFullMessage({
			type: 'fix',
			scope: 'api',
			message: 'resolve timeout issue',
		})

		expect(message).toContain('fix(api): resolve timeout issue')
	})

	test('should create docs commit without scope', () => {
		const message = buildFullMessage({
			type: 'docs',
			message: 'update README',
		})

		expect(message).toContain('docs: update README')
	})
})
```

**Step 2: Run tests**

Run: `bun test test/examples/basic-commit.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/examples/basic-commit.test.ts
git commit -m "test(examples): add basic commit flow tests"
```

---

## Task 10: README Example Tests - Breaking Changes with Co-Authors

**Files:**
- Create: `test/examples/breaking-changes.test.ts`

**Step 1: Write test for breaking change with co-authors**

```typescript
// test/examples/breaking-changes.test.ts
import { describe, expect, test } from 'bun:test'
import { buildFullMessage, parseCommitMessage } from '../../src'

describe('README Examples - Breaking Changes', () => {
	test('should create breaking change commit', () => {
		const message = buildFullMessage({
			type: 'feat',
			scope: 'api',
			message: 'redesign authentication flow',
			breaking: 'JWT tokens now use RS256 instead of HS256.\nAll existing tokens will be invalidated.',
			coauthors: [
				'Alice Smith <alice@example.com>',
				'Bob Jones <bob@company.com>',
			],
		})

		expect(message).toContain('feat(api)!: redesign authentication flow')
		expect(message).toContain('BREAKING CHANGE: JWT tokens now use RS256')
		expect(message).toContain('Co-authored-by: Alice Smith <alice@example.com>')
		expect(message).toContain('Co-authored-by: Bob Jones <bob@company.com>')

		const parsed = parseCommitMessage(message)
		expect(parsed.breaking).toBe(true)
	})
})
```

**Step 2: Run tests**

Run: `bun test test/examples/breaking-changes.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/examples/breaking-changes.test.ts
git commit -m "test(examples): add breaking change tests"
```

---

## Task 11: README Example Tests - Validation

**Files:**
- Create: `test/examples/validation.test.ts`

**Step 1: Write tests for validation examples**

```typescript
// test/examples/validation.test.ts
import { describe, expect, test } from 'bun:test'
import { validateCommitMessage } from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('README Examples - Validation', () => {
	test('should validate correct message', async () => {
		const config = createTestConfig()
		const result = await validateCommitMessage('feat(cli): add new command', config)

		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	test('should reject invalid type', async () => {
		const config = createTestConfig()
		const result = await validateCommitMessage('feature(cli): Add new command.', config)

		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
	})

	test('should warn about subject case', async () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 72,
				maxBodyLineLength: 100,
				requireScope: false,
				requireBody: false,
				requireIssue: false,
				noTrailingPeriod: true,
				noLeadingCapital: true,
				customRules: [],
			},
		})
		const result = await validateCommitMessage('feat(cli): Add command', config)

		expect(result.valid).toBe(false)
	})

	test('should reject trailing period', async () => {
		const config = createTestConfig()
		const result = await validateCommitMessage('feat(cli): add command.', config)

		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.message.includes('period'))).toBe(true)
	})
})
```

**Step 2: Run tests**

Run: `bun test test/examples/validation.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/examples/validation.test.ts
git commit -m "test(examples): add validation example tests"
```

---

## Task 12: README Example Tests - Custom Validation Rules

**Files:**
- Create: `test/examples/custom-rules.test.ts`

**Step 1: Write tests for custom validation rules**

```typescript
// test/examples/custom-rules.test.ts
import { describe, expect, test } from 'bun:test'
import { validateCommitMessage } from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('README Examples - Custom Validation Rules', () => {
	test('should enforce no-wip rule', async () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 72,
				maxBodyLineLength: 100,
				requireScope: false,
				requireBody: false,
				requireIssue: false,
				noTrailingPeriod: true,
				noLeadingCapital: false,
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

		const result = await validateCommitMessage('feat(cli): WIP add command', config)
		expect(result.valid).toBe(false)
		expect(result.errors.some(e => e.message.includes('WIP'))).toBe(true)
	})

	test('should require JIRA ticket', async () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 72,
				maxBodyLineLength: 100,
				requireScope: false,
				requireBody: false,
				requireIssue: false,
				noTrailingPeriod: true,
				noLeadingCapital: false,
				customRules: [
					{
						name: 'require-ticket',
						pattern: 'JIRA-\\d+',
						message: 'Must reference a JIRA ticket',
						level: 'error',
						invert: false,
					},
				],
			},
		})

		const valid = await validateCommitMessage('feat(cli): add command JIRA-123', config)
		expect(valid.valid).toBe(true)

		const invalid = await validateCommitMessage('feat(cli): add command', config)
		expect(invalid.valid).toBe(false)
	})
})
```

**Step 2: Run tests**

Run: `bun test test/examples/custom-rules.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/examples/custom-rules.test.ts
git commit -m "test(examples): add custom validation rule tests"
```

---

## Task 13: README Example Tests - Programmatic API

**Files:**
- Create: `test/examples/programmatic-api.test.ts`

**Step 1: Write tests for all programmatic API examples from README**

```typescript
// test/examples/programmatic-api.test.ts
import { describe, expect, test } from 'bun:test'
import {
	FormatValidator,
	getPreset,
	parseCommitMessage,
	renderTemplate,
	buildFullMessage,
	getScopesFromPaths,
	getScopesFromLabels,
	parseCoAuthor,
	formatCoAuthor,
	getCoAuthorsFromConfig,
	getDefaultConfig,
	defineConfig,
	listPresets,
} from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('README Examples - Programmatic API', () => {
	describe('Format Service API', () => {
		test('should use FormatValidator', () => {
			const preset = getPreset('conventional')
			const validator = new FormatValidator(preset)
			const result = validator.validate('feat(cli): add command')
			expect(result.valid).toBe(true)
		})
	})

	describe('Validation Service API', () => {
		test('should parse commit message', () => {
			const parsed = parseCommitMessage('feat(cli): add command')
			expect(parsed.type).toBe('feat')
			expect(parsed.scope).toBe('cli')
			expect(parsed.subject).toBe('add command')
		})
	})

	describe('Template Service API', () => {
		test('should render template', () => {
			const header = renderTemplate('{type}({scope}): {message}', {
				type: 'feat',
				scope: 'cli',
				message: 'add command',
			})
			expect(header).toBe('feat(cli): add command')
		})

		test('should build full message', () => {
			const full = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
				body: 'Implements new endpoint',
				breaking: 'Changes API contract',
				issueRefs: [{ action: 'Closes', number: 42 }],
				coauthors: ['Alice <alice@example.com>'],
			})
			expect(full).toContain('feat(api): add endpoint')
			expect(full).toContain('Implements new endpoint')
			expect(full).toContain('BREAKING CHANGE: Changes API contract')
			expect(full).toContain('Closes #42')
			expect(full).toContain('Co-authored-by: Alice <alice@example.com>')
		})
	})

	describe('Scope Service API', () => {
		test('should get scopes from paths', () => {
			const config = createTestConfig({
				scopeMap: {
					'src/cli/**': 'cli',
					'src/api/**': 'api',
				},
			})
			const scopes = getScopesFromPaths(['src/cli/index.ts'], config)
			expect(scopes).toContain('cli')
		})

		test('should get scopes from labels', () => {
			const config = createTestConfig()
			const scopes = getScopesFromLabels(['scope:cli', 'area:core'], config)
			expect(scopes).toContain('cli')
			expect(scopes).toContain('core')
		})
	})

	describe('Co-author Service API', () => {
		test('should parse co-author', () => {
			const parsed = parseCoAuthor('Alice <alice@example.com>')
			expect(parsed?.name).toBe('Alice')
			expect(parsed?.email).toBe('alice@example.com')
		})

		test('should format co-author', () => {
			const formatted = formatCoAuthor('Alice', 'alice@example.com')
			expect(formatted).toBe('Co-authored-by: Alice <alice@example.com>')
		})

		test('should get co-authors from config', () => {
			const config = createTestConfig({
				coauthors: {
					alice: 'Alice Smith <alice@example.com>',
				},
			})
			const authors = getCoAuthorsFromConfig(config)
			expect(authors.length).toBeGreaterThan(0)
		})
	})

	describe('Configuration Service API', () => {
		test('should get default config', () => {
			const defaults = getDefaultConfig()
			expect(defaults.preset).toBe('conventional')
		})

		test('should define config', () => {
			const config = defineConfig({
				preset: 'conventional',
				scopeMap: { 'src/**': 'src' },
			})
			expect(config.preset).toBe('conventional')
		})
	})

	describe('Preset Service API', () => {
		test('should list presets', () => {
			const names = listPresets()
			expect(names).toContain('conventional')
			expect(names).toContain('angular')
			expect(names).toContain('gitmoji')
		})

		test('should get preset', () => {
			const preset = getPreset('conventional')
			expect(preset.name).toBe('Conventional Commits')
			expect(preset.types.length).toBeGreaterThan(0)
		})
	})
})
```

**Step 2: Run tests**

Run: `bun test test/examples/programmatic-api.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/examples/programmatic-api.test.ts
git commit -m "test(examples): add programmatic API tests"
```

---

## Task 14: README Example Tests - Scope Mapping

**Files:**
- Create: `test/examples/scope-mapping.test.ts`

**Step 1: Write tests for scope mapping examples**

```typescript
// test/examples/scope-mapping.test.ts
import { describe, expect, test } from 'bun:test'
import { getScopesFromPaths } from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('README Examples - Scope Mapping', () => {
	test('should map file paths to scopes', () => {
		const config = createTestConfig({
			scopeMap: {
				'src/api/**': 'api',
				'src/components/**': 'ui',
				'docs/**': 'docs',
			},
		})

		expect(getScopesFromPaths(['src/api/routes.ts'], config)).toContain('api')
		expect(getScopesFromPaths(['src/components/Button.tsx'], config)).toContain('ui')
		expect(getScopesFromPaths(['docs/README.md'], config)).toContain('docs')
	})

	test('should handle monorepo structure', () => {
		const config = createTestConfig({
			scopeMap: {
				'packages/core/**': 'core',
				'packages/cli/**': 'cli',
				'packages/web/**': 'web',
				'packages/api/**': 'api',
			},
		})

		const scopes = getScopesFromPaths([
			'packages/core/src/index.ts',
			'packages/cli/src/commands.ts',
		], config)

		expect(scopes).toContain('core')
		expect(scopes).toContain('cli')
	})
})
```

**Step 2: Run tests**

Run: `bun test test/examples/scope-mapping.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add test/examples/scope-mapping.test.ts
git commit -m "test(examples): add scope mapping tests"
```

---

## Task 15: Update Existing Test and Clean Up

**Files:**
- Modify: `test/index.test.ts`
- Remove placeholder test

**Step 1: Remove placeholder test**

```typescript
// test/index.test.ts
import { expect, test } from 'bun:test'

test('placeholder test can be removed', () => {
	expect(true).toBe(true)
})
```

**Step 2: Run all tests**

Run: `bun test`
Expected: All tests PASS

**Step 3: Check test coverage**

Run: `bun test --coverage`
Expected: Coverage report showing good coverage

**Step 4: Commit**

```bash
git add test/
git commit -m "test: complete comprehensive test suite for README examples"
```

---

## Task 16: Add Test Documentation

**Files:**
- Create: `test/README.md`

**Step 1: Write test documentation**

```markdown
# Test Suite

Comprehensive tests for commit-it covering all README examples and core functionality.

## Structure

- `helpers/` - Test utilities, mocks, and fixtures
- `services/` - Unit tests for all services
- `config/` - Configuration loading tests
- `presets/` - Preset tests
- `examples/` - Tests verifying README examples work correctly

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/services/validation.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Test Coverage

Tests cover:
- ✅ All validation rules
- ✅ All commit message formats (conventional, angular, gitmoji)
- ✅ Template rendering and message building
- ✅ Scope extraction from paths and labels
- ✅ Co-author parsing and formatting
- ✅ Configuration loading and defaults
- ✅ All preset types
- ✅ All README examples
- ✅ Complete programmatic API

## Mocking Strategy

External dependencies are mocked:
- Git operations (via mockGitService)
- GitHub CLI (via mockGitHubService)
- AI providers (via mockAI)

This ensures tests are:
- Fast (no external calls)
- Reliable (no network dependencies)
- Isolated (each test independent)
```

**Step 2: Commit**

```bash
git add test/README.md
git commit -m "docs(test): add test suite documentation"
```

---

## Completion Checklist

- [x] Test infrastructure (mocks, fixtures, utils)
- [x] Validation service tests
- [x] Format service tests
- [x] Template service tests
- [x] Scope service tests
- [x] Co-author service tests
- [x] Configuration tests
- [x] Preset tests
- [x] Basic commit flow tests
- [x] Breaking changes tests
- [x] Validation example tests
- [x] Custom rules tests
- [x] Programmatic API tests
- [x] Scope mapping tests
- [x] Test documentation

**Success Criteria:**
- All tests pass
- Coverage > 80%
- All README examples have corresponding tests
- All exported APIs tested
