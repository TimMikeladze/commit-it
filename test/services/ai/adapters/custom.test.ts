import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createCustomAdapter } from '../../../../src/services/ai/adapters/custom'

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

describe('CustomAdapter', () => {
	test('should have name "custom"', () => {
		const adapter = createCustomAdapter({
			command: 'my-tool --prompt {{prompt}}',
		})
		expect(adapter.name).toBe('custom')
	})

	test('isAvailable should check the base command exists', async () => {
		const exec = async (cmd: string) => {
			if (cmd === 'my-tool') return { stdout: '1.0', stderr: '', status: 0 }
			return { stdout: '', stderr: 'not found', status: 1 }
		}
		const adapter = createCustomAdapter({
			command: 'my-tool --prompt {{prompt}}',
			exec,
		})
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('execute should substitute {{prompt}} in command template', async () => {
		const { calls, exec } = captureExec()
		const adapter = createCustomAdapter({
			command: 'my-tool --json --prompt {{prompt}}',
			exec,
		})
		await adapter.execute('generate a commit')
		expect(calls[0]?.cmd).toBe('my-tool')
		expect(calls[0]?.args).toContain('--json')
		expect(calls[0]?.args).toContain('--prompt')
		expect(calls[0]?.args).toContain('generate a commit')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = async () => ({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createCustomAdapter({
			command: 'my-tool --prompt {{prompt}}',
			exec,
		})
		expect(adapter.execute('test')).rejects.toThrow()
	})

	test('should throw if command template is missing', () => {
		expect(() => createCustomAdapter({ command: '' })).toThrow()
	})
})
