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
	} catch (error: any) {
		return {
			stdout: error.stdout || '',
			stderr: error.stderr || error.message || '',
			status: error.status || 1,
		}
	}
}

export async function execFileThrow(
	command: string,
	args: string[] = [],
): Promise<string> {
	try {
		const { stdout } = await execFileAsync(command, args)
		return stdout
	} catch (error: any) {
		throw new Error(`Command failed: ${error.message}`)
	}
}
