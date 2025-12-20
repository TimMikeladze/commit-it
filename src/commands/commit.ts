import { boolean, command, string } from '@drizzle-team/brocli'
import { interactiveCommit } from '../prompts/commitFlow'

export const commitCommand = command({
	name: 'commit',
	desc: 'Create a standardized commit with GitHub integration',
	shortDesc: 'Interactive commit with GitHub integration',
	options: {
		noGithub: boolean('no-github').desc('Skip GitHub API calls').default(false),
		dryRun: boolean('dry-run')
			.desc('Show commit without creating it')
			.default(false),
		all: boolean('all').alias('a').desc('Stage all changes').default(false),
		amend: boolean('amend')
			.alias('m')
			.desc('Amend the last commit')
			.default(false),
		breaking: boolean('breaking')
			.alias('b')
			.desc('Mark as breaking change')
			.default(false),
		ai: boolean('ai')
			.desc('Generate message from diff using AI')
			.default(false),
		coAuthor: string('co-author')
			.alias('c')
			.desc('Add co-author (alias or "Name <email>")'),
	},
	handler: async (opts) => {
		try {
			const commit = await interactiveCommit({
				skipGithub: opts.noGithub,
				dryRun: opts.dryRun,
				stageAll: opts.all,
				amend: opts.amend,
				breaking: opts.breaking,
				useAI: opts.ai,
				coAuthor: opts.coAuthor,
			})
			console.log(
				`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
			)
		} catch (error: any) {
			if (error.message === 'Cancelled') {
				process.exit(0)
			}
			console.error('✗ Error creating commit:', error.message)
			process.exit(1)
		}
	},
})
