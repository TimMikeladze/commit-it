import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { confirm, isCancel, select } from '@clack/prompts'
import { getConfigPath, loadUserAIConfig } from './ai/config'
import { detectAvailableCLI } from './ai/detect'
import type { ProviderName, UserAIConfig } from './ai/types'

export async function needsSetup(): Promise<boolean> {
	const config = await loadUserAIConfig()
	return config === null
}

export async function runSetupWizard(): Promise<UserAIConfig | null> {
	console.log('\n🔧 First-time setup — configuring AI commit messages\n')

	// Detect available CLIs
	const detected = await detectAvailableCLI()
	if (detected) {
		console.log(`   Detected: ${detected} CLI\n`)
	}

	// 1. Choose preferred provider
	const provider = await select<ProviderName>({
		message: 'Preferred AI provider',
		options: [
			{ value: 'claude', label: 'Claude Code (claude)', hint: 'Anthropic' },
			{ value: 'codex', label: 'Codex CLI (codex)', hint: 'OpenAI' },
			{ value: 'agent', label: 'Cursor Agent (agent)', hint: 'Cursor' },
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

	// 2. Auto-AI?
	const auto = await confirm({
		message:
			'Always generate AI suggestions? (otherwise use --ai flag per commit)',
		initialValue: true,
	})

	if (isCancel(auto)) {
		return null
	}

	const config: UserAIConfig = {
		ai: {
			auto: auto as boolean,
			provider,
			providers: [{ name: provider }],
		},
	}

	// 3. Write config
	const configPath = getConfigPath()
	const dir = dirname(configPath)
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
	writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n')
	console.log(`\n✓ Saved to ${configPath}\n`)

	return config
}
