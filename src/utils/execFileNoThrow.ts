import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { verbose } from './verbose'

const execFileAsync = promisify(execFile)

export interface ExecResult {
	stdout: string
	stderr: string
	status: number
}

export async function execFileNoThrow(
	command: string,
	args: string[] = [],
): Promise<ExecResult> {
	verbose(`exec: ${command} ${args.join(' ')}`)
	try {
		const { stdout, stderr } = await execFileAsync(command, args)
		verbose(`exit: 0 | stdout: ${stdout.length} chars | stderr: ${stderr.length} chars`)
		return { stdout, stderr, status: 0 }
	} catch (error: unknown) {
		if (error instanceof Error) {
			const execError = error as Error & {
				stdout?: string
				stderr?: string
				status?: number
			}
			const status = execError.status || 1
			verbose(`exit: ${status} | stderr: ${execError.stderr || execError.message}`)
			return {
				stdout: execError.stdout || '',
				stderr: execError.stderr || execError.message || '',
				status,
			}
		}
		verbose(`exit: 1 | error: ${String(error)}`)
		return { stdout: '', stderr: String(error), status: 1 }
	}
}

export async function execFileThrow(
	command: string,
	args: string[] = [],
): Promise<string> {
	verbose(`exec: ${command} ${args.join(' ')}`)
	try {
		const { stdout } = await execFileAsync(command, args)
		verbose(`exit: 0 | stdout: ${stdout.length} chars`)
		return stdout
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		verbose(`exec failed: ${message}`)
		throw new Error(`Command failed: ${message}`)
	}
}
