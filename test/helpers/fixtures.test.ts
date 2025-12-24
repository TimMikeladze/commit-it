import { describe, expect, test } from 'bun:test'
import {
	invalidCommitMessages,
	sampleBreakingCommit,
	sampleIssues,
	sampleParsedCommit,
	samplePR,
	testConfig,
	testDiff,
	validCommitMessages,
} from './fixtures'

describe('Test Fixtures', () => {
	test('testConfig should have valid structure', () => {
		expect(testConfig.preset).toBe('conventional')
		expect(testConfig.validation).toBeDefined()
		expect(testConfig.validation?.enabled).toBe(true)
		expect(testConfig.ai).toBeDefined()
		expect(testConfig.github).toBeDefined()
	})

	test('validCommitMessages should be valid format', () => {
		for (const msg of validCommitMessages) {
			expect(msg).toMatch(
				/^(feat|fix|docs|test|chore|refactor|style|perf|ci|build)(\(.+\))?: .+/,
			)
		}
	})

	test('invalidCommitMessages should be invalid format', () => {
		expect(invalidCommitMessages.length).toBeGreaterThan(0)
	})

	test('testDiff should be valid git diff format', () => {
		expect(testDiff).toContain('diff --git')
		expect(testDiff).toContain('@@')
	})

	test('sampleParsedCommit should have required fields', () => {
		expect(sampleParsedCommit.type).toBeDefined()
		expect(sampleParsedCommit.message).toBeDefined()
		expect(sampleParsedCommit.hash).toBeDefined()
		expect(sampleParsedCommit.fullMessage).toBeDefined()
		expect(sampleParsedCommit.isBreaking).toBe(false)
	})

	test('sampleBreakingCommit should be marked as breaking', () => {
		expect(sampleBreakingCommit.isBreaking).toBe(true)
		expect(sampleBreakingCommit.breaking).toBeDefined()
	})

	test('sampleIssues should have valid structure', () => {
		expect(sampleIssues.length).toBeGreaterThan(0)
		for (const issue of sampleIssues) {
			expect(issue.number).toBeGreaterThan(0)
			expect(issue.title).toBeDefined()
			expect(issue.labels).toBeDefined()
			expect(issue.state).toBeDefined()
		}
	})

	test('samplePR should have valid structure', () => {
		expect(samplePR.number).toBeGreaterThan(0)
		expect(samplePR.title).toBeDefined()
		expect(samplePR.labels).toBeDefined()
		expect(samplePR.state).toBe('open')
	})
})
