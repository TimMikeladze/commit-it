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
	existingTypes?: string[]
}

export const AICommitSuggestionSchema = z.object({
	type: z.string(),
	scope: z.string().optional(),
	message: z.string(),
	body: z.string().optional(),
	breaking: z.string().optional(),
})

export const ProviderConfigSchema = z.object({
	name: z.enum(['claude', 'codex', 'agent', 'custom']),
	model: z.string().optional(),
	command: z.string().optional(),
	diffFlag: z.string().optional(),
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type ProviderName = ProviderConfig['name']

export const UserAIConfigSchema = z.object({
	ai: z
		.object({
			auto: z.boolean().default(false),
			provider: z.enum(['claude', 'codex', 'agent', 'custom']).optional(),
			providers: z.array(ProviderConfigSchema).default([]),
		})
		.optional(),
})

export type UserAIConfig = z.infer<typeof UserAIConfigSchema>
