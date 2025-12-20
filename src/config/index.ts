import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const ConfigSchema: z.ZodType = z.object({
	preset: z.string().default('conventional'),
	defaults: z
		.object({
			scope: z.string().optional(),
			includeBody: z.boolean().default(true),
		})
		.optional(),
	plugins: z.array(z.string()).default([]),
	github: z
		.object({
			enabled: z.boolean().default(true),
			auto: z
				.object({
					detectIssues: z.boolean().default(true),
					suggestReviewers: z.boolean().default(false),
				})
				.optional(),
		})
		.optional(),
})

export type Config = z.infer<typeof ConfigSchema>

export async function loadConfig(): Promise<Config> {
	const configPath = join(process.cwd(), '.commitit.json')

	try {
		const content = readFileSync(configPath, 'utf-8')
		const parsed = JSON.parse(content)
		return ConfigSchema.parse(parsed)
	} catch {
		// Return default config if file doesn't exist
		return getDefaultConfig()
	}
}

export function getDefaultConfig(): Config {
	return {
		preset: 'conventional',
		defaults: {
			scope: '',
			includeBody: true,
		},
		plugins: [],
		github: {
			enabled: true,
			auto: {
				detectIssues: true,
				suggestReviewers: false,
			},
		},
	}
}
