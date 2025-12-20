import { confirm, isCancel, select, text } from '@clack/prompts'
import { loadConfig } from '../config'
import { getPreset } from '../presets'
import { FormatValidator } from '../services/format'
import { GitService } from '../services/git'
import { GitHubService } from '../services/github'

export interface InteractiveOptions {
	preset?: string
	skipGithub?: boolean
	dryRun?: boolean
	stageAll?: boolean
}

export interface CommitResult {
	hash: string
}

export async function interactiveCommit(
	options: InteractiveOptions,
): Promise<CommitResult> {
	const config = (await loadConfig()) as any
	const presetName = options.preset || config?.preset
	const preset = getPreset(presetName)
	const validator = new FormatValidator(preset)

	// Initialize services
	const github = new GitHubService(
		!options.skipGithub && (config?.github?.enabled !== false),
	)
	const git = new GitService()

	// Get GitHub context
	const context = await github.detectContext()

	// 1. Select commit type
	const availableTypes = validator.getAvailableTypes()
	const type = await select({
		message: 'Select commit type',
		options: availableTypes.map((t) => ({
			value: t.value,
			label: `${t.value.padEnd(10)} ${t.desc}`,
		})),
		initialValue:
			context.suggestedType || availableTypes[0]?.value || 'feat',
	})

	if (isCancel(type)) {
		throw new Error('Cancelled')
	}

	// 2. Select scope (optional)
	const scopes = validator.getAvailableScopes()
	let scope = ''
	if (scopes.length > 0) {
		const selectedScope = await select({
			message: 'Select scope (or skip)',
			options: [
				{ value: '', label: '(none)' },
				...scopes.map((s) => ({ value: s, label: s })),
			],
			initialValue: config?.defaults?.scope || '',
		})

		if (isCancel(selectedScope)) {
			throw new Error('Cancelled')
		}
		scope = selectedScope
	}

	// 3. Search/select issue
	let issueNumber: number | undefined
	const searchIssue = await confirm({
		message: 'Reference a GitHub issue?',
		initialValue: config?.github?.auto?.detectIssues !== false,
	})

	if (isCancel(searchIssue)) {
		throw new Error('Cancelled')
	}

	if (searchIssue) {
		const issueQuery = await text({
			message: 'Search issues (number or keyword)',
			placeholder: '123 or "login bug"',
		})

		if (isCancel(issueQuery)) {
			throw new Error('Cancelled')
		}

		if (issueQuery) {
			try {
				const issues = await github.searchIssues(issueQuery)
				if (issues.length > 0) {
					const selectedIssue = await select({
						message: 'Select issue',
						options: issues.map((i) => ({
							value: i.number,
							label: `#${i.number} - ${i.title}`,
						})),
					})

					if (!isCancel(selectedIssue)) {
						issueNumber = selectedIssue as number
					}
				}
			} catch {
				// Silently continue if issue search fails
			}
		}
	}

	// 4. Enter commit message
	const message = await text({
		message: 'Commit message',
		placeholder: 'Concise description of changes',
		validate: (val) => (val.length > 0 ? undefined : 'Message cannot be empty'),
	})

	if (isCancel(message)) {
		throw new Error('Cancelled')
	}

	// 5. Add body (optional)
	let body = ''
	const addBody = await confirm({
		message: 'Add detailed body?',
		initialValue: config?.defaults?.includeBody !== false,
	})

	if (isCancel(addBody)) {
		throw new Error('Cancelled')
	}

	if (addBody) {
		const bodyText = await text({
			message: 'Body (details, motivation, etc.)',
			placeholder: 'Optional detailed description',
		})

		if (!isCancel(bodyText)) {
			body = bodyText
		}
	}

	// 6. Preview and confirm
	let fullMessage = `${type}`
	if (scope) fullMessage += `(${scope})`
	fullMessage += `: ${message}`
	if (body) fullMessage += `\n\n${body}`
	if (issueNumber) fullMessage += `\n\nCloses #${issueNumber}`

	console.log('\n📝 Commit preview:\n')
	console.log(fullMessage)
	console.log()

	const confirmed = await confirm({
		message: 'Create commit?',
		initialValue: true,
	})

	if (isCancel(confirmed) || !confirmed) {
		throw new Error('Cancelled')
	}

	// 7. Create commit
	if (options.stageAll) {
		await git.stageAll()
	}

	const result = await git.createCommit({
		type,
		scope: scope || undefined,
		message,
		body: body || undefined,
		issue: issueNumber,
		dryRun: options.dryRun,
	})

	return result
}
