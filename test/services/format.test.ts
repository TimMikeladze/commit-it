import { describe, expect, test } from 'bun:test'
import { FormatValidator, getPreset } from '../../src'

describe('Format Service', () => {
	describe('FormatValidator', () => {
		describe('validateMessage', () => {
			test('should validate conventional commit', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('feat(cli): add command')
				expect(result.valid).toBe(true)
				expect(result.error).toBeUndefined()
			})

			test('should reject invalid type in conventional', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('invalid(cli): test')
				expect(result.valid).toBe(false)
				expect(result.error).toBe(
					'Message does not match Conventional Commits format',
				)
			})

			test('should validate conventional commit without scope', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('fix: resolve bug')
				expect(result.valid).toBe(true)
			})

			test('should validate angular format', () => {
				const preset = getPreset('angular')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage(
					'feat(core): implement feature',
				)
				expect(result.valid).toBe(true)
			})

			test('should reject invalid type in angular', () => {
				const preset = getPreset('angular')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('chore(core): update deps')
				expect(result.valid).toBe(false)
				expect(result.error).toBe('Message does not match Angular Style format')
			})

			test('should validate angular commit without scope', () => {
				const preset = getPreset('angular')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('docs: update README')
				expect(result.valid).toBe(true)
			})

			test('should validate gitmoji format', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('✨ add new feature')
				expect(result.valid).toBe(true)
			})

			test('should validate different gitmoji types', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)

				const testCases = [
					{ msg: '✨ new feature', valid: true },
					{ msg: '🐛 fix bug', valid: true },
					{ msg: '📚 update docs', valid: true },
					{ msg: '💅 style changes', valid: true },
					{ msg: '♻️ refactor code', valid: true },
					{ msg: '⚡ improve performance', valid: true },
					{ msg: '✅ add tests', valid: true },
					{ msg: '🔧 chore task', valid: true },
					{ msg: '🚀 deploy', valid: true },
				]

				for (const { msg, valid } of testCases) {
					const result = validator.validateMessage(msg)
					expect(result.valid).toBe(valid)
				}
			})

			test('should reject invalid gitmoji format', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('feat: not a gitmoji')
				expect(result.valid).toBe(false)
				expect(result.error).toBe('Message does not match Gitmoji format')
			})

			test('should reject message without space after emoji', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				const result = validator.validateMessage('✨add feature')
				expect(result.valid).toBe(false)
			})
		})

		describe('validateType', () => {
			test('should validate conventional type', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				expect(validator.validateType('feat')).toBe(true)
				expect(validator.validateType('fix')).toBe(true)
				expect(validator.validateType('docs')).toBe(true)
				expect(validator.validateType('invalid')).toBe(false)
			})

			test('should validate angular type', () => {
				const preset = getPreset('angular')
				const validator = new FormatValidator(preset)
				expect(validator.validateType('feat')).toBe(true)
				expect(validator.validateType('fix')).toBe(true)
				expect(validator.validateType('chore')).toBe(false) // Not in angular
			})

			test('should validate gitmoji type', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				expect(validator.validateType('✨')).toBe(true)
				expect(validator.validateType('🐛')).toBe(true)
				expect(validator.validateType('🚀')).toBe(true)
				expect(validator.validateType('feat')).toBe(false)
			})
		})

		describe('validateScope', () => {
			test('should validate conventional scope', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				expect(validator.validateScope('cli')).toBe(true)
				expect(validator.validateScope('api')).toBe(true)
				expect(validator.validateScope('core')).toBe(true)
				expect(validator.validateScope('invalid')).toBe(false)
			})

			test('should allow empty scope', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				expect(validator.validateScope('')).toBe(true)
			})

			test('should allow any scope for gitmoji (no scopes defined)', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				expect(validator.validateScope('anything')).toBe(true)
				expect(validator.validateScope('whatever')).toBe(true)
			})
		})

		describe('formatMessage', () => {
			test('should format conventional commit with scope', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.formatMessage({
					type: 'feat',
					scope: 'cli',
					message: 'add new command',
				})
				expect(result).toBe('feat(cli): add new command')
			})

			test('should format conventional commit without scope', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.formatMessage({
					type: 'fix',
					message: 'resolve bug',
				})
				expect(result).toBe('fix: resolve bug')
			})

			test('should format commit with body', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.formatMessage({
					type: 'feat',
					scope: 'api',
					message: 'add endpoint',
					body: 'Implement new API endpoint for users',
				})
				expect(result).toBe(
					'feat(api): add endpoint\n\nImplement new API endpoint for users',
				)
			})

			test('should format commit with footer', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.formatMessage({
					type: 'fix',
					scope: 'auth',
					message: 'fix login',
					footer: 'Closes #123',
				})
				expect(result).toBe('fix(auth): fix login\n\nCloses #123')
			})

			test('should format commit with body and footer', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const result = validator.formatMessage({
					type: 'feat',
					scope: 'core',
					message: 'add feature',
					body: 'This is the implementation',
					footer: 'BREAKING CHANGE: API changed\nCloses #42',
				})
				expect(result).toBe(
					'feat(core): add feature\n\nThis is the implementation\n\nBREAKING CHANGE: API changed\nCloses #42',
				)
			})

			test('should format gitmoji commit', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				const result = validator.formatMessage({
					type: '✨',
					message: 'add new feature',
				})
				expect(result).toBe('✨: add new feature')
			})
		})

		describe('getAvailableTypes', () => {
			test('should return conventional types', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const types = validator.getAvailableTypes()
				expect(types.length).toBeGreaterThan(0)
				expect(types.some((t) => t.value === 'feat')).toBe(true)
				expect(types.some((t) => t.value === 'fix')).toBe(true)
				expect(types.some((t) => t.value === 'chore')).toBe(true)
			})

			test('should return angular types', () => {
				const preset = getPreset('angular')
				const validator = new FormatValidator(preset)
				const types = validator.getAvailableTypes()
				expect(types.length).toBeGreaterThan(0)
				expect(types.some((t) => t.value === 'feat')).toBe(true)
				expect(types.some((t) => t.value === 'chore')).toBe(false)
			})

			test('should return gitmoji types', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				const types = validator.getAvailableTypes()
				expect(types.length).toBeGreaterThan(0)
				expect(types.some((t) => t.value === '✨')).toBe(true)
				expect(types.some((t) => t.value === '🐛')).toBe(true)
				expect(types.some((t) => t.value === '🚀')).toBe(true)
			})
		})

		describe('getAvailableScopes', () => {
			test('should return conventional scopes', () => {
				const preset = getPreset('conventional')
				const validator = new FormatValidator(preset)
				const scopes = validator.getAvailableScopes()
				expect(scopes).toContain('cli')
				expect(scopes).toContain('api')
				expect(scopes).toContain('core')
			})

			test('should return empty array for gitmoji (no scopes)', () => {
				const preset = getPreset('gitmoji')
				const validator = new FormatValidator(preset)
				const scopes = validator.getAvailableScopes()
				expect(scopes).toEqual([])
			})
		})
	})
})
