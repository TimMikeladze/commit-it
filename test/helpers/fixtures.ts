import type { Config } from '../../src/config'
import type { ParsedCommit } from '../../src/services/git'

export const testConfig: Config = {
	preset: 'conventional',
	scopeMode: 'single',
	defaults: {
		scope: '',
		includeBody: true,
	},
	plugins: [],
	validation: {
		enabled: true,
		maxHeaderLength: 72,
		maxBodyLineLength: 100,
		requireScope: false,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,
		customRules: [],
	},
	github: {
		enabled: true,
		scopeLabelPatterns: ['scope:', 'area:'],
		auto: {
			detectIssues: true,
			suggestReviewers: false,
		},
	},
}

export const validCommitMessages = [
	'feat(cli): add new command',
	'fix(api): resolve timeout issue',
	'docs: update README',
	'test(unit): add validation tests',
]

export const invalidCommitMessages = [
	'Feature: add new command', // wrong type
	'feat(cli): Add new command.', // capital + period
	'fix: this is a very long message that exceeds the maximum header length allowed by the validation rules configured', // too long
]

export const testDiff = `
diff --git a/src/cli.ts b/src/cli.ts
index 123..456 100644
--- a/src/cli.ts
+++ b/src/cli.ts
@@ -1,3 +1,4 @@
+import { newFeature } from './features'
 console.log('hello')
`

export const sampleParsedCommit: ParsedCommit = {
	type: 'feat',
	scope: 'cli',
	message: 'add new command',
	body: 'This is a longer description of the change',
	breaking: undefined,
	isBreaking: false,
	hash: 'abc123',
	fullMessage:
		'feat(cli): add new command\n\nThis is a longer description of the change',
}

export const sampleBreakingCommit: ParsedCommit = {
	type: 'feat',
	scope: 'api',
	message: 'change authentication method',
	body: 'Updated authentication to use JWT tokens',
	breaking: 'Authentication now requires JWT tokens instead of session cookies',
	isBreaking: true,
	hash: 'def456',
	fullMessage:
		'feat(api)!: change authentication method\n\nUpdated authentication to use JWT tokens\n\nBREAKING CHANGE: Authentication now requires JWT tokens instead of session cookies',
}

export const sampleIssues = [
	{
		number: 123,
		title: 'Add user authentication',
		labels: [
			{ name: 'feature', color: '00ff00' },
			{ name: 'scope:auth', color: '0000ff' },
		],
		state: 'open' as const,
	},
	{
		number: 456,
		title: 'Fix memory leak in cache',
		labels: [
			{ name: 'bug', color: 'ff0000' },
			{ name: 'scope:cache', color: '0000ff' },
		],
		state: 'open' as const,
	},
]

export const samplePR = {
	number: 789,
	title: 'Implement new dashboard',
	labels: [
		{ name: 'feature', color: '00ff00' },
		{ name: 'scope:ui', color: '0000ff' },
	],
	state: 'open' as const,
}
