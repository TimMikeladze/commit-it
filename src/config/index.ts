import { loadConfig as loadC12Config } from 'c12'
import { z } from 'zod'

export type CustomRule = {
	name: string
	pattern: string
	message: string
	level: 'error' | 'warning'
	invert: boolean
}

export type ValidationConfig = {
	enabled: boolean
	maxHeaderLength: number
	maxBodyLineLength: number
	requireScope: boolean
	requireBody: boolean
	requireIssue: boolean
	allowedTypes?: string[]
	allowedScopes?: string[]
	noTrailingPeriod: boolean
	noLeadingCapital: boolean
	customRules: CustomRule[]
}

export type Config = {
	preset: string
	template?: string
	scopeMode: 'single' | 'multi-inline' | 'multi-body'
	defaults?: {
		scope?: string
		includeBody: boolean
	}
	plugins: string[]
	scopeMap?: Record<string, string>
	coauthors?: Record<string, string>
	validation?: ValidationConfig
	ai?: {
		enabled: boolean
		provider: 'openai' | 'anthropic' | 'auto'
		model?: string
	}
	github?: {
		enabled: boolean
		scopeLabelPatterns: string[]
		auto?: {
			detectIssues: boolean
			suggestReviewers: boolean
		}
	}
}

const CustomRuleSchema: z.ZodType<CustomRule> = z.object({
	name: z.string(),
	pattern: z.string(),
	message: z.string(),
	level: z.enum(['error', 'warning']).default('error'),
	invert: z.boolean().default(false),
})

const ValidationSchema: z.ZodType<ValidationConfig> = z.object({
	enabled: z.boolean().default(true),
	maxHeaderLength: z.number().default(72),
	maxBodyLineLength: z.number().default(100),
	requireScope: z.boolean().default(false),
	requireBody: z.boolean().default(false),
	requireIssue: z.boolean().default(false),
	allowedTypes: z.array(z.string()).optional(),
	allowedScopes: z.array(z.string()).optional(),
	noTrailingPeriod: z.boolean().default(true),
	noLeadingCapital: z.boolean().default(false),
	customRules: z.array(CustomRuleSchema).default([]),
})

const ConfigSchema: z.ZodType<Config> = z.object({
	preset: z.string().default('conventional'),
	template: z.string().optional(),
	scopeMode: z.enum(['single', 'multi-inline', 'multi-body']).default('single'),
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
		const { config } = await loadC12Config<Config>({
			name: 'commit',
			rcFile: '.commitrc',
			dotenv: false,
			packageJson: true,
			defaults: getDefaultConfig(),
		})

		return ConfigSchema.parse(config ?? getDefaultConfig())
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
export function defineConfig<T extends Record<string, unknown>>(config: T): T {
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
