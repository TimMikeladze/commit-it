import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createAgentAdapter(options: {
	model?: string
	exec?: ExecFn
}): CLIAdapter {
	const exec = options.exec ?? execFileNoThrow
	const model = options.model

	return {
		name: 'agent',

		async isAvailable(): Promise<boolean> {
			const result = await exec('agent', ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			const args = ['-p', prompt]
			if (model) {
				args.push('--model', model)
			}

			const result = await exec('agent', args)
			if (result.status !== 0) {
				throw new Error(`agent CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
