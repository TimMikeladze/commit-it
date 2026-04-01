import { describe, expect, test } from 'bun:test'
import {
	buildFullMessage,
	DEFAULT_TEMPLATES,
	directCommit,
	FormatValidator,
	formatCoAuthor,
	getCoAuthorsFromConfig,
	getDefaultConfig,
	getPreset,
	getScopesFromConfig,
	getScopesFromLabels,
	getScopesFromPaths,
	listPresets,
	parseCoAuthor,
	parseCommitMessage,
	presets,
	renderTemplate,
} from '../../src'
import type { Label } from '../../src/services/github'

describe('README Examples - Programmatic API', () => {
	describe('FormatValidator', () => {
		test('should validate commit format', () => {
			const preset = getPreset('conventional')
			const validator = new FormatValidator(preset)

			const result = validator.validateMessage('feat(cli): add command')
			expect(result.valid).toBe(true)
		})

		test('should reject invalid format', () => {
			const preset = getPreset('conventional')
			const validator = new FormatValidator(preset)

			const result = validator.validateMessage('invalid message')
			expect(result.valid).toBe(false)
		})

		test('should validate type', () => {
			const preset = getPreset('conventional')
			const validator = new FormatValidator(preset)

			expect(validator.validateType('feat')).toBe(true)
			expect(validator.validateType('invalid')).toBe(false)
		})
	})

	describe('parseCommitMessage', () => {
		test('should parse full commit message', () => {
			const parsed = parseCommitMessage('feat(cli): add command')
			expect(parsed.type).toBe('feat')
			expect(parsed.scope).toBe('cli')
			expect(parsed.subject).toBe('add command')
		})

		test('should parse commit with body and footer', () => {
			const message =
				'feat(api): add endpoint\n\nImplements new endpoint\n\nCloses #42'
			const parsed = parseCommitMessage(message)
			expect(parsed.type).toBe('feat')
			expect(parsed.body).toContain('Implements new endpoint')
			expect(parsed.issues).toHaveLength(1)
			expect(parsed.issues[0]).toBe(42)
		})
	})

	describe('renderTemplate', () => {
		test('should render template with variables', () => {
			const header = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}',
				{
					type: 'feat',
					scope: 'cli',
					message: 'add command',
				},
			)
			expect(header).toBe('feat(cli): add command')
		})

		test('should handle missing scope', () => {
			const header = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}',
				{
					type: 'docs',
					message: 'update README',
				},
			)
			expect(header).toBe('docs: update README')
		})
	})

	describe('buildFullMessage', () => {
		test('should build complete message', () => {
			const full = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
				body: 'Implements new endpoint',
				breaking: 'Changes API contract',
				issues: 'Closes #42',
				coauthors: 'Co-authored-by: Alice <alice@example.com>',
			})

			expect(full).toContain('feat(api)!: add endpoint')
			expect(full).toContain('Implements new endpoint')
			expect(full).toContain('BREAKING CHANGE: Changes API contract')
			expect(full).toContain('Closes #42')
			expect(full).toContain('Co-authored-by: Alice <alice@example.com>')
		})

		test('should build minimal message', () => {
			const message = buildFullMessage({
				type: 'fix',
				message: 'resolve bug',
			})
			expect(message).toContain('fix: resolve bug')
		})
	})

	describe('getScopesFromConfig (path mapping)', () => {
		test('should extract scopes from file paths', () => {
			const scopes = getScopesFromConfig(
				['src/cli/index.ts', 'src/api/users.ts'],
				{
					'src/cli/**': 'cli',
					'src/api/**': 'api',
				},
			)
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'api'])
		})

		test('should deduplicate scopes', () => {
			const scopes = getScopesFromConfig(
				['src/cli/index.ts', 'src/cli/commands.ts'],
				{
					'src/cli/**': 'cli',
				},
			)
			expect(scopes.map((s) => s.value)).toEqual(['cli'])
		})
	})

	describe('getScopesFromPaths (deprecated)', () => {
		test('should return empty (deprecated, use scopeMap config instead)', () => {
			const scopes = getScopesFromPaths([
				'src/cli/index.ts',
				'src/api/users.ts',
			])
			expect(scopes).toHaveLength(0)
		})
	})

	describe('getScopesFromLabels', () => {
		test('should extract scopes from labels', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'area:api', color: '00ff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:', 'area:'])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'api'])
		})

		test('should handle multiple patterns', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'component:ui', color: '00ff00' },
				{ name: 'feature', color: '0000ff' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:', 'component:'])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'ui'])
		})
	})

	describe('parseCoAuthor', () => {
		test('should parse co-author string', () => {
			const parsed = parseCoAuthor('Alice <alice@example.com>')
			expect(parsed).toEqual({
				name: 'Alice',
				email: 'alice@example.com',
				source: 'manual',
			})
		})

		test('should handle full names', () => {
			const parsed = parseCoAuthor('Alice Smith <alice@example.com>')
			expect(parsed?.name).toBe('Alice Smith')
			expect(parsed?.email).toBe('alice@example.com')
		})
	})

	describe('formatCoAuthor', () => {
		test('should format co-author', () => {
			const formatted = formatCoAuthor({
				name: 'Alice',
				email: 'alice@example.com',
				source: 'manual',
			})
			expect(formatted).toBe('Co-authored-by: Alice <alice@example.com>')
		})
	})

	describe('getCoAuthorsFromConfig', () => {
		test('should get co-authors from config', () => {
			const authors = getCoAuthorsFromConfig({
				alice: 'Alice <alice@example.com>',
				bob: 'Bob <bob@example.com>',
			})
			expect(authors).toHaveLength(2)
			expect(authors[0]?.name).toBe('Alice')
			expect(authors[1]?.name).toBe('Bob')
		})
	})

	describe('getDefaultConfig', () => {
		test('should return default config', () => {
			const config = getDefaultConfig()
			expect(config).toBeDefined()
			expect(config.preset).toBe('conventional')
			expect(config.validation).toBeDefined()
		})
	})

	describe('listPresets', () => {
		test('should list all presets', () => {
			const names = listPresets()
			expect(names).toContain('conventional')
			expect(names).toContain('gitmoji')
		})
	})

	describe('getPreset', () => {
		test('should get conventional preset', () => {
			const preset = getPreset('conventional')
			expect(preset.name).toBe('Conventional Commits')
			expect(preset.types).toBeDefined()
			expect(preset.types.length).toBeGreaterThan(0)
		})

		test('should get gitmoji preset', () => {
			const preset = getPreset('gitmoji')
			expect(preset.name).toBe('Gitmoji')
			expect(preset.types).toBeDefined()
		})
	})

	describe('presets object', () => {
		test('should access presets directly', () => {
			expect(presets.conventional).toBeDefined()
			expect(presets.gitmoji).toBeDefined()
		})
	})

	describe('DEFAULT_TEMPLATES', () => {
		test('should have default templates', () => {
			expect(DEFAULT_TEMPLATES).toBeDefined()
			expect(DEFAULT_TEMPLATES.conventional).toBeDefined()
			expect(DEFAULT_TEMPLATES.gitmoji).toBeDefined()
		})
	})

	describe('directCommit', () => {
		test('should include breakingDescription in the commit message', async () => {
			const result = await directCommit({
				type: 'feat',
				message: 'change api',
				breaking: true,
				breakingDescription: 'removed endpoint',
				dryRun: true,
			})

			expect(result.hash).toBe('dry-run')
			expect(result.message).toContain('feat!: change api')
			expect(result.message).toContain('BREAKING CHANGE: removed endpoint')
		})

		test('should fall back to default breaking description when breakingDescription is not provided', async () => {
			const result = await directCommit({
				type: 'feat',
				message: 'change api',
				breaking: true,
				dryRun: true,
			})

			expect(result.hash).toBe('dry-run')
			expect(result.message).toContain('feat!: change api')
			expect(result.message).toContain('BREAKING CHANGE: breaking change')
		})

		test('should include issueRefs in the commit message', async () => {
			const result = await directCommit({
				type: 'fix',
				message: 'bug',
				issueRefs: [{ action: 'Closes', number: 42 }],
				dryRun: true,
			})

			expect(result.hash).toBe('dry-run')
			expect(result.message).toContain('fix: bug')
			expect(result.message).toContain('Closes #42')
		})

		test('should include multiple issueRefs in the commit message', async () => {
			const result = await directCommit({
				type: 'fix',
				message: 'resolve multiple issues',
				issueRefs: [
					{ action: 'Closes', number: 42 },
					{ action: 'Fixes', number: 99 },
				],
				dryRun: true,
			})

			expect(result.hash).toBe('dry-run')
			expect(result.message).toContain('Closes #42')
			expect(result.message).toContain('Fixes #99')
		})

		test('should include both breakingDescription and issueRefs together', async () => {
			const result = await directCommit({
				type: 'feat',
				message: 'overhaul api',
				breaking: true,
				breakingDescription: 'endpoints renamed',
				issueRefs: [{ action: 'Closes', number: 15 }],
				dryRun: true,
			})

			expect(result.hash).toBe('dry-run')
			expect(result.message).toContain('feat!: overhaul api')
			expect(result.message).toContain('BREAKING CHANGE: endpoints renamed')
			expect(result.message).toContain('Closes #15')
		})
	})
})
