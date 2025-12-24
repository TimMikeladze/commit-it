import type { AICommitSuggestion } from '../../src/services/ai'
import type { GitService } from '../../src/services/git'
import type {
	GitHubService,
	Issue,
	PullRequest,
} from '../../src/services/github'

export function mockGitService(
	overrides: {
		stagedDiff?: string
		currentBranch?: string
		changedFiles?: string[]
	} = {},
): Partial<GitService> {
	return {
		getStagedDiff: async () => overrides.stagedDiff || '',
		getBranchName: async () => overrides.currentBranch || 'main',
		getChangedFiles: async () => overrides.changedFiles || [],
		getStatus: async () => ({
			staged: overrides.changedFiles || [],
			unstaged: [],
		}),
		stageAll: async () => {},
		commit: async (message: string) => ({
			hash: 'mock-hash-123',
			message,
		}),
		getLastCommit: async () => null,
		parseCommitMessage: (hash: string, fullMessage: string) => ({
			type: 'feat',
			message: 'mock message',
			isBreaking: false,
			hash,
			fullMessage,
		}),
		branchExists: async (_branchName: string) => false,
		createOrSwitchBranch: async (_branchName: string) => ({
			created: true,
		}),
		createCommit: async (options) => ({
			hash: 'mock-hash-123',
			message: `${options.type}: ${options.message}`,
		}),
	}
}

export function mockGitHubService(
	overrides: {
		currentPR?: PullRequest | null
		labels?: string[]
		issues?: Issue[]
	} = {},
): Partial<GitHubService> {
	return {
		getCurrentPR: async () => overrides.currentPR || null,
		getLabels: async () => overrides.labels || [],
		searchIssues: async (_query: string) => overrides.issues || [],
		getIssue: async (_number: number) => null,
		getPR: async (_number: number) => null,
		getCollaborators: async () => [],
		detectContext: async () => ({
			relatedIssues: [],
			currentPR: overrides.currentPR || null,
		}),
		slugify: (input: string) => input.toLowerCase().replace(/\s+/g, '-'),
		createBranchName: async (issueNumbers: number[], postfix?: string) => {
			const base = issueNumbers.join('-')
			return postfix ? `${base}-${postfix}` : base
		},
	}
}

export function mockAI(overrides: { suggestion?: AICommitSuggestion } = {}) {
	return {
		generateCommitMessage: async () =>
			overrides.suggestion || {
				type: 'feat',
				scope: 'test',
				message: 'add test feature',
			},
	}
}
