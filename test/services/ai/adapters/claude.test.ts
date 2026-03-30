import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createClaudeAdapter } from '../../../../src/services/ai/adapters/claude'

function mockExec(result: ExecResult): (cmd: string, args?: string[]) => Promise<ExecResult> {
	return async () => result
}

function captureExec(): {
	calls: Array<{ cmd: string; args?: string[] }>
	exec: (cmd: string, args?: string[]) => Promise<ExecResult>
} {
	const calls: Array<{ cmd: string; args?: string[] }> = []
	return {
		calls,
		exec: async (cmd: string, args?: string[]) => {
			calls.push({ cmd, args })
			return { stdout: '{"type":"feat","message":"test"}', stderr: '', status: 0 }
		},
	}
}

describe('ClaudeAdapter', () => {
	test('should have name "claude"', () => {
		const adapter = createClaudeAdapter({})
		expect(adapter.name).toBe('claude')
	})

	test('isAvailable should return true when claude exists', async () => {
		const exec = mockExec({ stdout: 'claude 1.0.0', stderr: '', status: 0 })
		const adapter = createClaudeAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('isAvailable should return false when claude is missing', async () => {
		const exec = mockExec({ stdout: '', stderr: 'not found', status: 1 })
		const adapter = createClaudeAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(false)
	})

	test('execute should call claude with -p flag', async () => {
		const { calls, exec } = captureExec()
		const adapter = createClaudeAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.cmd).toBe('claude')
		expect(calls[0]?.args).toContain('-p')
		expect(calls[0]?.args).toContain('test prompt')
	})

	test('execute should pass --model when configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createClaudeAdapter({ model: 'opus', exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).toContain('--model')
		expect(calls[0]?.args).toContain('opus')
	})

	test('execute should not pass --model when not configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createClaudeAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).not.toContain('--model')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = mockExec({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createClaudeAdapter({ exec })
		expect(adapter.execute('test')).rejects.toThrow()
	})
})
