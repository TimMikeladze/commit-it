import { describe, expect, test } from 'bun:test'
import type { Preset } from '../../src'
import {
	buildFullMessage,
	DEFAULT_TEMPLATES,
	FormatValidator,
	getPreset,
	listPresets,
	parseCommitMessage,
	renderTemplate,
	validateCommitMessage,
} from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('Custom Commit Message Formats', () => {
	describe('renderTemplate - custom templates', () => {
		test('should render a simple custom template without scope delimiters', () => {
			const template = '{{type}}: {{message}}'
			const result = renderTemplate(template, {
				type: 'add',
				message: 'new login page',
			})
			expect(result).toBe('add: new login page')
		})

		test('should render template with bracket-style scope', () => {
			const template = '{{type}}{{#scope}}[{{scope}}]{{/scope}}: {{message}}'
			const result = renderTemplate(template, {
				type: 'fix',
				scope: 'auth',
				message: 'token refresh',
			})
			expect(result).toBe('fix[auth]: token refresh')
		})

		test('should render template with bracket scope omitted when no scope', () => {
			const template = '{{type}}{{#scope}}[{{scope}}]{{/scope}}: {{message}}'
			const result = renderTemplate(template, {
				type: 'fix',
				message: 'token refresh',
			})
			expect(result).toBe('fix: token refresh')
		})

		test('should render template with ticket-prefix style', () => {
			// e.g. "[PROJ-123] add login page"
			const template = '[{{type}}] {{message}}'
			const result = renderTemplate(template, {
				type: 'PROJ-123',
				message: 'add login page',
			})
			expect(result).toBe('[PROJ-123] add login page')
		})

		test('should render template with emoji prefix', () => {
			const template = '{{type}} {{message}}'
			const result = renderTemplate(template, {
				type: '🚀',
				message: 'deploy to production',
			})
			expect(result).toBe('🚀 deploy to production')
		})

		test('should render template with scope-first format', () => {
			const template = '{{#scope}}{{scope}}: {{/scope}}{{type}} {{message}}'
			const result = renderTemplate(template, {
				type: 'feat',
				scope: 'auth',
				message: 'add OAuth',
			})
			expect(result).toBe('auth: feat add OAuth')
		})

		test('should render template with no type at all (message only)', () => {
			const template = '{{message}}'
			const result = renderTemplate(template, {
				type: '',
				message: 'quick fix for login bug',
			})
			expect(result).toBe('quick fix for login bug')
		})

		test('should render template with all conditional sections', () => {
			const template =
				'{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}'
			const result = renderTemplate(template, {
				type: 'feat',
				scope: 'api',
				message: 'redesign endpoints',
				breaking: 'yes',
			})
			expect(result).toBe('feat(api)!: redesign endpoints')
		})

		test('should skip missing conditional sections', () => {
			const template =
				'{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}'
			const result = renderTemplate(template, {
				type: 'fix',
				message: 'typo',
			})
			expect(result).toBe('fix: typo')
		})
	})

	describe('buildFullMessage - custom template parameter', () => {
		test('should use custom template when provided', () => {
			const customTemplate = '{{type}} | {{message}}'
			const result = buildFullMessage(
				{ type: 'add', message: 'new feature' },
				customTemplate,
			)
			expect(result).toBe('add | new feature')
		})

		test('should fall back to conventional template when no template given', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'cli',
				message: 'add command',
			})
			expect(result).toBe('feat(cli): add command')
		})

		test('should use custom template with body and footer', () => {
			const customTemplate = '[{{type}}] {{message}}'
			const result = buildFullMessage(
				{
					type: 'PROJ-42',
					message: 'implement caching',
					body: 'Added Redis-based caching layer',
					issues: 'Closes #42',
				},
				customTemplate,
			)
			expect(result).toContain('[PROJ-42] implement caching')
			expect(result).toContain('Added Redis-based caching layer')
			expect(result).toContain('Closes #42')
		})

		test('should use custom template with co-authors', () => {
			const customTemplate = '{{type}}: {{message}}'
			const result = buildFullMessage(
				{
					type: 'add',
					message: 'pair programming feature',
					coauthors: 'Co-authored-by: Alice <alice@example.com>',
				},
				customTemplate,
			)
			expect(result).toContain('add: pair programming feature')
			expect(result).toContain('Co-authored-by: Alice')
		})

		test('should use custom template with breaking change', () => {
			const customTemplate =
				'{{type}}{{#breaking}} BREAKING{{/breaking}}: {{message}}'
			const result = buildFullMessage(
				{
					type: 'change',
					message: 'new API format',
					breaking: 'Response shape changed',
				},
				customTemplate,
			)
			expect(result).toContain('change BREAKING: new API format')
			expect(result).toContain('BREAKING CHANGE: Response shape changed')
		})
	})

	describe('DEFAULT_TEMPLATES', () => {
		test('should have conventional template', () => {
			expect(DEFAULT_TEMPLATES.conventional).toBeDefined()
			expect(DEFAULT_TEMPLATES.conventional).toContain('{{type}}')
			expect(DEFAULT_TEMPLATES.conventional).toContain('{{message}}')
		})

		test('should have gitmoji template', () => {
			expect(DEFAULT_TEMPLATES.gitmoji).toBeDefined()
			expect(DEFAULT_TEMPLATES.gitmoji).toContain('{{type}}')
		})

		test('conventional template should produce standard format', () => {
			const template = DEFAULT_TEMPLATES.conventional as string
			const result = renderTemplate(template, {
				type: 'feat',
				scope: 'cli',
				message: 'add command',
			})
			expect(result).toBe('feat(cli): add command')
		})

		test('gitmoji template should produce emoji format', () => {
			const template = DEFAULT_TEMPLATES.gitmoji as string
			const result = renderTemplate(template, {
				type: '✨',
				message: 'add feature',
			})
			expect(result).toBe('✨ add feature')
		})
	})

	describe('getPreset - built-in presets', () => {
		test('should return conventional preset', () => {
			const preset = getPreset('conventional')
			expect(preset.name).toBe('Conventional Commits')
			expect(preset.types.length).toBeGreaterThan(0)
			expect(preset.validator).toBeInstanceOf(Function)
		})

		test('should return gitmoji preset', () => {
			const preset = getPreset('gitmoji')
			expect(preset.name).toBe('Gitmoji')
			expect(preset.types.length).toBeGreaterThan(0)
		})

		test('should throw on unknown preset', () => {
			expect(() => getPreset('angular')).toThrow('Unknown preset: angular')
		})

		test('should list available presets', () => {
			const presets = listPresets()
			expect(presets).toContain('conventional')
			expect(presets).toContain('gitmoji')
		})
	})

	describe('FormatValidator - custom preset types', () => {
		test('should validate custom types', () => {
			const customPreset: Preset = {
				name: 'Custom',
				template: '{type}: {message}',
				types: [
					{ value: 'add', desc: 'Add a new feature' },
					{ value: 'change', desc: 'Change existing behavior' },
					{ value: 'remove', desc: 'Remove a feature' },
					{ value: 'fix', desc: 'Fix a bug' },
				],
				validator: (msg) => /^(add|change|remove|fix): .+/.test(msg),
			}
			const validator = new FormatValidator(customPreset)

			expect(validator.validateType('add')).toBe(true)
			expect(validator.validateType('change')).toBe(true)
			expect(validator.validateType('remove')).toBe(true)
			expect(validator.validateType('feat')).toBe(false)
			expect(validator.validateType('refactor')).toBe(false)
		})

		test('should validate messages with custom validator', () => {
			const customPreset: Preset = {
				name: 'Simple',
				template: '{type}: {message}',
				types: [
					{ value: 'new', desc: 'New thing' },
					{ value: 'fix', desc: 'Fix thing' },
				],
				validator: (msg) => /^(new|fix): .+/.test(msg),
			}
			const validator = new FormatValidator(customPreset)

			expect(validator.validateMessage('new: added login').valid).toBe(true)
			expect(validator.validateMessage('fix: typo in header').valid).toBe(true)
			expect(validator.validateMessage('feat: something').valid).toBe(false)
			expect(validator.validateMessage('random text').valid).toBe(false)
		})

		test('should validate custom scopes', () => {
			const customPreset: Preset = {
				name: 'Scoped',
				template: '{type}({scope}): {message}',
				types: [{ value: 'task', desc: 'A task' }],
				scopes: ['frontend', 'backend', 'infra'],
				validator: (msg) => /^task(\([^)]+\))?: .+/.test(msg),
			}
			const validator = new FormatValidator(customPreset)

			expect(validator.validateScope('frontend')).toBe(true)
			expect(validator.validateScope('backend')).toBe(true)
			expect(validator.validateScope('mobile')).toBe(false)
		})

		test('should accept any scope when preset has no scopes', () => {
			const customPreset: Preset = {
				name: 'Unscoped',
				template: '{type}: {message}',
				types: [{ value: 'do', desc: 'Do something' }],
				validator: (msg) => /^do: .+/.test(msg),
			}
			const validator = new FormatValidator(customPreset)

			expect(validator.validateScope('anything')).toBe(true)
			expect(validator.validateScope('')).toBe(true)
		})
	})

	describe('validation with allowedTypes - restricting to custom types', () => {
		test('should allow only custom types via allowedTypes config', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					allowedTypes: ['add', 'change', 'remove', 'fix'],
				},
			})

			const valid = validateCommitMessage(
				'add(auth): login flow',
				config.validation,
			)
			expect(valid.valid).toBe(true)

			const invalid = validateCommitMessage(
				'feat(auth): login flow',
				config.validation,
			)
			expect(invalid.valid).toBe(false)
			expect(invalid.errors.some((e) => e.rule === 'type-enum')).toBe(true)
		})

		test('should allow custom single-word types', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					allowedTypes: ['feature', 'bugfix', 'hotfix', 'release'],
				},
			})

			expect(
				validateCommitMessage('feature(ui): dark mode', config.validation)
					.valid,
			).toBe(true)
			expect(
				validateCommitMessage('bugfix(api): null check', config.validation)
					.valid,
			).toBe(true)
			expect(
				validateCommitMessage('feat(ui): dark mode', config.validation).valid,
			).toBe(false)
		})
	})

	describe('validation with custom regex rules for format enforcement', () => {
		test('should enforce a custom format via regex', () => {
			// Enforce "CATEGORY: message" format where CATEGORY is uppercase
			const config = createTestConfig({
				validation: {
					enabled: true,
					customRules: [
						{
							name: 'uppercase-category',
							pattern: '^[A-Z]+: .+',
							message:
								'Message must start with UPPERCASE category (e.g., FEATURE: add login)',
							level: 'error',
							invert: false,
						},
					],
				},
			})

			expect(
				validateCommitMessage('FEATURE: add login', config.validation).valid,
			).toBe(true)
			expect(
				validateCommitMessage('FIX: resolve crash', config.validation).valid,
			).toBe(true)
			expect(
				validateCommitMessage('feat: add login', config.validation).valid,
			).toBe(false) // lowercase 'feat' doesn't match ^[A-Z]+: .+
		})

		test('should enforce Angular-style format via regex', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					allowedTypes: [
						'build',
						'ci',
						'docs',
						'feat',
						'fix',
						'perf',
						'refactor',
						'test',
					],
					customRules: [
						{
							name: 'angular-format',
							pattern:
								'^(build|ci|docs|feat|fix|perf|refactor|test)(\\([^)]+\\))?: .+',
							message: 'Must follow Angular commit format',
							level: 'error',
							invert: false,
						},
					],
				},
			})

			expect(
				validateCommitMessage('feat(core): add parser', config.validation)
					.valid,
			).toBe(true)
			expect(
				validateCommitMessage('fix: resolve issue', config.validation).valid,
			).toBe(true)
			expect(
				validateCommitMessage('chore: update deps', config.validation).valid,
			).toBe(false) // chore not in allowedTypes
		})

		test('should enforce simple "message only" format (no type)', () => {
			// Some teams just want freeform messages with length limits
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 50,
					noTrailingPeriod: true,
					customRules: [
						{
							name: 'no-empty-message',
							pattern: '.{10,}',
							message: 'Message must be at least 10 characters',
							level: 'error',
							invert: false,
						},
					],
				},
			})

			expect(
				validateCommitMessage(
					'Add user authentication to the login page',
					config.validation,
				).valid,
			).toBe(true)
			expect(validateCommitMessage('fix bug', config.validation).valid).toBe(
				false,
			) // too short
		})
	})

	describe('round-trip: custom template -> parse', () => {
		test('should round-trip conventional format', () => {
			const message = buildFullMessage({
				type: 'feat',
				scope: 'cli',
				message: 'add command',
				body: 'Detailed description',
			})
			const parsed = parseCommitMessage(message)

			expect(parsed.type).toBe('feat')
			expect(parsed.scope).toBe('cli')
			expect(parsed.subject).toBe('add command')
			expect(parsed.body).toBe('Detailed description')
		})

		test('parseCommitMessage handles non-conventional format gracefully', () => {
			// A custom format like "[PROJ-42] add feature" won't parse into type/scope
			const parsed = parseCommitMessage('[PROJ-42] add feature')
			expect(parsed.type).toBe('')
			expect(parsed.scope).toBeUndefined()
			expect(parsed.subject).toBe('[PROJ-42] add feature')
		})

		test('parseCommitMessage handles emoji format', () => {
			const parsed = parseCommitMessage('✨ add dark mode')
			expect(parsed.type).toBe('')
			expect(parsed.subject).toBe('✨ add dark mode')
		})
	})

	describe('config template field exists but is not wired to commit flow', () => {
		test('config schema accepts a template string', () => {
			const config = createTestConfig({
				template: '{{type}} - {{message}}',
			})
			expect(config.template).toBe('{{type}} - {{message}}')
		})

		test('buildFullMessage uses template param, not config', () => {
			// This documents the current behavior: buildFullMessage uses its
			// second parameter, not the config's template field. The config
			// template must be explicitly passed through.
			const customTemplate = '{{type}} >> {{message}}'
			const result = buildFullMessage(
				{ type: 'add', message: 'feature' },
				customTemplate,
			)
			expect(result).toBe('add >> feature')

			// Without passing template, falls back to conventional
			const defaultResult = buildFullMessage({
				type: 'add',
				message: 'feature',
			})
			expect(defaultResult).toBe('add: feature')
		})
	})
})
