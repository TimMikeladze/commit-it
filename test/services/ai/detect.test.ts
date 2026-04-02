import { describe, expect, test } from 'bun:test'
import {
	CLI_DETECTION_ORDER,
	detectAvailableCLI,
} from '../../../src/services/ai/detect'
import type { ExecResult } from '../../../src/utils/execFileNoThrow'

function mockExec(
	available: string[],
): (cmd: string, args?: string[]) => Promise<ExecResult> {
	return async (cmd: string) => {
		if (available.includes(cmd)) {
			return { stdout: '1.0.0', stderr: '', status: 0 }
		}
		return { stdout: '', stderr: 'not found', status: 1 }
	}
}

describe('CLI_DETECTION_ORDER', () => {
	test('should have claude, codex, opencode, agent in order', () => {
		expect(CLI_DETECTION_ORDER).toEqual([
			'claude',
			'codex',
			'opencode',
			'agent',
		])
	})
})

describe('detectAvailableCLI', () => {
	test('should return claude when available', async () => {
		const result = await detectAvailableCLI(mockExec(['claude']))
		expect(result).toBe('claude')
	})

	test('should return codex when claude is not available', async () => {
		const result = await detectAvailableCLI(mockExec(['codex']))
		expect(result).toBe('codex')
	})

	test('should return opencode when claude and codex are not available', async () => {
		const result = await detectAvailableCLI(mockExec(['opencode']))
		expect(result).toBe('opencode')
	})

	test('should return agent when others are not available', async () => {
		const result = await detectAvailableCLI(mockExec(['agent']))
		expect(result).toBe('agent')
	})

	test('should prefer claude over codex', async () => {
		const result = await detectAvailableCLI(mockExec(['claude', 'codex']))
		expect(result).toBe('claude')
	})

	test('should return null when no CLI is available', async () => {
		const result = await detectAvailableCLI(mockExec([]))
		expect(result).toBeNull()
	})
})
