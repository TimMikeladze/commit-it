import { loadConfig as loadC12Config } from 'c12'
import { z } from 'zod'

const CustomRuleSchema = z.object({
	name: z.string(),
	pattern: z.string(),
	message: z.string(),
	level: z.enum(['error', 'warning']).default('error'),
	invert: z.boolean().default(false), // If true, pattern must NOT match
})

const ValidationSchema = z.object({
	enabled: z.boolean().default(true),
	maxHeaderLength: z.number().default(72),
	maxBodyLineLength: z.number().default(100),
	requireScope: z.boolean().default(false),
	requireBody: z.boolean().default(false),
	requireIssue: z.boolean().default(false),
	allowedTypes: z.array(z.string()).optional(), // If set, only these types allowed
	allowedScopes: z.array(z.string()).optional(), // If set, only these scopes allowed
	noTrailingPeriod: z.boolean().default(true),
	noLeadingCapital: z.boolean().default(false), // Some prefer lowercase messages
	customRules: z.array(CustomRuleSchema).default([]),
})

const ConfigSchema: z.ZodType = z.object({
	preset: z.string().default('conventional'),
	template: z.string().optional(),
	scopeMode: z
		.enum(['single', 'multi-inline', 'multi-body'])
		.default('single'),
	defaults: z
		.object({
			scope: z.string().optional(),
			includeBody: z.boolean().default(true),
		})
		.optional(),
	plugins: z.array(z.string()).default([]),
	scopeMap: z.record(z.string(), z.string()).optional(),
	coauthors: z.record(z.string(), z.string()).optional(),
	validation: ValidationSchema.optional(),
	ai: z
		.object({
			enabled: z.boolean().default(false),
			provider: z.enum(['openai', 'anthropic', 'auto']).default('auto'),
			model: z.string().optional(),
		})
		.optional(),
	github: z
		.object({
			enabled: z.boolean().default(true),
			scopeLabelPatterns: z
				.array(z.string())
				.default([
					'scope:',
					'scope/',
					'area:',
					'area/',
					'component:',
					'component/',
				]),
			auto: z
				.object({
					detectIssues: z.boolean().default(true),
					suggestReviewers: z.boolean().default(false),
				})
				.optional(),
		})
		.optional(),
})

export type CustomRule = z.infer<typeof CustomRuleSchema>
export type ValidationConfig = z.infer<typeof ValidationSchema>

export type Config = z.infer<typeof ConfigSchema>

/**
 * Supported config file names (in priority order):
 * - commit.config.ts
 * - commit.config.js
 * - commit.config.mjs
 * - commit.config.cjs
 * - .commitrc
 * - .commitrc.json
 * - .commitrc.yaml
 * - .commitrc.yml
 * - .commit.json
 * - .commit.yaml
 * - .commit.yml
 */
export async function loadConfig(): Promise<Config> {
	try {
		const { config } = await loadC12Config({
			name: 'commit',
			rcFile: '.commitrc',
			dotenv: false,
			packageJson: true,
			defaults: getDefaultConfig(),
		})

		return ConfigSchema.parse(config)
	} catch {
		// Return default config if loading fails
		return getDefaultConfig()
	}
}

/**
 * Helper for type-safe config in JS/TS files.
 * @example
 * // commit.config.ts
 * import { defineConfig } from 'commit-it'
 * export default defineConfig({
 *   preset: 'conventional',
 *   scopeMap: { 'src/cli/**': 'cli' }
 * })
 */
export function defineConfig(config: Partial<Config>): Partial<Config> {
	return config
}

export function getDefaultConfig(): Config {
	return {
		preset: 'conventional',
		template: undefined,
		scopeMode: 'single',
		defaults: {
			scope: '',
			includeBody: true,
		},
		plugins: [],
		scopeMap: undefined,
		coauthors: undefined,
		validation: {
			enabled: true,
			maxHeaderLength: 72,
			maxBodyLineLength: 100,
			requireScope: false,
			requireBody: false,
			requireIssue: false,
			allowedTypes: undefined,
			allowedScopes: undefined,
			noTrailingPeriod: true,
			noLeadingCapital: false,
			customRules: [],
		},
		ai: {
			enabled: false,
			provider: 'auto',
			model: undefined,
		},
		github: {
			enabled: true,
			scopeLabelPatterns: [
				'scope:',
				'scope/',
				'area:',
				'area/',
				'component:',
				'component/',
			],
			auto: {
				detectIssues: true,
				suggestReviewers: false,
			},
		},
	}
}
