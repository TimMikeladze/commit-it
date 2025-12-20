import { boolean, command } from '@drizzle-team/brocli'
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
	},
	handler: async (opts) => {
		try {
			const commit = await interactiveCommit({
				skipGithub: opts.noGithub,
				dryRun: opts.dryRun,
				stageAll: opts.all,
			})
			console.log(`✓ Commit created: ${commit.hash}`)
		} catch (error: any) {
			if (error.message === 'Cancelled') {
				process.exit(0)
			}
			console.error('✗ Error creating commit:', error.message)
			process.exit(1)
		}
	},
})
