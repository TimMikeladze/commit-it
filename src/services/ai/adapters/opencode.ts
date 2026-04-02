import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createOpenCodeAdapter(options: {
	model?: string
	exec?: ExecFn
}): CLIAdapter {
	const exec = options.exec ?? execFileNoThrow
	const model = options.model

	return {
		name: 'opencode',

		async isAvailable(): Promise<boolean> {
			const result = await exec('opencode', ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			const args = ['-p', prompt]
			if (model) {
				args.push('--model', model)
			}

			const result = await exec('opencode', args)
			if (result.status !== 0) {
				throw new Error(`opencode CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
