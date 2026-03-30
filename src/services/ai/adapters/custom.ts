import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createCustomAdapter(options: {
	command: string
	exec?: ExecFn
}): CLIAdapter {
	if (!options.command) {
		throw new Error('Custom adapter requires a command template')
	}

	const exec = options.exec ?? execFileNoThrow
	const template = options.command

	// Extract the base command (first word) for availability check
	const baseCommand = template.split(' ')[0]!

	return {
		name: 'custom',

		async isAvailable(): Promise<boolean> {
			const result = await exec(baseCommand, ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			// Split template into tokens first, then substitute {{prompt}} as a single token
			const parts = template.split(' ')
			const substituted = parts.map((token) =>
				token === '{{prompt}}' ? prompt : token,
			)
			const cmd = substituted[0]!
			const args = substituted.slice(1)

			const result = await exec(cmd, args)
			if (result.status !== 0) {
				throw new Error(`Custom CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
