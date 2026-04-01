import type { ExecResult } from '../../utils/execFileNoThrow'
import { createAgentAdapter } from './adapters/agent'
import { createClaudeAdapter } from './adapters/claude'
import { createCodexAdapter } from './adapters/codex'
import { createCustomAdapter } from './adapters/custom'
import { verbose } from '../../utils/verbose'
import { loadUserAIConfig } from './config'
import { detectAvailableCLI } from './detect'
import type {
	AICommitSuggestion,
	AIMultiCommitPlan,
	CLIAdapter,
	GenerateContext,
	ProviderConfig,
	ProviderName,
} from './types'

export type {
	AICommitSuggestion,
	AIMultiCommitPlan,
	CLIAdapter,
	GenerateContext,
}

const MAX_DIFF_LENGTH = 8000

export const NO_CLI_ERROR_MESSAGE = `No AI CLI detected. Install one of the following:

  claude   https://docs.anthropic.com/en/docs/claude-code
  codex    https://github.com/openai/codex
  agent    https://www.cursor.com/

Or configure a custom CLI in ~/.commit-it/config.json:

  {
    "ai": {
      "providers": [
        { "name": "custom", "command": "my-tool --prompt {{prompt}}" }
      ]
    }
  }`

export function createAdapter(
	config: ProviderConfig,
	exec?: (cmd: string, args?: string[]) => Promise<ExecResult>,
): CLIAdapter {
	const opts = { model: config.model, exec }

	switch (config.name) {
		case 'claude':
			return createClaudeAdapter(opts)
		case 'codex':
			return createCodexAdapter(opts)
		case 'agent':
			return createAgentAdapter(opts)
		case 'custom':
			if (!config.command) {
				throw new Error('Custom provider requires a "command" field in config')
			}
			return createCustomAdapter({ command: config.command, exec })
	}
}

export async function resolveProvider(
	providerOverride?: string,
): Promise<CLIAdapter> {
	verbose('resolving AI provider...')
	// 1. --provider flag override
	if (providerOverride) {
		const validNames: readonly string[] = ['claude', 'codex', 'agent', 'custom']
		if (!validNames.includes(providerOverride)) {
			throw new Error(
				`Unknown provider "${providerOverride}". Valid providers: ${validNames.join(', ')}`,
			)
		}
		verbose(`provider override: ${providerOverride}`)
		const adapter = createAdapter({
			name: providerOverride as ProviderName,
		})
		if (await adapter.isAvailable()) {
			verbose(`using provider: ${adapter.name}`)
			return adapter
		}
		throw new Error(
			`Provider "${providerOverride}" is not available. Is it installed?`,
		)
	}

	// 2 & 3. User config: provider field, then first in providers array
	const userConfig = await loadUserAIConfig()
	if (userConfig?.ai) {
		const { provider, providers } = userConfig.ai
		verbose(`config provider: ${provider ?? '(none)'}, providers: [${providers.map((p) => `${p.name}${p.model ? `:${p.model}` : ''}`).join(', ')}]`)

		if (provider) {
			const providerConfig = providers.find((p) => p.name === provider) ?? {
				name: provider,
			}
			const adapter = createAdapter(providerConfig)
			if (await adapter.isAvailable()) {
				verbose(`using provider: ${adapter.name}${providerConfig.model ? ` (model: ${providerConfig.model})` : ''}`)
				return adapter
			}
		}

		if (providers.length > 0) {
			for (const providerConfig of providers) {
				const adapter = createAdapter(providerConfig)
				if (await adapter.isAvailable()) {
					return adapter
				}
			}
		}
	}

	// 4. Auto-detect from $PATH
	const detected = await detectAvailableCLI()
	if (detected) {
		return createAdapter({ name: detected })
	}

	// 5. Error
	throw new Error(NO_CLI_ERROR_MESSAGE)
}

export function buildPrompt(diff: string, context: GenerateContext): string {
	const typeList = context.existingTypes
		?.map((t) => `${t.value} (${t.desc})`)
		.join('\n  ') || 'feat, fix, docs, style, refactor, test, chore'

	const templateHint = context.template
		? `\nThe commit format is: ${context.template}${context.presetName ? ` (${context.presetName} convention)` : ''}`
		: ''

	return `You are a commit message generator. Analyze the git diff and generate a commit message.${templateHint}

Available types:
  ${typeList}

Output a JSON object with these fields:
- type: must be one of the available types above (use the exact value)
- scope: optional, a short word describing the area of change
- message: a concise description (imperative mood, no period, max 72 chars)
- body: optional, longer description if the change is complex
- breaking: optional, description of breaking changes if any

Only output valid JSON, no markdown or explanation.
${context.branchName ? `\nBranch: ${context.branchName}` : ''}

\`\`\`diff
${diff.slice(0, MAX_DIFF_LENGTH)}
\`\`\``
}

export function parseAIResponse(text: string): AICommitSuggestion | null {
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}/)
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0])
			return {
				type: parsed.type || 'feat',
				scope: parsed.scope,
				message: parsed.message || 'update',
				body: parsed.body,
				breaking: parsed.breaking,
			}
		}
	} catch {
		// Ignore parse errors
	}
	return null
}

export async function generateCommitMessage(
	diff: string,
	context?: GenerateContext,
	providerOverride?: string,
): Promise<AICommitSuggestion | null> {
	try {
		const adapter = await resolveProvider(providerOverride)
		const prompt = buildPrompt(diff, context ?? {})
		verbose(`prompt length: ${prompt.length} chars, diff length: ${diff.length} chars`)
		const output = await adapter.execute(prompt)
		verbose(`AI response length: ${output.length} chars`)
		verbose(`AI raw response:\n${output}`)
		const parsed = parseAIResponse(output)
		verbose(`parsed suggestion: ${parsed ? JSON.stringify(parsed) : 'null'}`)
		return parsed
	} catch (error) {
		console.error(
			'AI generation failed:',
			error instanceof Error ? error.message : error,
		)
		return null
	}
}

export function buildMultiCommitPrompt(
	diff: string,
	files: string[],
	context: GenerateContext,
): string {
	const typeList = context.existingTypes
		?.map((t) => `${t.value} (${t.desc})`)
		.join('\n  ') || 'feat, fix, docs, style, refactor, test, chore'

	const templateHint = context.template
		? `\nThe commit format is: ${context.template}${context.presetName ? ` (${context.presetName} convention)` : ''}`
		: ''

	return `You are a commit message generator. Analyze the git diff and split the changes into multiple logical commits.${templateHint}

Available types:
  ${typeList}

Group related changes together:
- A feature and its tests belong in the same commit
- Configuration changes can be separate from code changes
- Refactoring should be separate from feature work

Each file must appear in exactly one commit. Order commits logically (e.g., refactoring before features).

Output a JSON object with a "commits" array. Each commit has:
- type: must be one of the available types above (use the exact value)
- scope: optional, a short word describing the area of change
- message: a concise description (imperative mood, no period, max 72 chars)
- body: optional, longer description if the change is complex
- files: array of file paths that belong in this commit

Staged files:
${files.join('\n')}

Only output valid JSON, no markdown or explanation.
${context.branchName ? `\nBranch: ${context.branchName}` : ''}

\`\`\`diff
${diff.slice(0, MAX_DIFF_LENGTH)}
\`\`\``
}

export function parseMultiCommitResponse(
	text: string,
): AIMultiCommitPlan | null {
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}/)
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0])
			if (parsed.commits && Array.isArray(parsed.commits)) {
				return {
					commits: parsed.commits.map((c: Record<string, unknown>) => ({
						type: (c.type as string) || 'feat',
						scope: c.scope as string | undefined,
						message: (c.message as string) || 'update',
						body: c.body as string | undefined,
						files: Array.isArray(c.files) ? (c.files as string[]) : [],
					})),
				}
			}
		}
	} catch {
		// Ignore parse errors
	}
	return null
}

export async function generateMultiCommitPlan(
	diff: string,
	files: string[],
	context?: GenerateContext,
	providerOverride?: string,
): Promise<AIMultiCommitPlan | null> {
	try {
		const adapter = await resolveProvider(providerOverride)
		const prompt = buildMultiCommitPrompt(diff, files, context ?? {})
		verbose(`multi-commit prompt length: ${prompt.length} chars, files: ${files.length}`)
		const output = await adapter.execute(prompt)
		verbose(`AI response length: ${output.length} chars`)
		verbose(`AI raw response:\n${output}`)
		return parseMultiCommitResponse(output)
	} catch (error) {
		console.error(
			'AI multi-commit generation failed:',
			error instanceof Error ? error.message : error,
		)
		return null
	}
}

export async function isAIAvailable(
	providerOverride?: string,
): Promise<boolean> {
	try {
		await resolveProvider(providerOverride)
		return true
	} catch {
		return false
	}
}

export async function shouldAutoAI(): Promise<boolean> {
	const userConfig = await loadUserAIConfig()
	return userConfig?.ai?.auto === true
}
