import { z } from 'zod'

export interface CLIAdapter {
	readonly name: string
	isAvailable(): Promise<boolean>
	execute(prompt: string): Promise<string>
}

export interface AICommitSuggestion {
	type: string
	scope?: string
	message: string
	body?: string
	breaking?: string
}

export interface GenerateContext {
	branchName?: string
	existingTypes?: Array<{ value: string; desc: string }>
	presetName?: string
	template?: string
}

export interface AIMultiCommitSuggestion {
	type: string
	scope?: string
	message: string
	body?: string
	files: string[]
}

export interface AIMultiCommitPlan {
	commits: AIMultiCommitSuggestion[]
}

export interface ProviderConfig {
	name: 'claude' | 'codex' | 'agent' | 'custom'
	model?: string
	command?: string
	diffFlag?: string
}

export type ProviderName = ProviderConfig['name']

export interface UserAIConfig {
	ai?: {
		auto: boolean
		provider?: ProviderName
		providers: ProviderConfig[]
	}
	editor?: string
	preset?: string
}

export const AICommitSuggestionSchema: z.ZodType<AICommitSuggestion> = z.object(
	{
		type: z.string(),
		scope: z.string().optional(),
		message: z.string(),
		body: z.string().optional(),
		breaking: z.string().optional(),
	},
)

export const ProviderConfigSchema: z.ZodType<ProviderConfig> = z.object({
	name: z.enum(['claude', 'codex', 'agent', 'custom']),
	model: z.string().optional(),
	command: z.string().optional(),
	diffFlag: z.string().optional(),
})

export const UserAIConfigSchema: z.ZodType<UserAIConfig> = z.object({
	ai: z
		.object({
			auto: z.boolean().default(false),
			provider: z.enum(['claude', 'codex', 'agent', 'custom']).optional(),
			providers: z.array(ProviderConfigSchema).default([]),
		})
		.optional(),
	editor: z.string().optional(),
	preset: z.string().optional(),
})
