import { describe, expect, test } from 'bun:test'
import { parseCommitMessage, validateCommitMessage } from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('README Examples - Validation', () => {
	test('should validate valid commit message', () => {
		const config = createTestConfig({ validation: { enabled: true } })
		const result = validateCommitMessage(
			'feat(cli): add new command',
			config.validation,
		)

		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	test('should reject invalid type', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				allowedTypes: ['feat', 'fix', 'docs', 'style', 'refactor'],
			},
		})
		const result = validateCommitMessage(
			'feature(cli): Add new command.',
			config.validation,
		)

		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.rule === 'type-enum')).toBe(true)
	})

	test('should warn about trailing period', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				noTrailingPeriod: true,
			},
		})
		const result = validateCommitMessage(
			'feat(cli): add command.',
			config.validation,
		)

		expect(result.valid).toBe(true) // Still valid, but has warnings
		expect(
			result.warnings.some((e) => e.rule === 'subject-no-trailing-period'),
		).toBeTruthy()
	})

	test('should enforce max header length', () => {
		const longMessage = 'feat(cli): ' + 'a'.repeat(100)
		const config = createTestConfig({
			validation: {
				enabled: true,
				maxHeaderLength: 72,
			},
		})
		const result = validateCommitMessage(longMessage, config.validation)

		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes('72'))).toBe(true)
	})

	test('should require scope when configured', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				requireScope: true,
			},
		})
		const result = validateCommitMessage('feat: add command', config.validation)

		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.rule === 'scope-required')).toBe(true)
	})

	test('should validate allowed scopes', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				allowedScopes: ['cli', 'api', 'core'],
			},
		})
		const result = validateCommitMessage(
			'feat(invalid): add command',
			config.validation,
		)

		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.rule === 'scope-enum')).toBe(true)
	})

	test('should parse commit message correctly', () => {
		const parsed = parseCommitMessage('feat(cli): add new command')
		expect(parsed.type).toBe('feat')
		expect(parsed.scope).toBe('cli')
		expect(parsed.subject).toBe('add new command')
	})

	test('should parse commit without scope', () => {
		const parsed = parseCommitMessage('docs: update README')
		expect(parsed.type).toBe('docs')
		expect(parsed.scope).toBeUndefined()
		expect(parsed.subject).toBe('update README')
	})
})
