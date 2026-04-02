import type { ValidationConfig } from '../config'
import { loadConfig } from '../config'
import { getPreset } from '../presets'
import { loadUserAIConfig } from './ai/config'

export interface ProjectSchema {
	preset: string
	template: string
	types: Array<{ value: string; desc: string }>
	scopes: Array<{ value: string; desc?: string }>
	scopeValidation: 'strict' | 'warn' | 'off'
	validation: {
		maxHeaderLength: number
		maxBodyLineLength: number
		requireScope: boolean
		requireBody: boolean
		requireIssue: boolean
		allowedTypes?: string[]
		allowedScopes?: string[]
		noTrailingPeriod: boolean
		noLeadingCapital: boolean
	}
	/**
	 * Describes the expected JSON shape when passing a commit message
	 * programmatically. Agents can use this to generate conforming
	 * messages with their own context.
	 */
	fields: {
		type: string
		scope: string
		message: string
		body: string
		breaking: string
	}
	/**
	 * Example CLI invocations for agents to use after generating a
	 * commit message.
	 */
	usage: string[]
}

function validationToSchema(v: ValidationConfig): ProjectSchema['validation'] {
	return {
		maxHeaderLength: v.maxHeaderLength,
		maxBodyLineLength: v.maxBodyLineLength,
		requireScope: v.requireScope,
		requireBody: v.requireBody,
		requireIssue: v.requireIssue,
		allowedTypes: v.allowedTypes,
		allowedScopes: v.allowedScopes,
		noTrailingPeriod: v.noTrailingPeriod,
		noLeadingCapital: v.noLeadingCapital,
	}
}

/**
 * Build the full project commit schema from config + preset.
 * This is the payload agents receive so they can self-format commits.
 */
export async function getProjectSchema(): Promise<ProjectSchema> {
	const config = await loadConfig()
	const userConfig = await loadUserAIConfig()
	const presetName = userConfig?.preset || config.preset
	const preset = getPreset(presetName)

	const defaultValidation: ValidationConfig = {
		enabled: true,
		maxHeaderLength: 72,
		maxBodyLineLength: 100,
		requireScope: false,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,
		customRules: [],
	}

	const validation = config.validation || defaultValidation

	// Merge scopes from preset + config scopes + config allowedScopes (with descriptions)
	const scopeMap = new Map<string, { value: string; desc?: string }>()

	for (const s of preset.scopes || []) {
		const entry = typeof s === 'string' ? { value: s } : s
		scopeMap.set(entry.value, entry)
	}
	for (const s of config.scopes || []) {
		const entry = typeof s === 'string' ? { value: s } : s
		// Config scopes override preset scopes (richer descriptions)
		scopeMap.set(entry.value, entry)
	}
	for (const s of validation.allowedScopes || []) {
		if (!scopeMap.has(s)) {
			scopeMap.set(s, { value: s })
		}
	}

	return {
		preset: presetName,
		template: preset.template,
		types: preset.types.map((t) => ({ value: t.value, desc: t.desc })),
		scopes: Array.from(scopeMap.values()),
		scopeValidation: config.scopeValidation || 'off',
		validation: validationToSchema(validation),
		fields: {
			type: 'string, required — one of types[].value',
			scope: 'string, optional — short word for area of change',
			message:
				'string, required — imperative mood, no trailing period, max 72 chars',
			body: 'string, optional — longer description for complex changes',
			breaking: 'string, optional — description of breaking changes',
		},
		usage: [
			'commit-it -m "type(scope): message"',
			'commit-it --type feat --scope cli -m "add feature"',
			'commit-it -m "feat(cli): add feature" --body "Detailed description"',
		],
	}
}
