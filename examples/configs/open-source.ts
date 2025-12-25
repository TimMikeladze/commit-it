/**
 * Open Source Project Configuration
 *
 * For OSS projects that require:
 * - DCO sign-off (Developer Certificate of Origin)
 * - Issue references
 * - Public contribution guidelines
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
	preset: 'conventional',

	scopeMap: {
		'src/**': 'core',
		'docs/**': 'docs',
		'examples/**': 'examples',
		'tests/**': 'test',
		'.github/**': 'ci',
	},

	github: {
		enabled: true,
		scopeLabelPatterns: ['area:', 'component:'],
		auto: {
			detectIssues: true,
			suggestReviewers: true, // Suggest maintainers
		},
	},

	validation: {
		enabled: true,
		maxHeaderLength: 72,
		maxBodyLineLength: 100,
		requireScope: false,
		requireBody: false,
		requireIssue: false, // Encourage but don't require

		customRules: [
			// Require DCO sign-off
			{
				name: 'require-signoff',
				pattern: 'Signed-off-by: .+ <.+@.+>',
				message: 'DCO sign-off required. Use: git commit -s',
				level: 'error',
				invert: false,
			},
			// Encourage issue references
			{
				name: 'suggest-issue',
				pattern: '(#\\d+|fixes #\\d+|closes #\\d+|resolves #\\d+)',
				message: 'Consider referencing a GitHub issue',
				level: 'warning',
				invert: false,
			},
			// No merge commits
			{
				name: 'no-merge',
				pattern: '^Merge (branch|pull request)',
				message: 'Use rebase instead of merge commits',
				level: 'error',
				invert: true,
			},
			// Present tense
			{
				name: 'present-tense',
				pattern: '^\\w+\\([^)]*\\): (added|removed|fixed|updated|changed)',
				message: 'Use present tense: "add" not "added"',
				level: 'warning',
				invert: true,
			},
		],
	},
})
