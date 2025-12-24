import { describe, expect, test } from 'bun:test'
import { mockAI, mockGitHubService, mockGitService } from './mocks'

describe('Mock Git Service', () => {
	test('should mock getStagedDiff', async () => {
		const git = mockGitService({
			stagedDiff: 'test diff content',
		})
		const diff = await git.getStagedDiff()
		expect(diff).toBe('test diff content')
	})

	test('should mock getBranchName', async () => {
		const git = mockGitService({
			currentBranch: 'feature/test',
		})
		const branch = await git.getBranchName()
		expect(branch).toBe('feature/test')
	})

	test('should mock getChangedFiles', async () => {
		const git = mockGitService({
			changedFiles: ['file1.ts', 'file2.ts'],
		})
		const files = await git.getChangedFiles()
		expect(files).toEqual(['file1.ts', 'file2.ts'])
	})

	test('should provide default values', async () => {
		const git = mockGitService()
		const diff = await git.getStagedDiff()
		const branch = await git.getBranchName()
		const files = await git.getChangedFiles()

		expect(diff).toBe('')
		expect(branch).toBe('main')
		expect(files).toEqual([])
	})
})

describe('Mock GitHub Service', () => {
	test('should mock getCurrentPR', async () => {
		const pr = {
			number: 123,
			title: 'Test PR',
			labels: [],
			state: 'open' as const,
		}
		const github = mockGitHubService({
			currentPR: pr,
		})
		const result = await github.getCurrentPR()
		expect(result).toEqual(pr)
	})

	test('should mock getLabels', async () => {
		const github = mockGitHubService({
			labels: ['bug', 'feature'],
		})
		const labels = await github.getLabels()
		expect(labels).toEqual(['bug', 'feature'])
	})

	test('should provide default values', async () => {
		const github = mockGitHubService()
		const pr = await github.getCurrentPR()
		const labels = await github.getLabels()

		expect(pr).toBeNull()
		expect(labels).toEqual([])
	})
})

describe('Mock AI Service', () => {
	test('should mock generateCommitMessage', async () => {
		const suggestion = {
			type: 'feat',
			scope: 'test',
			message: 'add test feature',
		}
		const ai = mockAI({
			suggestion,
		})
		const result = await ai.generateCommitMessage()
		expect(result).toEqual(suggestion)
	})

	test('should provide default suggestion', async () => {
		const ai = mockAI()
		const result = await ai.generateCommitMessage()
		expect(result).toEqual({
			type: 'feat',
			scope: 'test',
			message: 'add test feature',
		})
	})
})
