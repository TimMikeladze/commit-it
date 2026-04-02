import { type ExecResult, execFileNoThrow } from '../../utils/execFileNoThrow'
import type { ProviderName } from './types'

export const CLI_DETECTION_ORDER: readonly ProviderName[] = [
	'claude',
	'codex',
	'opencode',
	'agent',
] as const

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export async function detectAvailableCLI(
	exec: ExecFn = execFileNoThrow,
): Promise<ProviderName | null> {
	for (const cli of CLI_DETECTION_ORDER) {
		const result = await exec(cli, ['--version'])
		if (result.status === 0) {
			return cli
		}
	}
	return null
}
