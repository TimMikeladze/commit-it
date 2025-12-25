import { describe, expect, test } from 'bun:test'
import { buildFullMessage, parseCommitMessage } from '../../src'

describe('README Examples - Breaking Changes', () => {
	test('should create breaking change commit with co-authors', () => {
		const message = buildFullMessage({
			type: 'feat',
			scope: 'api',
			message: 'redesign authentication flow',
			breaking:
				'JWT tokens now use RS256 instead of HS256.\nAll existing tokens will be invalidated.',
			coauthors:
				'Co-authored-by: Alice Smith <alice@example.com>\nCo-authored-by: Bob Jones <bob@company.com>',
		})

		expect(message).toContain('feat(api)!: redesign authentication flow')
		expect(message).toContain('BREAKING CHANGE: JWT tokens now use RS256')
		expect(message).toContain('Co-authored-by: Alice Smith')
		expect(message).toContain('Co-authored-by: Bob Jones')

		const parsed = parseCommitMessage(message)
		expect(parsed.isBreaking).toBe(true)
	})

	test('should create breaking change without co-authors', () => {
		const message = buildFullMessage({
			type: 'feat',
			scope: 'core',
			message: 'remove deprecated API',
			breaking: 'The legacy API has been removed. Use v2 endpoints.',
		})

		expect(message).toContain('feat(core)!: remove deprecated API')
		expect(message).toContain(
			'BREAKING CHANGE: The legacy API has been removed',
		)

		const parsed = parseCommitMessage(message)
		expect(parsed.isBreaking).toBe(true)
		expect(parsed.type).toBe('feat')
		expect(parsed.scope).toBe('core')
	})

	test('should parse breaking change from exclamation mark', () => {
		const message = 'feat(api)!: redesign authentication'
		const parsed = parseCommitMessage(message)
		expect(parsed.isBreaking).toBe(true)
		expect(parsed.type).toBe('feat')
		expect(parsed.scope).toBe('api')
	})

	test('should parse breaking change from footer', () => {
		const message =
			'feat(api): redesign auth\n\nBREAKING CHANGE: API contract changed'
		const parsed = parseCommitMessage(message)
		expect(parsed.isBreaking).toBe(true)
	})
})
