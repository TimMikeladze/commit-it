import {
	confirm,
	isCancel,
	log,
	multiselect,
	note,
	select,
	text,
} from '@clack/prompts'
import { default as search } from '@inquirer/search'
import { loadConfig } from '../config'
import { getPreset } from '../presets'
import {
	generateCommitMessage,
	generateMultiCommitPlan,
	isAIAvailable,
	NO_CLI_ERROR_MESSAGE,
} from '../services/ai'
import { loadUserAIConfig } from '../services/ai/config'
import {
	type CoAuthor,
	formatCoAuthor,
	getAllCoAuthors,
	parseCoAuthor,
} from '../services/coauthor'
import { editInEditor } from '../services/editor'
import { FormatValidator } from '../services/format'
import {
	type CommitResult,
	GitService,
	type IssueReference,
} from '../services/git'
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
	provider?: string
	coAuthor?: string
	headless?: boolean
	multi?: boolean
	extraArgs?: string[]
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
	extraArgs?: string[]
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
	const userConfig = await loadUserAIConfig()
	const presetName = options.preset || userConfig?.preset || config.preset
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
		config.scopes,
	)

	// If amending, load last commit data
	let lastCommit = null
	if (options.amend) {
		lastCommit = await git.getLastCommit()
		if (!lastCommit) {
			throw new Error('No previous commit to amend')
		}
		log.info(
			`Amending commit: ${lastCommit.hash.slice(0, 7)} ${lastCommit.fullMessage.split('\n')[0]}`,
		)
	}

	// Stage all early so AI (and the rest of the flow) can see the diff
	if (options.stageAll) {
		await git.stageAll()
	}

	// Check for staged changes
	if (!options.amend) {
		const status = await git.getStatus()
		if (status.staged.length === 0) {
			throw new Error(
				'No staged changes. Stage files with `git add` first, or use --all.',
			)
		}
	}

	// AI generation (if requested)
	let aiSuggestion = null
	if (options.useAI) {
		const available = await isAIAvailable(options.provider)
		if (!available) {
			log.error(NO_CLI_ERROR_MESSAGE)
			throw new Error('No AI CLI available')
		}

		log.step('Generating commit message with AI...')
		const diff = await git.getStagedDiff()
		if (diff) {
			aiSuggestion = await generateCommitMessage(
				diff,
				{
					branchName: await git.getBranchName(),
					existingTypes: validator.getAvailableTypes(),
					presetName: preset.name,
					template: preset.template,
				},
				options.provider,
			)
			if (aiSuggestion) {
				const header = `${aiSuggestion.type}${aiSuggestion.scope ? `(${aiSuggestion.scope})` : ''}: ${aiSuggestion.message}`
				const body = aiSuggestion.body ? `\n${aiSuggestion.body}` : ''
				note(header + body, 'AI suggestion')

				// Headless mode: auto-accept and commit immediately
				if (options.headless) {
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
					return git.createCommit({
						type: aiSuggestion.type,
						scope: aiSuggestion.scope,
						message: aiSuggestion.message,
						body: aiSuggestion.body,
						breaking: aiSuggestion.breaking,
						coauthors,
						dryRun: options.dryRun,
						amend: options.amend,
						extraArgs: options.extraArgs,
					})
				}

				const aiAction = await select({
					message: 'Use this AI-generated message?',
					options: [
						{ value: 'accept', label: 'Accept' },
						{
							value: 'edit',
							label: 'Edit in $EDITOR',
							hint: process.env.VISUAL || process.env.EDITOR || 'vi',
						},
						{ value: 'decline', label: 'Decline', hint: 'proceed manually' },
					],
					initialValue: 'accept',
				})

				if (isCancel(aiAction)) {
					throw new Error('Cancelled')
				}

				if (aiAction === 'accept') {
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
					return git.createCommit({
						type: aiSuggestion.type,
						scope: aiSuggestion.scope,
						message: aiSuggestion.message,
						body: aiSuggestion.body,
						breaking: aiSuggestion.breaking,
						coauthors,
						dryRun: options.dryRun,
						amend: options.amend,
						extraArgs: options.extraArgs,
					})
				}

				if (aiAction === 'edit') {
					const header = `${aiSuggestion.type}${aiSuggestion.scope ? `(${aiSuggestion.scope})` : ''}: ${aiSuggestion.message}`
					const full = aiSuggestion.body
						? `${header}\n\n${aiSuggestion.body}`
						: header
					const edited = await editInEditor(full)
					const lines = edited.split('\n')
					const headerLine = lines[0] ?? ''
					const headerMatch = headerLine.match(
						/^(\S+)(?:\(([^)]*)\))?:\s*(.*)$/,
					)
					if (headerMatch) {
						aiSuggestion = {
							...aiSuggestion,
							type: headerMatch[1]!,
							scope: headerMatch[2] || undefined,
							message: headerMatch[3]!,
							body: lines.slice(2).join('\n').trim() || undefined,
						}
					} else {
						aiSuggestion = {
							...aiSuggestion,
							message: headerLine,
							body: lines.slice(2).join('\n').trim() || undefined,
						}
					}
				} else if (aiAction === 'decline') {
					aiSuggestion = null
				}
			} else {
				log.warn(
					'AI could not generate a suggestion, falling back to manual mode.',
				)
				if (options.headless) {
					throw new Error('AI failed to generate a commit message')
				}
			}
		}
	} else if (options.headless) {
		throw new Error('Headless mode requires --ai flag')
	}

	// AI accepted — skip manual prompts, go to preview/confirm
	if (aiSuggestion) {
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

		// Edit loop: preview → confirm/edit/cancel
		let currentSuggestion = aiSuggestion
		while (true) {
			let fullMessage = currentSuggestion.type
			if (currentSuggestion.scope) fullMessage += `(${currentSuggestion.scope})`
			if (currentSuggestion.breaking) fullMessage += '!'
			fullMessage += `: ${currentSuggestion.message}`
			if (currentSuggestion.body) fullMessage += `\n\n${currentSuggestion.body}`
			if (currentSuggestion.breaking) {
				fullMessage += `\n\nBREAKING CHANGE: ${currentSuggestion.breaking}`
			}
			if (coauthors.length > 0) {
				fullMessage += `\n\n${coauthors.join('\n')}`
			}

			note(fullMessage, 'Commit preview')

			const validationConfig = config.validation || getDefaultValidationConfig()
			const aiValidation = {
				...validationConfig,
				scopeValidation:
					validationConfig.scopeValidation ?? config.scopeValidation,
			}
			const aiPredefinedScopes = (config.scopes || []).map((s) =>
				typeof s === 'string' ? s : s.value,
			)
			if (validationConfig.enabled) {
				const validationResult = validateCommitMessage(
					fullMessage,
					aiValidation,
					aiPredefinedScopes,
				)
				if (!validationResult.valid) {
					log.error(
						`Validation failed:\n${formatValidationResult(validationResult)}`,
					)
				} else if (validationResult.warnings.length > 0) {
					log.warn(
						`Validation warnings:\n${formatValidationResult(validationResult)}`,
					)
				}
			}

			const action = await select({
				message: options.amend ? 'Amend commit?' : 'Create commit?',
				options: [
					{ value: 'confirm', label: 'Confirm' },
					{
						value: 'edit',
						label: 'Edit in $EDITOR',
						hint: process.env.VISUAL || process.env.EDITOR || 'vi',
					},
					{ value: 'cancel', label: 'Cancel' },
				],
				initialValue: 'confirm',
			})

			if (isCancel(action) || action === 'cancel') {
				throw new Error('Cancelled')
			}

			if (action === 'edit') {
				const editable = currentSuggestion.body
					? `${currentSuggestion.type}${currentSuggestion.scope ? `(${currentSuggestion.scope})` : ''}: ${currentSuggestion.message}\n\n${currentSuggestion.body}`
					: `${currentSuggestion.type}${currentSuggestion.scope ? `(${currentSuggestion.scope})` : ''}: ${currentSuggestion.message}`
				const edited = await editInEditor(editable)
				const lines = edited.split('\n')
				const headerLine = lines[0] ?? ''
				const headerMatch = headerLine.match(/^(\S+)(?:\(([^)]*)\))?:\s*(.*)$/)
				if (headerMatch) {
					currentSuggestion = {
						...currentSuggestion,
						type: headerMatch[1]!,
						scope: headerMatch[2] || undefined,
						message: headerMatch[3]!,
						body: lines.slice(2).join('\n').trim() || undefined,
					}
				} else {
					currentSuggestion = {
						...currentSuggestion,
						message: headerLine,
						body: lines.slice(2).join('\n').trim() || undefined,
					}
				}
				continue
			}

			// Confirmed
			return git.createCommit({
				type: currentSuggestion.type,
				scope: currentSuggestion.scope,
				message: currentSuggestion.message,
				body: currentSuggestion.body,
				breaking: currentSuggestion.breaking,
				coauthors,
				dryRun: options.dryRun,
				amend: options.amend,
				extraArgs: options.extraArgs,
			})
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
	const scopeValidation = config.scopeValidation || 'off'
	const presetScopes = validator.getAvailableScopes()

	// Build scope options from multiple sources
	const scopeOptions: Array<{ value: string; label: string }> = []

	// Add AI/last commit scope first if available
	const suggestedScope = lastCommit?.scope
	if (
		suggestedScope &&
		!scopeSuggestions.find((s) => s.value === suggestedScope)
	) {
		scopeOptions.push({
			value: suggestedScope,
			label: `${suggestedScope} (suggested)`,
		})
	}

	// Add hybrid scope suggestions (with descriptions)
	for (const suggestion of scopeSuggestions) {
		let hint: string
		if (suggestion.source === 'label') {
			hint = suggestion.color
				? formatLabelColor(
						suggestion.label || suggestion.value,
						suggestion.color,
					)
				: `label: ${suggestion.label}`
		} else if (suggestion.source === 'predefined' && suggestion.desc) {
			hint = suggestion.desc
		} else {
			hint = suggestion.source
		}
		scopeOptions.push({
			value: suggestion.value,
			label: `${suggestion.value} — ${hint}`,
		})
	}

	// Add preset scopes not already in suggestions
	for (const s of presetScopes) {
		if (!scopeOptions.find((o) => o.value === s.value)) {
			scopeOptions.push({
				value: s.value,
				label: s.desc ? `${s.value} — ${s.desc}` : s.value,
			})
		}
	}

	if (scopeOptions.length > 0) {
		if (scopeMode === 'single') {
			if (scopeValidation === 'strict') {
				// Strict mode: closed list with optional custom override
				const singleOptions = [
					{ value: '', label: '(none)' },
					...scopeOptions,
					{ value: '__custom__', label: 'other (override)' },
				]
				const selectedScope = await select({
					message: 'Select scope',
					options: singleOptions,
					initialValue: suggestedScope || config.defaults?.scope || '',
				})

				if (isCancel(selectedScope)) {
					throw new Error('Cancelled')
				}
				if (selectedScope === '__custom__') {
					const customScope = await text({
						message: 'Enter custom scope',
						placeholder: 'e.g. auth, payments',
						validate: (val) =>
							val && val.length > 0 ? undefined : 'Scope cannot be empty',
					})
					if (isCancel(customScope)) {
						throw new Error('Cancelled')
					}
					const confirmOverride = await confirm({
						message: `Scope "${customScope}" is not predefined. Use anyway?`,
						initialValue: false,
					})
					if (isCancel(confirmOverride) || !confirmOverride) {
						throw new Error('Cancelled')
					}
					scopes = [customScope]
				} else if (selectedScope) {
					scopes = [selectedScope]
				}
			} else {
				// Warn/off mode: open list allowing freeform
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
				source: async (
					input: string | undefined,
					{ signal }: { signal: AbortSignal },
				) => {
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
		initialValue: lastCommit?.message || '',
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
		initialValue: config.defaults?.includeBody !== false || !!lastCommit?.body,
	})

	if (isCancel(addBody)) {
		throw new Error('Cancelled')
	}

	if (addBody) {
		const bodyText = await text({
			message: 'Body (details, motivation, etc.)',
			placeholder: 'Optional detailed description',
			initialValue: lastCommit?.body || '',
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

	note(fullMessage, 'Commit preview')

	// Validate commit message
	const validationConfig = config.validation || getDefaultValidationConfig()
	const interactiveValidation = {
		...validationConfig,
		scopeValidation: validationConfig.scopeValidation ?? config.scopeValidation,
	}
	const interactivePredefinedScopes = (config.scopes || []).map((s) =>
		typeof s === 'string' ? s : s.value,
	)
	if (validationConfig.enabled) {
		const validationResult = validateCommitMessage(
			fullMessage,
			interactiveValidation,
			interactivePredefinedScopes,
		)

		if (!validationResult.valid) {
			log.error(
				`Validation failed:\n${formatValidationResult(validationResult)}`,
			)

			const continueAnyway = await confirm({
				message: 'Continue with invalid commit message?',
				initialValue: false,
			})

			if (isCancel(continueAnyway) || !continueAnyway) {
				throw new Error('Cancelled')
			}
		} else if (validationResult.warnings.length > 0) {
			log.warn(
				`Validation warnings:\n${formatValidationResult(validationResult)}`,
			)
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
		extraArgs: options.extraArgs,
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
		const validScopes = validator.getAvailableScopeValues().join(', ')
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
	// Propagate scopeValidation from config to validation config
	const effectiveValidation = {
		...validationConfig,
		scopeValidation: validationConfig.scopeValidation ?? config.scopeValidation,
	}
	// Collect predefined scope values for validation
	const predefinedScopeValues = (config.scopes || []).map((s) =>
		typeof s === 'string' ? s : s.value,
	)
	if (effectiveValidation.enabled) {
		let fullMessage = `${options.type}${options.scope ? `(${options.scope})` : ''}${options.breaking ? '!' : ''}: ${options.message}`
		if (options.body) {
			fullMessage += `\n\n${options.body}`
		}
		const breakingDesc = options.breaking
			? options.breakingDescription || 'breaking change'
			: undefined
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
		const validationResult = validateCommitMessage(
			fullMessage,
			effectiveValidation,
			predefinedScopeValues,
		)
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
		breaking: options.breaking
			? options.breakingDescription || 'breaking change'
			: undefined,
		issueRefs: options.issueRefs,
		coauthors,
		dryRun: options.dryRun,
		amend: options.amend,
		extraArgs: options.extraArgs,
	})
}

/**
 * Multi-commit — uses AI to split staged changes into multiple logical commits.
 */
export async function multiCommit(
	options: InteractiveOptions,
): Promise<CommitResult[]> {
	const config = await loadConfig()
	const userCfg = await loadUserAIConfig()
	const presetName = options.preset || userCfg?.preset || config.preset
	const preset = getPreset(presetName)
	const validator = new FormatValidator(preset)
	const git = new GitService()

	const available = await isAIAvailable(options.provider)
	if (!available) {
		log.error(NO_CLI_ERROR_MESSAGE)
		throw new Error('No AI CLI available. --multi requires AI.')
	}

	if (options.stageAll) {
		await git.stageAll()
	}

	const diff = await git.getStagedDiff()
	if (!diff) {
		throw new Error('No staged changes to commit')
	}

	const stagedFiles = await git.getStagedFiles()
	if (stagedFiles.length === 0) {
		throw new Error('No staged files to commit')
	}

	log.step('Analyzing changes for multi-commit split...')

	const plan = await generateMultiCommitPlan(
		diff,
		stagedFiles,
		{
			branchName: await git.getBranchName(),
			existingTypes: validator.getAvailableTypes(),
			presetName: preset.name,
			template: preset.template,
		},
		options.provider,
	)

	if (!plan || plan.commits.length === 0) {
		throw new Error('AI failed to generate a multi-commit plan')
	}

	let commits = plan.commits

	// Edit loop: show plan → confirm/edit/cancel
	while (true) {
		const planText = commits
			.map((commit, i) => {
				const header = `${commit.type}${commit.scope ? `(${commit.scope})` : ''}: ${commit.message}`
				return `${i + 1}. ${header}\n   Files: ${commit.files.join(', ')}`
			})
			.join('\n\n')
		note(planText, `${commits.length} commits`)

		if (options.headless) {
			break
		}

		const action = await select({
			message: 'Create these commits?',
			options: [
				{ value: 'confirm', label: 'Confirm' },
				{
					value: 'edit',
					label: 'Edit in $EDITOR',
					hint: process.env.VISUAL || process.env.EDITOR || 'vi',
				},
				{ value: 'cancel', label: 'Cancel' },
			],
			initialValue: 'confirm',
		})

		if (isCancel(action) || action === 'cancel') {
			throw new Error('Cancelled')
		}

		if (action === 'edit') {
			const editable = commits
				.map((c) => {
					let block = `${c.type}${c.scope ? `(${c.scope})` : ''}: ${c.message}`
					if (c.body) block += `\n${c.body}`
					block += `\nFiles: ${c.files.join(', ')}`
					return block
				})
				.join('\n\n---\n\n')

			const edited = await editInEditor(editable)
			const blocks = edited.split(/\n---\n/).map((b) => b.trim())
			commits = blocks
				.filter((b) => b.length > 0)
				.map((block) => {
					const lines = block.split('\n')
					const headerLine = lines[0] ?? ''
					const headerMatch = headerLine.match(
						/^(\S+)(?:\(([^)]*)\))?:\s*(.*)$/,
					)

					const filesLine = lines.find((l) => l.startsWith('Files:'))
					const files = filesLine
						? filesLine
								.replace('Files:', '')
								.split(',')
								.map((f) => f.trim())
								.filter(Boolean)
						: []

					const bodyLines = lines
						.slice(1)
						.filter((l) => !l.startsWith('Files:'))
					const body = bodyLines.join('\n').trim() || undefined

					if (headerMatch) {
						return {
							type: headerMatch[1]!,
							scope: headerMatch[2] || undefined,
							message: headerMatch[3]!,
							body,
							files,
						}
					}
					return {
						type: 'chore',
						message: headerLine,
						body,
						files,
					}
				})
			continue
		}

		break
	}

	if (options.dryRun) {
		return commits.map((commit) => ({
			hash: 'dry-run',
			message: `${commit.type}${commit.scope ? `(${commit.scope})` : ''}: ${commit.message}`,
		}))
	}

	await git.unstageAll()

	const results: CommitResult[] = []
	for (const commit of commits) {
		await git.stageFiles(commit.files)
		const result = await git.createCommit({
			type: commit.type,
			scope: commit.scope,
			message: commit.message,
			body: commit.body,
			dryRun: false,
			extraArgs: options.extraArgs,
		})
		results.push(result)
	}

	return results
}
