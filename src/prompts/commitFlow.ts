import { confirm, isCancel, multiselect, select, text } from '@clack/prompts'
import search from '@inquirer/search'
import { loadConfig } from '../config'
import { getPreset } from '../presets'
import { generateCommitMessage, isAIAvailable } from '../services/ai'
import {
	type CoAuthor,
	formatCoAuthor,
	getAllCoAuthors,
	parseCoAuthor,
} from '../services/coauthor'
import { FormatValidator } from '../services/format'
import { type CommitResult, GitService, type IssueReference } from '../services/git'
import { formatLabelColor, GitHubService, type Issue } from '../services/github'
import { getAllScopeSuggestions } from '../services/scope'
import {
	formatValidationResult,
	getDefaultValidationConfig,
	validateCommitMessage,
} from '../services/validation'

export interface InteractiveOptions {
	preset?: string
	skipGithub?: boolean
	dryRun?: boolean
	stageAll?: boolean
	amend?: boolean
	breaking?: boolean
	useAI?: boolean
	coAuthor?: string
}

export interface DirectCommitOptions {
	type: string
	message: string
	scope?: string
	body?: string
	breaking?: boolean
	breakingDescription?: string
	issueRefs?: IssueReference[]
	dryRun?: boolean
	stageAll?: boolean
	amend?: boolean
	coAuthor?: string
}

export type { CommitResult }

const ISSUE_ACTIONS = [
	{ value: 'Closes', label: 'Closes', desc: 'Auto-close issue when merged' },
	{ value: 'Fixes', label: 'Fixes', desc: 'Auto-close issue when merged' },
	{
		value: 'Resolves',
		label: 'Resolves',
		desc: 'Auto-close issue when merged',
	},
	{ value: 'Ref', label: 'Ref', desc: 'Just mention (no auto-close)' },
] as const

export async function interactiveCommit(
	options: InteractiveOptions,
): Promise<CommitResult> {
	const config = await loadConfig()
	const presetName = options.preset || config.preset
	const preset = getPreset(presetName)
	const validator = new FormatValidator(preset)

	// Initialize services
	const github = new GitHubService(
		!options.skipGithub && config.github?.enabled !== false,
	)
	const git = new GitService()

	// Get GitHub context
	const context = await github.detectContext()

	// Get changed files for scope suggestions
	const changedFiles = await git.getChangedFiles()
	const labelPatterns = config.github?.scopeLabelPatterns || [
		'scope:',
		'scope/',
		'area:',
		'area/',
		'component:',
		'component/',
	]
	const scopeSuggestions = getAllScopeSuggestions(
		changedFiles,
		config.scopeMap,
		context.prLabels || [],
		labelPatterns,
	)

	// If amending, load last commit data
	let lastCommit = null
	if (options.amend) {
		lastCommit = await git.getLastCommit()
		if (!lastCommit) {
			throw new Error('No previous commit to amend')
		}
		console.log(`\n📝 Amending commit: ${lastCommit.hash.slice(0, 7)}`)
		console.log(`   ${lastCommit.fullMessage.split('\n')[0]}\n`)
	}

	// AI generation (if requested)
	let aiSuggestion = null
	if (options.useAI && isAIAvailable(config)) {
		console.log('🤖 Generating commit message with AI...\n')
		const diff = await git.getStagedDiff()
		if (diff) {
			const types = validator.getAvailableTypes().map((t) => t.value)
			aiSuggestion = await generateCommitMessage(diff, config, {
				branchName: await git.getBranchName(),
				existingTypes: types,
			})
			if (aiSuggestion) {
				console.log('✨ AI suggestion:')
				console.log(
					`   ${aiSuggestion.type}${aiSuggestion.scope ? `(${aiSuggestion.scope})` : ''}: ${aiSuggestion.message}`,
				)
				if (aiSuggestion.body) {
					console.log(`   ${aiSuggestion.body.split('\n')[0]}...`)
				}
				console.log()

				const useAI = await confirm({
					message: 'Use this AI-generated message?',
					initialValue: true,
				})

				if (isCancel(useAI)) {
					throw new Error('Cancelled')
				}

				if (!useAI) {
					aiSuggestion = null // User declined, proceed manually
				}
			}
		}
	}

	// 1. Select commit type
	const availableTypes = validator.getAvailableTypes()
	const type = await select({
		message: 'Select commit type',
		options: availableTypes.map((t) => ({
			value: t.value,
			label: t.value,
			hint: t.desc,
		})),
		initialValue:
			aiSuggestion?.type ||
			lastCommit?.type ||
			context.suggestedType ||
			availableTypes[0]?.value ||
			'feat',
	})

	if (isCancel(type)) {
		throw new Error('Cancelled')
	}

	// 2. Select scope with hybrid suggestions
	let scopes: string[] = []
	const scopeMode = config.scopeMode || 'single'
	const presetScopes = validator.getAvailableScopes()

	// Build scope options from multiple sources
	const scopeOptions: Array<{ value: string; label: string }> = []

	// Add AI/last commit scope first if available
	const suggestedScope = aiSuggestion?.scope || lastCommit?.scope
	if (
		suggestedScope &&
		!scopeSuggestions.find((s) => s.value === suggestedScope)
	) {
		scopeOptions.push({
			value: suggestedScope,
			label: `${suggestedScope} (suggested)`,
		})
	}

	// Add hybrid scope suggestions
	for (const suggestion of scopeSuggestions) {
		let sourceLabel: string
		if (suggestion.source === 'label') {
			// Show colored label badge if color is available
			sourceLabel = suggestion.color
				? formatLabelColor(
						suggestion.label || suggestion.value,
						suggestion.color,
					)
				: `label: ${suggestion.label}`
		} else {
			sourceLabel = 'config'
		}
		scopeOptions.push({
			value: suggestion.value,
			label: `${suggestion.value} (${sourceLabel})`,
		})
	}

	// Add preset scopes
	for (const s of presetScopes) {
		if (!scopeOptions.find((o) => o.value === s)) {
			scopeOptions.push({ value: s, label: s })
		}
	}

	if (scopeOptions.length > 0) {
		if (scopeMode === 'single') {
			// Single scope selection (original behavior)
			const singleOptions = [{ value: '', label: '(none)' }, ...scopeOptions]
			const selectedScope = await select({
				message: 'Select scope (or skip)',
				options: singleOptions,
				initialValue: suggestedScope || config.defaults?.scope || '',
			})

			if (isCancel(selectedScope)) {
				throw new Error('Cancelled')
			}
			if (selectedScope) {
				scopes = [selectedScope]
			}
		} else {
			// Multi-scope selection
			const hint =
				scopeMode === 'multi-inline'
					? 'comma-separated in header'
					: 'first in header, rest in body'
			const selectedScopes = await multiselect({
				message: `Select scopes (${hint})`,
				options: scopeOptions,
				required: false,
			})

			if (isCancel(selectedScopes)) {
				throw new Error('Cancelled')
			}
			scopes = selectedScopes as string[]
		}
	}

	// 3. Breaking change
	let breakingDescription = ''
	const isBreaking = options.breaking || lastCommit?.isBreaking

	if (isBreaking) {
		const breakingInput = await text({
			message: 'Describe the breaking change',
			placeholder: 'What breaks and how to migrate',
			initialValue: lastCommit?.breaking || '',
			validate: (val) =>
				val && val.length > 0
					? undefined
					: 'Breaking change description required',
		})

		if (isCancel(breakingInput)) {
			throw new Error('Cancelled')
		}
		breakingDescription = breakingInput
	}

	// 4. Search/select issues (supports multiple)
	const issueRefs: IssueReference[] = []
	let addMoreIssues = await confirm({
		message: 'Reference a GitHub issue?',
		initialValue: config.github?.auto?.detectIssues !== false,
	})

	if (isCancel(addMoreIssues)) {
		throw new Error('Cancelled')
	}

	while (addMoreIssues) {
		try {
			const selectedIssue = await search<Issue | null>({
				message: 'Search issues (type to search)',
				source: async (input: string | undefined, { signal }: { signal: AbortSignal }) => {
					if (!input) {
						// Show recent open issues by default
						const issues = await github.searchIssues('state:open sort:updated')
						if (signal.aborted) return []
						return [
							...issues.map((i) => ({
								name: `#${i.number} ${i.title}`,
								value: i as Issue | null,
								description:
									i.labels.map((l) => l.name).join(', ') || undefined,
							})),
							{ name: 'Skip', value: null },
						]
					}

					// Debounce: wait 300ms before searching
					await new Promise<void>((resolve, reject) => {
						const timer = setTimeout(resolve, 300)
						signal.addEventListener('abort', () => {
							clearTimeout(timer)
							reject(signal.reason)
						})
					})
					if (signal.aborted) return []

					const issues = await github.searchIssues(input)
					if (signal.aborted) return []
					return [
						...issues.map((i) => ({
							name: `#${i.number} ${i.title}`,
							value: i as Issue | null,
							description: i.labels.map((l) => l.name).join(', ') || undefined,
						})),
						{ name: 'Skip', value: null },
					]
				},
			})

			if (selectedIssue) {
				// Ask for action keyword
				const action = await select({
					message: 'How should this issue be referenced?',
					options: ISSUE_ACTIONS.map((a) => ({
						value: a.value,
						label: a.label,
						hint: a.desc,
					})),
					initialValue: 'Closes',
				})

				if (!isCancel(action)) {
					issueRefs.push({
						action: action as IssueReference['action'],
						number: selectedIssue.number,
						title: selectedIssue.title,
					})
				}
			}
		} catch {
			// User cancelled or search failed
			break
		}

		// Ask if they want to add another issue
		if (issueRefs.length > 0) {
			const another = await confirm({
				message: 'Add another issue reference?',
				initialValue: false,
			})
			if (isCancel(another)) {
				throw new Error('Cancelled')
			}
			addMoreIssues = another
		} else {
			addMoreIssues = false
		}
	}

	// 5. Enter commit message
	const message = await text({
		message: 'Commit message',
		placeholder: 'Concise description of changes',
		initialValue: aiSuggestion?.message || lastCommit?.message || '',
		validate: (val) =>
			val && val.length > 0 ? undefined : 'Message cannot be empty',
	})

	if (isCancel(message)) {
		throw new Error('Cancelled')
	}

	// 6. Add body (optional)
	let body = ''
	const addBody = await confirm({
		message: 'Add detailed body?',
		initialValue:
			config.defaults?.includeBody !== false ||
			!!aiSuggestion?.body ||
			!!lastCommit?.body,
	})

	if (isCancel(addBody)) {
		throw new Error('Cancelled')
	}

	if (addBody) {
		const bodyText = await text({
			message: 'Body (details, motivation, etc.)',
			placeholder: 'Optional detailed description',
			initialValue: aiSuggestion?.body || lastCommit?.body || '',
		})

		if (!isCancel(bodyText)) {
			body = bodyText
		}
	}

	// 7. Co-authors
	const selectedCoAuthors: CoAuthor[] = []

	// Handle CLI co-author flag
	if (options.coAuthor) {
		const configCoAuthors = config.coauthors || {}
		const coauthorValue = configCoAuthors[options.coAuthor]
		if (coauthorValue) {
			const parsed = parseCoAuthor(coauthorValue)
			if (parsed) {
				selectedCoAuthors.push({
					...parsed,
					alias: options.coAuthor,
					source: 'config',
				})
			}
		} else {
			const parsed = parseCoAuthor(options.coAuthor)
			if (parsed) {
				selectedCoAuthors.push(parsed)
			}
		}
	}

	// Interactive co-author selection
	const addCoAuthors = await confirm({
		message: 'Add co-authors?',
		initialValue: false,
	})

	if (!isCancel(addCoAuthors) && addCoAuthors) {
		const availableCoAuthors = await getAllCoAuthors(
			config.coauthors,
			!options.skipGithub,
		)

		if (availableCoAuthors.length > 0) {
			const selected = await multiselect({
				message: 'Select co-authors',
				options: availableCoAuthors.map((ca) => ({
					value: ca,
					label: `${ca.name} <${ca.email}>${ca.alias ? ` (${ca.alias})` : ''}`,
				})),
				required: false,
			})

			if (!isCancel(selected)) {
				selectedCoAuthors.push(...(selected as CoAuthor[]))
			}
		}

		// Allow manual entry
		const addManual = await confirm({
			message: 'Add co-author manually?',
			initialValue: availableCoAuthors.length === 0,
		})

		if (!isCancel(addManual) && addManual) {
			const manualInput = await text({
				message: 'Enter co-author',
				placeholder: 'Name <email@example.com>',
			})

			if (!isCancel(manualInput) && manualInput) {
				const parsed = parseCoAuthor(manualInput)
				if (parsed) {
					selectedCoAuthors.push(parsed)
				}
			}
		}
	}

	// 8. Preview and confirm
	let fullMessage = type as string

	// Format scopes based on scopeMode
	let headerScope = ''
	let secondaryScopes: string[] = []

	if (scopes.length > 0) {
		if (scopeMode === 'multi-inline') {
			// All scopes comma-separated in header: feat(cli,config): message
			headerScope = scopes.join(',')
		} else if (scopeMode === 'multi-body') {
			// First scope in header, rest go to body
			headerScope = scopes[0] as string
			secondaryScopes = scopes.slice(1)
		} else {
			// Single mode - just use first scope
			headerScope = scopes[0] as string
		}
	}

	if (headerScope) fullMessage += `(${headerScope})`
	if (breakingDescription) fullMessage += '!'
	fullMessage += `: ${message}`

	// Build body with secondary scopes if multi-body mode
	let bodyContent = body || ''
	if (secondaryScopes.length > 0) {
		const scopeNote = `Also affects: ${secondaryScopes.join(', ')}`
		bodyContent = bodyContent ? `${bodyContent}\n\n${scopeNote}` : scopeNote
	}

	if (bodyContent) fullMessage += `\n\n${bodyContent}`

	if (breakingDescription) {
		fullMessage += `\n\nBREAKING CHANGE: ${breakingDescription}`
	}

	// Format issue references
	if (issueRefs.length > 0) {
		const issueFooter = issueRefs
			.map((ref) => `${ref.action} #${ref.number}`)
			.join('\n')
		fullMessage += `\n\n${issueFooter}`
	}

	// Format co-authors
	if (selectedCoAuthors.length > 0) {
		const coauthorFooter = selectedCoAuthors.map(formatCoAuthor).join('\n')
		fullMessage += `\n\n${coauthorFooter}`
	}

	console.log('\n📝 Commit preview:\n')
	console.log(fullMessage)
	console.log()

	// Validate commit message
	const validationConfig = config.validation || getDefaultValidationConfig()
	if (validationConfig.enabled) {
		const validationResult = validateCommitMessage(
			fullMessage,
			validationConfig,
		)

		if (!validationResult.valid) {
			console.log('❌ Validation failed:\n')
			console.log(formatValidationResult(validationResult))
			console.log()

			const continueAnyway = await confirm({
				message: 'Continue with invalid commit message?',
				initialValue: false,
			})

			if (isCancel(continueAnyway) || !continueAnyway) {
				throw new Error('Cancelled')
			}
		} else if (validationResult.warnings.length > 0) {
			console.log('⚠️  Validation warnings:\n')
			console.log(formatValidationResult(validationResult))
			console.log()
		}
	}

	const confirmed = await confirm({
		message: options.amend ? 'Amend commit?' : 'Create commit?',
		initialValue: true,
	})

	if (isCancel(confirmed) || !confirmed) {
		throw new Error('Cancelled')
	}

	// 9. Create commit
	if (options.stageAll) {
		await git.stageAll()
	}

	const result = await git.createCommit({
		type,
		scope: headerScope || undefined,
		message,
		body: bodyContent || undefined,
		breaking: breakingDescription || undefined,
		coauthors: selectedCoAuthors.map(formatCoAuthor),
		issueRefs,
		dryRun: options.dryRun,
		amend: options.amend,
	})

	return result
}

/**
 * Non-interactive commit — creates a formatted commit directly from flags.
 * Validates against the configured preset before committing.
 */
export async function directCommit(
	options: DirectCommitOptions,
): Promise<CommitResult> {
	const config = await loadConfig()
	const presetName = config.preset
	const preset = getPreset(presetName)
	const validator = new FormatValidator(preset)
	const git = new GitService()

	// Validate type
	if (!validator.validateType(options.type)) {
		const validTypes = validator
			.getAvailableTypes()
			.map((t) => t.value)
			.join(', ')
		throw new Error(
			`Invalid commit type "${options.type}". Valid types: ${validTypes}`,
		)
	}

	// Validate scope
	if (options.scope && !validator.validateScope(options.scope)) {
		const validScopes = validator.getAvailableScopes().join(', ')
		throw new Error(
			`Invalid scope "${options.scope}". Valid scopes: ${validScopes}`,
		)
	}

	// Resolve co-author
	const coauthors: string[] = []
	if (options.coAuthor) {
		const configCoAuthors = config.coauthors || {}
		const coauthorValue = configCoAuthors[options.coAuthor]
		if (coauthorValue) {
			const parsed = parseCoAuthor(coauthorValue)
			if (parsed) coauthors.push(formatCoAuthor(parsed))
		} else {
			const parsed = parseCoAuthor(options.coAuthor)
			if (parsed) coauthors.push(formatCoAuthor(parsed))
		}
	}

	// Validate the full message (must match what createCommit will produce)
	const validationConfig = config.validation || getDefaultValidationConfig()
	if (validationConfig.enabled) {
		let fullMessage = `${options.type}${options.scope ? `(${options.scope})` : ''}${options.breaking ? '!' : ''}: ${options.message}`
		if (options.body) {
			fullMessage += `\n\n${options.body}`
		}
		const breakingDesc = options.breaking ? (options.breakingDescription || 'breaking change') : undefined
		if (breakingDesc) {
			fullMessage += `\n\nBREAKING CHANGE: ${breakingDesc}`
		}
		if (options.issueRefs && options.issueRefs.length > 0) {
			const issueFooter = options.issueRefs
				.map((ref) => `${ref.action} #${ref.number}`)
				.join('\n')
			fullMessage += `\n\n${issueFooter}`
		}
		if (coauthors.length > 0) {
			fullMessage += `\n\n${coauthors.join('\n')}`
		}
		const validationResult = validateCommitMessage(fullMessage, validationConfig)
		if (!validationResult.valid) {
			throw new Error(
				`Validation failed:\n${formatValidationResult(validationResult)}`,
			)
		}
	}

	if (options.stageAll) {
		await git.stageAll()
	}

	return git.createCommit({
		type: options.type,
		scope: options.scope,
		message: options.message,
		body: options.body,
		breaking: options.breaking ? (options.breakingDescription || 'breaking change') : undefined,
		issueRefs: options.issueRefs,
		coauthors,
		dryRun: options.dryRun,
		amend: options.amend,
	})
}
