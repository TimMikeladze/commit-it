import { boolean, command, string } from '@drizzle-team/brocli'
import { extraGitArgs } from '../cli'
import {
	directCommit,
	interactiveCommit,
	multiCommit,
} from '../prompts/commitFlow'
import { shouldAutoAI } from '../services/ai'
import { getProjectSchema } from '../services/schema'
import { needsSetup, runSetupWizard } from '../services/setup'
import { parseCommitMessage } from '../services/validation'
import { isAgentEnvironment } from '../utils/agent'
import { setVerbose } from '../utils/verbose'

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
		provider: string('provider').desc(
			'AI provider to use (claude, codex, agent, custom)',
		),
		type: string('type').alias('t').desc('Commit type (e.g. feat, fix)'),
		message: string('message')
			.alias('m')
			.desc('Commit message (non-interactive)'),
		scope: string('scope').alias('s').desc('Commit scope'),
		body: string('body').desc('Commit body'),
		coAuthor: string('co-author')
			.alias('c')
			.desc('Add co-author (alias or "Name <email>")'),
		multi: boolean('multi')
			.desc('Split changes into multiple logical commits using AI')
			.default(false),
		verbose: boolean('verbose')
			.desc('Show detailed output of commands being run')
			.default(false),
		yes: boolean('yes')
			.alias('y')
			.desc('Skip all prompts, accept defaults (headless mode for agents)')
			.default(false),
	},
	handler: async (opts) => {
		try {
			if (opts.verbose) {
				setVerbose(true)
			}

			const agentMode = isAgentEnvironment()
			const passthroughArgs = extraGitArgs.length > 0 ? extraGitArgs : undefined

			// Agent environment detected with no message provided —
			// output the project schema so the caller can self-format.
			if (agentMode && !opts.message && !opts.type) {
				const schema = await getProjectSchema()
				console.log(JSON.stringify(schema, null, 2))
				return
			}

			// Auto-parse full conventional commit string from -m
			// e.g. commit-it -m "feat(cli): add agent detection"
			if (opts.message && !opts.type) {
				const parsed = parseCommitMessage(opts.message)
				if (parsed.type) {
					const commit = await directCommit({
						type: parsed.type,
						message: parsed.subject,
						scope: opts.scope || parsed.scope,
						body: opts.body || parsed.body,
						breaking: opts.breaking || parsed.isBreaking,
						breakingDescription: parsed.isBreaking
							? parsed.footer || undefined
							: undefined,
						dryRun: opts.dryRun,
						stageAll: opts.all,
						amend: opts.amend,
						coAuthor: opts.coAuthor,
						extraArgs: passthroughArgs,
					})
					console.log(
						`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
					)
					return
				}
				// Could not parse — fall through with helpful error
				console.error(
					`✗ Could not parse commit type from message. Use the format: type(scope): message`,
				)
				console.error(`  Example: commit-it -m "feat(cli): add feature"`)
				process.exit(1)
			}

			// First-run setup wizard (skip in headless/agent mode)
			if (!opts.yes && !agentMode && !opts.noAi && (await needsSetup())) {
				const result = await runSetupWizard()
				if (result?.ai?.auto) {
					opts.ai = true
				}
			}

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
					extraArgs: passthroughArgs,
				})
				console.log(
					`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
				)
				return
			}

			// Multi-commit mode
			if (opts.multi) {
				if (opts.noAi) {
					console.error('✗ --multi requires AI. Cannot use with --no-ai.')
					process.exit(1)
				}
				const results = await multiCommit({
					skipGithub: opts.noGithub,
					dryRun: opts.dryRun,
					stageAll: opts.all,
					provider: opts.provider,
					coAuthor: opts.coAuthor,
					headless: opts.yes,
					extraArgs: passthroughArgs,
				})
				for (const result of results) {
					console.log(`✓ Commit created: ${result.hash}`)
				}
				console.log(`\n✓ Created ${results.length} commits`)
				return
			}

			// In agent mode without -m, we already output schema above.
			// If we reach here with agentMode, the agent passed --type
			// without --message, which is an error.
			if (agentMode && !opts.message) {
				console.error('✗ Agent mode requires -m "type(scope): message"')
				process.exit(1)
			}

			const autoAI = await shouldAutoAI()
			// In agent mode, skip AI generation — the agent has better context
			const useAI = agentMode ? false : opts.noAi ? false : opts.ai || autoAI
			const commit = await interactiveCommit({
				skipGithub: opts.noGithub,
				dryRun: opts.dryRun,
				stageAll: opts.all,
				amend: opts.amend,
				breaking: opts.breaking,
				useAI,
				provider: opts.provider,
				coAuthor: opts.coAuthor,
				headless: opts.yes || agentMode,
				extraArgs: passthroughArgs,
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
