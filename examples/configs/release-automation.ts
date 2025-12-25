/**
 * Release Automation Configuration
 *
 * For projects using semantic-release or similar tools.
 * Enforces commit conventions needed for automated versioning.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
	preset: 'conventional',

	scopeMap: {
		'src/**': 'core',
		'docs/**': 'docs',
		'tests/**': 'test',
	},

	github: {
		enabled: true,
		scopeLabelPatterns: ['type:', 'scope:'],
	},

	validation: {
		enabled: true,
		maxHeaderLength: 100,
		maxBodyLineLength: 100,
		requireScope: false,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,

		// Strict type enforcement for semantic-release
		allowedTypes: [
			'feat', // Minor version bump
			'fix', // Patch version bump
			'perf', // Patch version bump
			'revert', // Patch version bump
			'docs', // No version bump
			'style', // No version bump
			'refactor', // No version bump
			'test', // No version bump
			'build', // No version bump
			'ci', // No version bump
			'chore', // No version bump
		],

		customRules: [
			// Breaking changes must have ! and footer
			{
				name: 'breaking-change-format',
				pattern: '!:.*\\n\\nBREAKING CHANGE:',
				message:
					'Breaking changes must use ! in header AND BREAKING CHANGE: footer',
				level: 'error',
				invert: false,
			},
			// Release commits must follow pattern
			{
				name: 'release-format',
				pattern: '^chore\\(release\\): v?\\d+\\.\\d+\\.\\d+',
				message: 'Release commits must be: chore(release): v1.2.3',
				level: 'error',
				invert: false,
			},
			// No manual version bumps outside release scope
			{
				name: 'no-version-outside-release',
				pattern: '^(?!chore\\(release\\):).*\\d+\\.\\d+\\.\\d+',
				message: 'Version numbers only allowed in chore(release) commits',
				level: 'error',
				invert: true,
			},
			// Encourage issue references for features
			{
				name: 'feat-issue-reference',
				pattern: '^feat.*#\\d+',
				message: 'Features should reference an issue',
				level: 'warning',
				invert: false,
			},
			// Fix commits should reference issue
			{
				name: 'fix-issue-reference',
				pattern: '^fix.*(#\\d+|fixes #\\d+|closes #\\d+)',
				message: 'Bug fixes should reference an issue',
				level: 'warning',
				invert: false,
			},
		],
	},
})
