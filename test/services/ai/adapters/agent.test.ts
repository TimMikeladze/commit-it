import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createAgentAdapter } from '../../../../src/services/ai/adapters/agent'

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

describe('AgentAdapter', () => {
	test('should have name "agent"', () => {
		const adapter = createAgentAdapter({})
		expect(adapter.name).toBe('agent')
	})

	test('isAvailable should return true when agent exists', async () => {
		const exec = mockExec({ stdout: 'agent 1.0.0', stderr: '', status: 0 })
		const adapter = createAgentAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('isAvailable should return false when agent is missing', async () => {
		const exec = mockExec({ stdout: '', stderr: 'not found', status: 1 })
		const adapter = createAgentAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(false)
	})

	test('execute should call agent with -p flag', async () => {
		const { calls, exec } = captureExec()
		const adapter = createAgentAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.cmd).toBe('agent')
		expect(calls[0]?.args).toContain('-p')
		expect(calls[0]?.args).toContain('test prompt')
	})

	test('execute should pass --model when configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createAgentAdapter({ model: 'fast', exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).toContain('--model')
		expect(calls[0]?.args).toContain('fast')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = mockExec({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createAgentAdapter({ exec })
		expect(adapter.execute('test')).rejects.toThrow()
	})
})
