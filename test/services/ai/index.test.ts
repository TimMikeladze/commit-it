import { describe, expect, test } from 'bun:test'
import {
	buildPrompt,
	parseAIResponse,
	createAdapter,
	NO_CLI_ERROR_MESSAGE,
} from '../../../src/services/ai'

describe('buildPrompt', () => {
	test('should include diff in prompt', () => {
		const prompt = buildPrompt('+ added line', {})
		expect(prompt).toContain('+ added line')
	})

	test('should include branch name when provided', () => {
		const prompt = buildPrompt('diff', { branchName: 'feature/login' })
		expect(prompt).toContain('feature/login')
	})

	test('should include existing types when provided', () => {
		const prompt = buildPrompt('diff', { existingTypes: ['feat', 'fix', 'docs'] })
		expect(prompt).toContain('feat')
		expect(prompt).toContain('fix')
		expect(prompt).toContain('docs')
	})

	test('should truncate long diffs', () => {
		const longDiff = 'x'.repeat(10000)
		const prompt = buildPrompt(longDiff, {})
		expect(prompt.length).toBeLessThan(10000)
	})
})

describe('parseAIResponse', () => {
	test('should parse valid JSON response', () => {
		const result = parseAIResponse('{"type":"feat","scope":"cli","message":"add feature"}')
		expect(result).not.toBeNull()
		expect(result!.type).toBe('feat')
		expect(result!.scope).toBe('cli')
		expect(result!.message).toBe('add feature')
	})

	test('should extract JSON from surrounding text', () => {
		const result = parseAIResponse('Here is the result:\n{"type":"fix","message":"bug fix"}\nDone.')
		expect(result).not.toBeNull()
		expect(result!.type).toBe('fix')
	})

	test('should return null for invalid response', () => {
		const result = parseAIResponse('no json here')
		expect(result).toBeNull()
	})

	test('should default type to feat if missing', () => {
		const result = parseAIResponse('{"message":"something"}')
		expect(result).not.toBeNull()
		expect(result!.type).toBe('feat')
	})

	test('should default message to update if missing', () => {
		const result = parseAIResponse('{"type":"fix"}')
		expect(result).not.toBeNull()
		expect(result!.message).toBe('update')
	})
})

describe('createAdapter', () => {
	test('should create claude adapter', () => {
		const adapter = createAdapter({ name: 'claude' })
		expect(adapter.name).toBe('claude')
	})

	test('should create codex adapter', () => {
		const adapter = createAdapter({ name: 'codex' })
		expect(adapter.name).toBe('codex')
	})

	test('should create agent adapter', () => {
		const adapter = createAdapter({ name: 'agent' })
		expect(adapter.name).toBe('agent')
	})

	test('should create custom adapter with command', () => {
		const adapter = createAdapter({ name: 'custom', command: 'my-tool {{prompt}}' })
		expect(adapter.name).toBe('custom')
	})

	test('should throw for custom adapter without command', () => {
		expect(() => createAdapter({ name: 'custom' })).toThrow()
	})
})

describe('NO_CLI_ERROR_MESSAGE', () => {
	test('should include install URLs', () => {
		expect(NO_CLI_ERROR_MESSAGE).toContain('claude')
		expect(NO_CLI_ERROR_MESSAGE).toContain('codex')
		expect(NO_CLI_ERROR_MESSAGE).toContain('agent')
		expect(NO_CLI_ERROR_MESSAGE).toContain('https://')
	})

	test('should include custom config example', () => {
		expect(NO_CLI_ERROR_MESSAGE).toContain('~/.commit-it/config.json')
		expect(NO_CLI_ERROR_MESSAGE).toContain('custom')
	})
})
