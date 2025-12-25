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

	test('should create commit with body', () => {
		const message = buildFullMessage({
			type: 'feat',
			scope: 'api',
			message: 'add user profile endpoints',
			body: '- GET /users/:id/profile\n- PATCH /users/:id/profile',
		})
		expect(message).toContain('feat(api): add user profile endpoints')
		expect(message).toContain('- GET /users/:id/profile')
		expect(message).toContain('- PATCH /users/:id/profile')

		const parsed = parseCommitMessage(message)
		expect(parsed.type).toBe('feat')
		expect(parsed.scope).toBe('api')
		expect(parsed.body).toContain('GET /users/:id/profile')
	})

	test('should create commit with issue reference', () => {
		const message = buildFullMessage({
			type: 'fix',
			scope: 'api',
			message: 'resolve timeout in user endpoint',
			issues: 'Closes #42',
		})
		expect(message).toContain('fix(api): resolve timeout in user endpoint')
		expect(message).toContain('Closes #42')

		const parsed = parseCommitMessage(message)
		expect(parsed.issues).toContain(42)
	})
})
