import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
	confirm,
	intro,
	isCancel,
	log,
	outro,
	select,
	text,
} from '@clack/prompts'
import { getConfigPath, loadUserAIConfig } from './ai/config'
import { detectAvailableCLI } from './ai/detect'
import type { ProviderName, UserAIConfig } from './ai/types'

const PROVIDER_MODELS: Record<
	string,
	Array<{ value: string; label: string; hint?: string }>
> = {
	claude: [
		{
			value: 'claude-haiku-4-5-20251001',
			label: 'Haiku 4.5',
			hint: 'fastest, recommended',
		},
		{
			value: 'claude-sonnet-4-6-20250514',
			label: 'Sonnet 4.6',
			hint: 'balanced',
		},
		{
			value: 'claude-opus-4-6-20250514',
			label: 'Opus 4.6',
			hint: 'most capable',
		},
	],
	codex: [
		{ value: 'o4-mini', label: 'o4-mini', hint: 'fastest, recommended' },
		{ value: 'o3', label: 'o3', hint: 'balanced' },
		{ value: 'gpt-4.1', label: 'GPT-4.1', hint: 'most capable' },
	],
	agent: [
		{
			value: 'claude-haiku-4-5-20251001',
			label: 'Haiku 4.5',
			hint: 'fastest, recommended',
		},
		{
			value: 'claude-sonnet-4-6-20250514',
			label: 'Sonnet 4.6',
			hint: 'balanced',
		},
		{
			value: 'claude-opus-4-6-20250514',
			label: 'Opus 4.6',
			hint: 'most capable',
		},
	],
}

const EDITOR_OPTIONS = [
	{ value: '', label: 'System default', hint: '$VISUAL or $EDITOR or vi' },
	{ value: 'code --wait', label: 'VS Code' },
	{ value: 'cursor --wait', label: 'Cursor' },
	{ value: 'vim', label: 'Vim' },
	{ value: 'nvim', label: 'Neovim' },
	{ value: 'nano', label: 'Nano' },
	{ value: 'emacs', label: 'Emacs' },
] as const

export async function needsSetup(): Promise<boolean> {
	const config = await loadUserAIConfig()
	return config === null
}

export async function runSetupWizard(): Promise<UserAIConfig | null> {
	intro('commit-it setup')

	// Detect available CLIs
	const detected = await detectAvailableCLI()
	if (detected) {
		log.info(`Detected ${detected} CLI`)
	}

	// 1. Choose preferred provider
	const provider = await select<ProviderName>({
		message: 'AI provider',
		options: [
			{ value: 'claude', label: 'Claude Code', hint: 'Anthropic' },
			{ value: 'codex', label: 'Codex CLI', hint: 'OpenAI' },
			{ value: 'opencode', label: 'OpenCode', hint: 'opencode-ai' },
			{ value: 'agent', label: 'Cursor Agent', hint: 'Cursor' },
			{
				value: 'custom',
				label: 'Custom CLI',
				hint: 'configure command later',
			},
		],
		initialValue: detected ?? 'claude',
	})

	if (isCancel(provider)) {
		return null
	}

	// 2. Choose model (if provider has model options)
	let model: string | undefined
	const models = PROVIDER_MODELS[provider]
	if (models && models.length > 0) {
		const selectedModel = await select({
			message: 'Model',
			options: models,
			initialValue: models[0]?.value,
		})

		if (isCancel(selectedModel)) {
			return null
		}
		model = selectedModel
	}

	// 3. Auto-AI?
	const auto = await confirm({
		message: 'Always use AI? (use --no-ai to skip per commit)',
		initialValue: true,
	})

	if (isCancel(auto)) {
		return null
	}

	// 4. Choose commit style
	const preset = await select({
		message: 'Commit style',
		options: [
			{
				value: 'conventional',
				label: 'Conventional Commits',
				hint: 'feat(auth): add login endpoint',
			},
			{
				value: 'gitmoji',
				label: 'Gitmoji',
				hint: '✨ add dark mode support',
			},
		],
		initialValue: 'conventional',
	})

	if (isCancel(preset)) {
		return null
	}

	// 5. Choose editor
	const editorChoice = await select({
		message: 'Editor for commit editing',
		options: [
			...EDITOR_OPTIONS,
			{ value: '__custom__', label: 'Custom', hint: 'enter command' },
		],
		initialValue: '',
	})

	if (isCancel(editorChoice)) {
		return null
	}

	let editor = editorChoice === '__custom__' ? '' : editorChoice
	if (editorChoice === '__custom__') {
		const customEditor = await text({
			message: 'Editor command',
			placeholder: 'e.g. subl --wait',
			validate: (val) =>
				val && val.length > 0 ? undefined : 'Command cannot be empty',
		})
		if (isCancel(customEditor)) {
			return null
		}
		editor = customEditor
	}

	const config: UserAIConfig = {
		ai: {
			auto: auto as boolean,
			provider,
			providers: [{ name: provider, model }],
		},
		editor: editor || undefined,
		preset,
	}

	// Write config
	const configPath = getConfigPath()
	const dir = dirname(configPath)
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
	writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`)

	outro(`Saved to ${configPath}`)

	return config
}
