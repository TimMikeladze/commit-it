import { describe, expect, test } from 'bun:test'
import { createCodexAdapter } from '../../../../src/services/ai/adapters/codex'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'

function mockExec(
	result: ExecResult,
): (cmd: string, args?: string[]) => Promise<ExecResult> {
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
			return {
				stdout: '{"type":"feat","message":"test"}',
				stderr: '',
				status: 0,
			}
		},
	}
}

describe('CodexAdapter', () => {
	test('should have name "codex"', () => {
		const adapter = createCodexAdapter({})
		expect(adapter.name).toBe('codex')
	})

	test('isAvailable should return true when codex exists', async () => {
		const exec = mockExec({ stdout: 'codex 1.0.0', stderr: '', status: 0 })
		const adapter = createCodexAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('isAvailable should return false when codex is missing', async () => {
		const exec = mockExec({ stdout: '', stderr: 'not found', status: 1 })
		const adapter = createCodexAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(false)
	})

	test('execute should call codex with -q flag', async () => {
		const { calls, exec } = captureExec()
		const adapter = createCodexAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.cmd).toBe('codex')
		expect(calls[0]?.args).toContain('-q')
		expect(calls[0]?.args).toContain('test prompt')
	})

	test('execute should pass --model when configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createCodexAdapter({ model: 'o3', exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).toContain('--model')
		expect(calls[0]?.args).toContain('o3')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = mockExec({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createCodexAdapter({ exec })
		expect(adapter.execute('test')).rejects.toThrow()
	})
})
