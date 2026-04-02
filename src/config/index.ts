import { loadConfig as loadC12Config } from 'c12'
import { z } from 'zod'

export type ScopeDefinition = {
	value: string
	desc?: string
}

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
	scopeValidation?: 'strict' | 'warn' | 'off'
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
	scopes?: Array<string | ScopeDefinition>
	scopeValidation?: 'strict' | 'warn' | 'off'
	validation?: ValidationConfig
	github?: {
		enabled: boolean
		scopeLabelPatterns: string[]
		auto?: {
			detectIssues: boolean
			suggestReviewers: boolean
		}
	}
}

const ScopeDefinitionSchema: z.ZodType<ScopeDefinition> = z.object({
	value: z.string(),
	desc: z.string().optional(),
})

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
	scopeValidation: z.enum(['strict', 'warn', 'off']).optional(),
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
	scopes: z.array(z.union([z.string(), ScopeDefinitionSchema])).optional(),
	scopeValidation: z.enum(['strict', 'warn', 'off']).optional().default('off'),
	validation: ValidationSchema.optional(),
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
type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? U[]
		: NonNullable<T[P]> extends Record<string, unknown>
			? DeepPartial<NonNullable<T[P]>>
			: T[P]
}

export function defineConfig(config: DeepPartial<Config>): DeepPartial<Config> {
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
		scopes: undefined,
		scopeValidation: 'off',
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
