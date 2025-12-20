import { type SimpleGit, simpleGit } from 'simple-git'

export interface CommitResult {
	hash: string
	message: string
}

export interface CommitOptions {
	type: string
	scope?: string
	message: string
	body?: string
	issue?: number
	dryRun?: boolean
	stage?: boolean
}

export class GitService {
	private git: SimpleGit

	constructor(workingDir?: string) {
		this.git = simpleGit(workingDir || process.cwd())
	}

	async getBranchName(): Promise<string> {
		const status = await this.git.status()
		return status.current || ''
	}

	async getStatus(): Promise<{ staged: string[]; unstaged: string[] }> {
		const status = await this.git.status()
		return {
			staged: status.staged || [],
			unstaged: status.files
				.filter((f) => !f.index || f.working_dir)
				.map((f) => f.path),
		}
	}

	async stageAll(): Promise<void> {
		await this.git.add('.')
	}

	async commit(message: string): Promise<CommitResult> {
		const result = await this.git.commit(message)
		return {
			hash: result.commit,
			message,
		}
	}

	async createCommit(options: CommitOptions): Promise<CommitResult> {
		if (options.stage) {
			await this.stageAll()
		}

		// Format message
		let message = `${options.type}`
		if (options.scope) {
			message += `(${options.scope})`
		}
		message += `: ${options.message}`

		if (options.body) {
			message += `\n\n${options.body}`
		}

		if (options.issue) {
			message += `\n\nCloses #${options.issue}`
		}

		if (options.dryRun) {
			return {
				hash: 'dry-run',
				message,
			}
		}

		return this.commit(message)
	}
}

export async function createCommit(
	options: CommitOptions,
): Promise<CommitResult> {
	const git = new GitService()
	return git.createCommit(options)
}
