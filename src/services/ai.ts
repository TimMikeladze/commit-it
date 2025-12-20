import type { Config } from '../config'

export interface AICommitSuggestion {
	type: string
	scope?: string
	message: string
	body?: string
	breaking?: string
}

/**
 * Detect which AI provider to use based on config and environment
 */
function detectProvider(config: Config): 'openai' | 'anthropic' | null {
	const aiConfig = config.ai
	if (!aiConfig?.enabled) return null

	if (aiConfig.provider && aiConfig.provider !== 'auto') {
		return aiConfig.provider
	}

	// Auto-detect from environment
	if (process.env.OPENAI_API_KEY) return 'openai'
	if (process.env.ANTHROPIC_API_KEY) return 'anthropic'

	return null
}

/**
 * Get the model to use for the provider
 */
function getModel(config: Config, provider: 'openai' | 'anthropic'): string {
	if (config.ai?.model) return config.ai.model

	// Default models
	return provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'
}

/**
 * Generate a commit message suggestion using AI
 */
export async function generateCommitMessage(
	diff: string,
	config: Config,
	context?: { branchName?: string; existingTypes?: string[] },
): Promise<AICommitSuggestion | null> {
	const provider = detectProvider(config)
	if (!provider) return null

	const modelName = getModel(config, provider)

	const systemPrompt = `You are a commit message generator. Analyze the git diff and generate a conventional commit message.

Output a JSON object with these fields:
- type: one of ${context?.existingTypes?.join(', ') || 'feat, fix, docs, style, refactor, test, chore'}
- scope: optional, a short word describing the area of change
- message: a concise description (imperative mood, no period, max 72 chars)
- body: optional, longer description if the change is complex
- breaking: optional, description of breaking changes if any

Only output valid JSON, no markdown or explanation.`

	const userPrompt = `Generate a commit message for this diff:
${context?.branchName ? `\nBranch: ${context.branchName}` : ''}

\`\`\`diff
${diff.slice(0, 8000)}
\`\`\``

	try {
		if (provider === 'openai') {
			const { createOpenAI } = await import('@ai-sdk/openai')
			const { generateText } = await import('ai')

			const openai = createOpenAI()
			const result = await generateText({
				model: openai(modelName),
				system: systemPrompt,
				prompt: userPrompt,
			})

			return parseAIResponse(result.text)
		}

		if (provider === 'anthropic') {
			const { createAnthropic } = await import('@ai-sdk/anthropic')
			const { generateText } = await import('ai')

			const anthropic = createAnthropic()
			const result = await generateText({
				model: anthropic(modelName),
				system: systemPrompt,
				prompt: userPrompt,
			})

			return parseAIResponse(result.text)
		}
	} catch (error) {
		console.error('AI generation failed:', error)
		return null
	}

	return null
}

function parseAIResponse(text: string): AICommitSuggestion | null {
	try {
		// Try to extract JSON from the response
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

/**
 * Check if AI is available (provider configured and API key present)
 */
export function isAIAvailable(config: Config): boolean {
	return detectProvider(config) !== null
}
