import { execFileThrow } from '../utils/execFileNoThrow'

export interface Label {
	name: string
	color: string // hex color without #
}

/**
 * Convert hex color to ANSI 256-color code for terminal display
 */
export function hexToAnsi(hex: string): number {
	// Remove # if present
	hex = hex.replace('#', '')

	const r = Number.parseInt(hex.slice(0, 2), 16)
	const g = Number.parseInt(hex.slice(2, 4), 16)
	const b = Number.parseInt(hex.slice(4, 6), 16)

	// Convert to 256-color palette (16-231 are a 6x6x6 color cube)
	const toLevel = (v: number) => Math.round(v / 255 * 5)
	return 16 + 36 * toLevel(r) + 6 * toLevel(g) + toLevel(b)
}

/**
 * Format text with background color using ANSI escape codes
 */
export function formatLabelColor(text: string, hexColor: string): string {
	const ansiCode = hexToAnsi(hexColor)
	// Use bright foreground for dark backgrounds, dark for light
	const r = Number.parseInt(hexColor.slice(0, 2), 16)
	const g = Number.parseInt(hexColor.slice(2, 4), 16)
	const b = Number.parseInt(hexColor.slice(4, 6), 16)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
	const fgCode = luminance > 0.5 ? 0 : 15 // black or white text

	return `\x1b[48;5;${ansiCode}m\x1b[38;5;${fgCode}m ${text} \x1b[0m`
}

export interface Issue {
	number: number
	title: string
	labels: Label[]
	state: 'open' | 'closed'
}

export interface PullRequest {
	number: number
	title: string
	labels: Label[]
	state: 'open' | 'closed'
}

export interface CommitContext {
	currentPR?: PullRequest | null
	relatedIssues: Issue[]
	suggestedType?: string
	suggestedReviewers?: string[]
	prLabels?: Label[]
}

export class GitHubService {
	private enabled: boolean

	constructor(enabled: boolean = true) {
		this.enabled = enabled
		if (this.enabled) {
			this.checkGhInstalled()
		}
	}

	private checkGhInstalled(): void {
		try {
			// Simple check for gh command availability
			require.resolve('which').toString()
		} catch {
			// Silently continue - will fail when trying to use gh
		}
	}

	async searchIssues(query: string): Promise<Issue[]> {
		if (!this.enabled) return []

		try {
			const result = await execFileThrow('gh', [
				'issue',
				'list',
				'--search',
				query,
				'--limit',
				'10',
				'--json',
				'number,title,labels,state',
			])
			return JSON.parse(result)
		} catch {
			return []
		}
	}

	async getIssue(number: number): Promise<Issue | null> {
		if (!this.enabled) return null

		try {
			const result = await execFileThrow('gh', [
				'issue',
				'view',
				number.toString(),
				'--json',
				'number,title,labels,state',
			])
			return JSON.parse(result)
		} catch {
			return null
		}
	}

	async getCurrentPR(): Promise<PullRequest | null> {
		if (!this.enabled) return null

		try {
			const result = await execFileThrow('gh', [
				'pr',
				'view',
				'--json',
				'number,title,labels,state',
			])
			return JSON.parse(result)
		} catch {
			return null
		}
	}

	async getPR(number: number): Promise<PullRequest | null> {
		if (!this.enabled) return null

		try {
			const result = await execFileThrow('gh', [
				'pr',
				'view',
				number.toString(),
				'--json',
				'number,title,labels,state',
			])
			return JSON.parse(result)
		} catch {
			return null
		}
	}

	async getLabels(): Promise<string[]> {
		if (!this.enabled) return []

		try {
			const result = await execFileThrow('gh', [
				'label',
				'list',
				'--limit',
				'50',
				'--json',
				'name',
			])
			const parsed = JSON.parse(result)
			return parsed.map((l: { name: string }) => l.name)
		} catch {
			return []
		}
	}

	async getCollaborators(): Promise<string[]> {
		if (!this.enabled) return []

		try {
			const result = await execFileThrow('gh', [
				'repo',
				'collaborators',
				'--limit',
				'50',
			])
			return result.split('\n').filter((line) => line.trim())
		} catch {
			return []
		}
	}

	async detectContext(): Promise<CommitContext> {
		if (!this.enabled) {
			return {
				relatedIssues: [],
			}
		}

		const context: CommitContext = {
			relatedIssues: [],
		}

		try {
			// Try to get current PR
			context.currentPR = await this.getCurrentPR()

			// Suggest type based on labels
			if (context.currentPR?.labels) {
				context.prLabels = context.currentPR.labels
				const labelNames = context.currentPR.labels.map((l) => l.name)
				if (labelNames.includes('bug')) {
					context.suggestedType = 'fix'
				} else if (labelNames.includes('feature')) {
					context.suggestedType = 'feat'
				} else if (labelNames.includes('docs')) {
					context.suggestedType = 'docs'
				}
			}
		} catch {
			// Silently fail, continue without PR context
		}

		return context
	}

	/**
	 * Slugify a string for use in branch names
	 */
	slugify(input: string): string {
		return input
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase()
	}

	/**
	 * Create a branch name from issue numbers and titles
	 */
	async createBranchName(
		issueNumbers: number[],
		postfix?: string,
	): Promise<string> {
		const sorted = [...issueNumbers].sort((a, b) => a - b)
		const titles: string[] = []

		for (const num of sorted) {
			const issue = await this.getIssue(num)
			if (issue) {
				titles.push(issue.title)
			}
		}

		const issueNames = titles.join(' and ')
		let branch = this.slugify(`${sorted.join('-')} ${issueNames}`)

		if (postfix) {
			branch += `-${this.slugify(postfix)}`
		}

		return branch.replace(/-$/, '')
	}
}
