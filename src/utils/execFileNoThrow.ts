import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

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
	try {
		const { stdout, stderr } = await execFileAsync(command, args)
		return { stdout, stderr, status: 0 }
	} catch (error: unknown) {
		if (error instanceof Error) {
			const execError = error as Error & { stdout?: string; stderr?: string; status?: number }
			return {
				stdout: execError.stdout || '',
				stderr: execError.stderr || execError.message || '',
				status: execError.status || 1,
			}
		}
		return { stdout: '', stderr: String(error), status: 1 }
	}
}

export async function execFileThrow(
	command: string,
	args: string[] = [],
): Promise<string> {
	try {
		const { stdout } = await execFileAsync(command, args)
		return stdout
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`Command failed: ${message}`)
	}
}
