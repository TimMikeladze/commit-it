/**
 * Team Collaboration Configuration
 *
 * For teams that frequently pair/mob program.
 * Emphasizes co-authorship and collaboration tracking.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
	preset: 'conventional',

	// Extensive co-author roster
	coauthors: {
		alice: 'Alice Smith <alice@company.com>',
		bob: 'Bob Jones <bob@company.com>',
		charlie: 'Charlie Wilson <charlie@company.com>',
		diana: 'Diana Lee <diana@company.com>',
		eve: 'Eve Martinez <eve@company.com>',
		frank: 'Frank Zhang <frank@company.com>',
		grace: 'Grace Kim <grace@company.com>',
		henry: 'Henry Patel <henry@company.com>',

		// Team aliases
		'frontend-team': 'Frontend Team <frontend@company.com>',
		'backend-team': 'Backend Team <backend@company.com>',
		'devops-team': 'DevOps Team <devops@company.com>',
	},

	scopeMap: {
		'frontend/**': 'frontend',
		'backend/**': 'backend',
		'shared/**': 'shared',
		'infrastructure/**': 'infra',
		'docs/**': 'docs',
	},

	github: {
		enabled: true,
		scopeLabelPatterns: ['team:', 'area:'],
		auto: {
			detectIssues: true,
			suggestReviewers: true, // Suggest team members
		},
	},

	validation: {
		enabled: true,
		maxHeaderLength: 72,
		maxBodyLineLength: 100,
		requireScope: false,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,

		customRules: [
			// Encourage co-authorship for pair programming
			{
				name: 'suggest-coauthor',
				pattern: 'Co-authored-by:',
				message: 'Consider adding co-authors for pair/mob programming',
				level: 'warning',
				invert: false,
			},
			// No solo breaking changes
			{
				name: 'breaking-needs-review',
				pattern: 'BREAKING CHANGE:',
				message: 'Breaking changes should be reviewed by team',
				level: 'warning',
				invert: false,
			},
		],
	},
})
