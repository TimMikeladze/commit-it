/**
 * AI-First Configuration
 *
 * For teams that want AI to handle most commit messages.
 * Minimal validation, maximum automation.
 *
 * AI config is per-user (not per-project). Run `commit-it` once to go through
 * the setup wizard, or create ~/.commit-it/config.json:
 *   { "ai": { "auto": true, "provider": "claude" } }
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
	preset: 'conventional',

	github: {
		enabled: true,
		scopeLabelPatterns: ['scope:', 'area:'],
		auto: {
			detectIssues: true,
			suggestReviewers: false,
		},
	},

	// Generous scope mapping for AI context
	scopeMap: {
		'src/**/*.ts': 'core',
		'src/**/*.test.ts': 'test',
		'src/api/**': 'api',
		'src/cli/**': 'cli',
		'src/ui/**': 'ui',
		'src/components/**': 'ui',
		'src/services/**': 'services',
		'src/utils/**': 'utils',
		'docs/**': 'docs',
		'tests/**': 'test',
		'scripts/**': 'scripts',
		'.github/**': 'ci',
		'package.json': 'deps',
		'package-lock.json': 'deps',
		'yarn.lock': 'deps',
		'pnpm-lock.yaml': 'deps',
	},

	// Minimal validation - trust the AI
	validation: {
		enabled: true,
		maxHeaderLength: 100, // Allow longer for AI
		maxBodyLineLength: 120,
		requireScope: false,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,

		// Only block obvious mistakes
		customRules: [
			{
				name: 'no-wip',
				pattern: '\\bWIP\\b',
				message: 'Remove WIP before committing',
				level: 'warning',
				invert: true,
			},
			{
				name: 'no-placeholder',
				pattern: '\\b(TODO|FIXME|XXX)\\b',
				message: 'Remove placeholder text',
				level: 'warning',
				invert: true,
			},
		],
	},
})
