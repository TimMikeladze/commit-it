import { boolean, command, string } from '@drizzle-team/brocli'
import { directCommit, interactiveCommit } from '../prompts/commitFlow'

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
		amend: boolean('amend').desc('Amend the last commit').default(false),
		breaking: boolean('breaking')
			.alias('b')
			.desc('Mark as breaking change')
			.default(false),
		ai: boolean('ai')
			.desc('Generate message from diff using AI')
			.default(false),
		noAi: boolean('no-ai').desc('Disable AI even if configured').default(false),
		type: string('type').alias('t').desc('Commit type (e.g. feat, fix)'),
		message: string('message')
			.alias('m')
			.desc('Commit message (non-interactive)'),
		scope: string('scope').alias('s').desc('Commit scope'),
		body: string('body').desc('Commit body'),
		coAuthor: string('co-author')
			.alias('c')
			.desc('Add co-author (alias or "Name <email>")'),
	},
	handler: async (opts) => {
		try {
			// Non-interactive mode: --type and --message provided
			if (opts.type && opts.message) {
				const commit = await directCommit({
					type: opts.type,
					message: opts.message,
					scope: opts.scope,
					body: opts.body,
					breaking: opts.breaking,
					dryRun: opts.dryRun,
					stageAll: opts.all,
					amend: opts.amend,
					coAuthor: opts.coAuthor,
				})
				console.log(
					`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
				)
				return
			}

			const commit = await interactiveCommit({
				skipGithub: opts.noGithub,
				dryRun: opts.dryRun,
				stageAll: opts.all,
				amend: opts.amend,
				breaking: opts.breaking,
				useAI: opts.noAi ? false : opts.ai,
				coAuthor: opts.coAuthor,
			})
			console.log(
				`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
			)
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			if (message === 'Cancelled') {
				process.exit(0)
			}
			console.error('✗ Error creating commit:', message)
			process.exit(1)
		}
	},
})
