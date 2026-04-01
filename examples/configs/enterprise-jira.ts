/**
 * Enterprise JIRA Configuration
 *
 * For enterprise teams using:
 * - JIRA ticket tracking
 * - Strict validation rules
 * - Required scopes
 * - Standardized commit format
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
	preset: 'conventional',

	scopeMap: {
		'backend/**': 'backend',
		'frontend/**': 'frontend',
		'api/**': 'api',
		'database/**': 'database',
		'infrastructure/**': 'infra',
		'docs/**': 'docs',
		'tests/**': 'test',
	},

	// Disable GitHub integration if using JIRA
	github: {
		enabled: false,
	},

	// AI config is per-user in ~/.commit-it/config.json
	// For compliance, users can skip the setup wizard or use --no-ai

	validation: {
		enabled: true,
		maxHeaderLength: 100, // Longer to accommodate JIRA ticket
		maxBodyLineLength: 100,
		requireScope: true, // Enforce scope
		requireBody: true, // Require detailed body
		requireIssue: false, // Handled by JIRA ticket rule

		allowedTypes: ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'],

		allowedScopes: [
			'backend',
			'frontend',
			'api',
			'database',
			'infra',
			'docs',
			'test',
		],

		noTrailingPeriod: true,
		noLeadingCapital: false,

		customRules: [
			// Require JIRA ticket
			{
				name: 'require-jira-ticket',
				pattern: '[A-Z]{2,}-\\d+',
				message: 'Must include JIRA ticket (e.g., PROJ-123, ENG-456)',
				level: 'error',
				invert: false,
			},
			// No WIP commits
			{
				name: 'no-wip',
				pattern: '\\b(WIP|wip)\\b',
				message: 'WIP commits not allowed',
				level: 'error',
				invert: true,
			},
			// No direct merge commits
			{
				name: 'no-merge',
				pattern: '^Merge',
				message: 'Use squash or rebase strategy',
				level: 'error',
				invert: true,
			},
			// Minimum body length
			{
				name: 'min-body-length',
				pattern: '[\\s\\S]{20,}',
				message: 'Body must be at least 20 characters',
				level: 'error',
				invert: false,
			},
		],
	},
})
