import { type ExecResult, execFileNoThrow } from '../../utils/execFileNoThrow'
import type { ProviderName } from './types'

export const DETECTION_ORDER: readonly ProviderName[] = [
	'claude',
	'codex',
	'agent',
] as const

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export async function detectAvailableCLI(
	exec: ExecFn = execFileNoThrow,
): Promise<ProviderName | null> {
	for (const cli of DETECTION_ORDER) {
		const result = await exec(cli, ['--version'])
		if (result.status === 0) {
			return cli
		}
	}
	return null
}
