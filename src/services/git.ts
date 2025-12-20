import { type SimpleGit, simpleGit } from 'simple-git'

export interface CommitResult {
	hash: string
	message: string
}

export interface IssueReference {
	action: 'Closes' | 'Fixes' | 'Resolves' | 'Ref'
	number: number
	title?: string
}

export interface ParsedCommit {
	type: string
	scope?: string
	message: string
	body?: string
	breaking?: string
	isBreaking: boolean
	hash: string
	fullMessage: string
}

export interface CommitOptions {
	type: string
	scope?: string
	message: string
	body?: string
	breaking?: string
	coauthors?: string[]
	issue?: number // deprecated, use issueRefs
	issueRefs?: IssueReference[]
	dryRun?: boolean
	stage?: boolean
	amend?: boolean
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

	async commit(message: string, amend = false): Promise<CommitResult> {
		const result = await this.git.commit(message, amend ? ['--amend'] : [])
		return {
			hash: result.commit,
			message,
		}
	}

	/**
	 * Get the staged diff for AI commit message generation
	 */
	async getStagedDiff(): Promise<string> {
		const result = await this.git.diff(['--cached'])
		return result
	}

	/**
	 * Get all changed files (both staged and unstaged)
	 */
	async getChangedFiles(): Promise<string[]> {
		const status = await this.git.status()
		return status.files.map((f) => f.path)
	}

	/**
	 * Get the last commit and parse it into components
	 */
	async getLastCommit(): Promise<ParsedCommit | null> {
		try {
			const log = await this.git.log({ maxCount: 1 })
			if (!log.latest) return null

			const { hash, message } = log.latest
			return this.parseCommitMessage(hash, message)
		} catch {
			return null
		}
	}

	/**
	 * Parse a commit message into its components
	 */
	parseCommitMessage(hash: string, fullMessage: string): ParsedCommit {
		const lines = fullMessage.split('\n')
		const firstLine = lines[0] || ''

		// Parse conventional commit format: type(scope)!: message
		const match = firstLine.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/)

		let type = 'chore'
		let scope: string | undefined
		let message = firstLine
		let isBreaking = false

		if (match) {
			type = match[1]
			scope = match[2]
			isBreaking = match[3] === '!'
			message = match[4]
		}

		// Extract body and breaking change footer
		let body: string | undefined
		let breaking: string | undefined

		if (lines.length > 2) {
			const bodyLines: string[] = []
			let inBreaking = false

			for (let i = 2; i < lines.length; i++) {
				const line = lines[i]
				if (line.startsWith('BREAKING CHANGE:')) {
					inBreaking = true
					breaking = line.replace('BREAKING CHANGE:', '').trim()
				} else if (inBreaking) {
					breaking = (breaking || '') + '\n' + line
				} else if (
					!line.startsWith('Co-authored-by:') &&
					!line.match(/^(Closes|Fixes|Resolves|Ref)\s+#\d+/)
				) {
					bodyLines.push(line)
				}
			}

			body = bodyLines.join('\n').trim() || undefined
			if (breaking) isBreaking = true
		}

		return {
			type,
			scope,
			message,
			body,
			breaking,
			isBreaking,
			hash,
			fullMessage,
		}
	}

	/**
	 * Check if a branch exists
	 */
	async branchExists(branchName: string): Promise<boolean> {
		try {
			const branches = await this.git.branchLocal()
			return branches.all.includes(branchName)
		} catch {
			return false
		}
	}

	/**
	 * Create or switch to a branch
	 */
	async createOrSwitchBranch(
		branchName: string,
	): Promise<{ created: boolean }> {
		const exists = await this.branchExists(branchName)
		if (exists) {
			await this.git.checkout(branchName)
			return { created: false }
		}
		await this.git.checkoutLocalBranch(branchName)
		return { created: true }
	}

	async createCommit(options: CommitOptions): Promise<CommitResult> {
		if (options.stage) {
			await this.stageAll()
		}

		// Format message with breaking change indicator
		let message = `${options.type}`
		if (options.scope) {
			message += `(${options.scope})`
		}
		if (options.breaking) {
			message += '!'
		}
		message += `: ${options.message}`

		if (options.body) {
			message += `\n\n${options.body}`
		}

		// Add breaking change footer
		if (options.breaking) {
			message += `\n\nBREAKING CHANGE: ${options.breaking}`
		}

		// Handle issue references (new format)
		if (options.issueRefs && options.issueRefs.length > 0) {
			const issueFooter = options.issueRefs
				.map((ref) => `${ref.action} #${ref.number}`)
				.join('\n')
			message += `\n\n${issueFooter}`
		} else if (options.issue) {
			// Legacy support for single issue
			message += `\n\nCloses #${options.issue}`
		}

		// Add co-authors
		if (options.coauthors && options.coauthors.length > 0) {
			message += `\n\n${options.coauthors.join('\n')}`
		}

		if (options.dryRun) {
			return {
				hash: 'dry-run',
				message,
			}
		}

		return this.commit(message, options.amend)
	}
}

export async function createCommit(
	options: CommitOptions,
): Promise<CommitResult> {
	const git = new GitService()
	return git.createCommit(options)
}
