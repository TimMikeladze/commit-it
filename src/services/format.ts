import type { ScopeDefinition } from '../config'

export interface ValidationResult {
	valid: boolean
	error?: string
}

export interface CommitType {
	value: string
	desc: string
}

export interface Preset {
	name: string
	template: string
	types: CommitType[]
	scopes?: Array<string | ScopeDefinition>
	validator: (message: string) => boolean
}

export interface CommitData {
	type: string
	scope?: string
	message: string
	body?: string
	footer?: string
}

export class FormatValidator {
	private preset: Preset

	constructor(preset: Preset) {
		this.preset = preset
	}

	validateMessage(message: string): ValidationResult {
		if (!this.preset.validator(message)) {
			return {
				valid: false,
				error: `Message does not match ${this.preset.name} format`,
			}
		}

		return { valid: true }
	}

	validateType(type: string): boolean {
		return this.preset.types.some((t) => t.value === type)
	}

	validateScope(scope: string): boolean {
		if (!this.preset.scopes || this.preset.scopes.length === 0) return true
		if (!scope) return true
		return this.preset.scopes.some((s) =>
			typeof s === 'string' ? s === scope : s.value === scope,
		)
	}

	formatMessage(data: CommitData): string {
		let message = `${data.type}`
		if (data.scope) {
			message += `(${data.scope})`
		}
		message += `: ${data.message}`

		if (data.body) {
			message += `\n\n${data.body}`
		}

		if (data.footer) {
			message += `\n\n${data.footer}`
		}

		return message
	}

	getAvailableTypes(): CommitType[] {
		return this.preset.types
	}

	getAvailableScopes(): ScopeDefinition[] {
		if (!this.preset.scopes) return []
		return this.preset.scopes.map((s) =>
			typeof s === 'string' ? { value: s } : s,
		)
	}

	getAvailableScopeValues(): string[] {
		return this.getAvailableScopes().map((s) => s.value)
	}
}
