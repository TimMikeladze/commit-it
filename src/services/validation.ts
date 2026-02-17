import type { ValidationConfig } from '../config'

export interface ValidationIssue {
	rule: string
	message: string
	level: 'error' | 'warning'
	line?: number
	column?: number
}

export interface ValidationResult {
	valid: boolean
	issues: ValidationIssue[]
	warnings: ValidationIssue[]
	errors: ValidationIssue[]
}

export interface ParsedMessage {
	header: string
	type: string
	scope?: string
	subject: string
	body?: string
	footer?: string
	isBreaking: boolean
	issues: number[]
}

/**
 * Parse a commit message into its components
 */
export function parseCommitMessage(message: string): ParsedMessage {
	const lines = message.split('\n')
	const header = lines[0] || ''

	// Parse header: type(scope)!: subject
	const headerMatch = header.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/)

	let type = ''
	let scope: string | undefined
	let subject = header
	let isBreaking = false

	if (headerMatch?.[1] && headerMatch[4]) {
		type = headerMatch[1]
		scope = headerMatch[2]
		isBreaking = headerMatch[3] === '!'
		subject = headerMatch[4]
	}

	// Extract body (everything between header and footer)
	let body: string | undefined
	let footer: string | undefined
	const issues: number[] = []

	if (lines.length > 2) {
		const bodyLines: string[] = []
		const footerLines: string[] = []
		let inFooter = false

		for (let i = 2; i < lines.length; i++) {
			const line = lines[i]
			if (!line) continue

			// Detect footer patterns
			if (
				line.match(
					/^(BREAKING CHANGE|Co-authored-by|Closes|Fixes|Resolves|Ref)\s*[:#]/i,
				) ||
				line.match(/^[A-Za-z-]+:\s/)
			) {
				inFooter = true
			}

			if (inFooter) {
				footerLines.push(line)

				// Extract issue numbers
				const issueMatches = line.matchAll(/#(\d+)/g)
				for (const match of issueMatches) {
					if (match[1]) {
						issues.push(parseInt(match[1], 10))
					}
				}

				// Check for breaking change in footer
				if (line.startsWith('BREAKING CHANGE')) {
					isBreaking = true
				}
			} else {
				bodyLines.push(line)
			}
		}

		body = bodyLines.join('\n').trim() || undefined
		footer = footerLines.join('\n').trim() || undefined
	}

	return { header, type, scope, subject, body, footer, isBreaking, issues }
}

/**
 * Validate a commit message against the config rules
 */
export function validateCommitMessage(
	message: string,
	config?: Partial<ValidationConfig>,
): ValidationResult {
	const fullConfig = { ...getDefaultValidationConfig(), ...config }
	const issues: ValidationIssue[] = []
	const parsed = parseCommitMessage(message)
	const lines = message.split('\n')

	// 1. Header length
	if (parsed.header.length > fullConfig.maxHeaderLength) {
		issues.push({
			rule: 'header-max-length',
			message: `Header exceeds ${fullConfig.maxHeaderLength} characters (${parsed.header.length})`,
			level: 'error',
			line: 1,
		})
	}

	// 2. Body line length
	if (parsed.body) {
		const bodyStartLine = 3 // After header and blank line
		const bodyLines = parsed.body.split('\n')
		for (let i = 0; i < bodyLines.length; i++) {
			const line = bodyLines[i]
			if (line && line.length > fullConfig.maxBodyLineLength) {
				issues.push({
					rule: 'body-max-line-length',
					message: `Body line ${i + 1} exceeds ${fullConfig.maxBodyLineLength} characters`,
					level: 'warning',
					line: bodyStartLine + i,
				})
			}
		}
	}

	// 3. Require scope
	if (fullConfig.requireScope && !parsed.scope) {
		issues.push({
			rule: 'scope-required',
			message: 'Scope is required',
			level: 'error',
		})
	}

	// 4. Require body
	if (fullConfig.requireBody && !parsed.body) {
		issues.push({
			rule: 'body-required',
			message: 'Body is required',
			level: 'error',
		})
	}

	// 5. Require issue reference
	if (fullConfig.requireIssue && parsed.issues.length === 0) {
		issues.push({
			rule: 'issue-required',
			message: 'At least one issue reference is required',
			level: 'error',
		})
	}

	// 6. Allowed types
	if (fullConfig.allowedTypes && fullConfig.allowedTypes.length > 0) {
		if (!parsed.type || !fullConfig.allowedTypes.includes(parsed.type)) {
			issues.push({
				rule: 'type-enum',
				message: `Type "${parsed.type || '(none)'}" is not allowed. Use: ${fullConfig.allowedTypes.join(', ')}`,
				level: 'error',
			})
		}
	}

	// 7. Allowed scopes
	if (fullConfig.allowedScopes && fullConfig.allowedScopes.length > 0) {
		if (parsed.scope && !fullConfig.allowedScopes.includes(parsed.scope)) {
			issues.push({
				rule: 'scope-enum',
				message: `Scope "${parsed.scope}" is not allowed. Use: ${fullConfig.allowedScopes.join(', ')}`,
				level: 'error',
			})
		}
	}

	// 8. No trailing period
	if (fullConfig.noTrailingPeriod && parsed.subject.endsWith('.')) {
		issues.push({
			rule: 'subject-no-trailing-period',
			message: 'Subject should not end with a period',
			level: 'warning',
		})
	}

	// 9. No leading capital (if enabled)
	if (
		fullConfig.noLeadingCapital &&
		parsed.subject &&
		/^[A-Z]/.test(parsed.subject)
	) {
		issues.push({
			rule: 'subject-no-leading-capital',
			message: 'Subject should not start with a capital letter',
			level: 'warning',
		})
	}

	// 10. Conventional commit format check
	if (!parsed.type) {
		issues.push({
			rule: 'conventional-format',
			message:
				'Message does not follow conventional commit format: type(scope): subject',
			level: 'error',
		})
	}

	// 11. Empty line after header
	if (lines.length > 1 && lines[1] !== '') {
		issues.push({
			rule: 'blank-line-after-header',
			message: 'Second line must be empty (blank line after header)',
			level: 'error',
			line: 2,
		})
	}

	// 12. Custom rules
	for (const rule of fullConfig.customRules) {
		try {
			const regex = new RegExp(rule.pattern)
			const matches = regex.test(message)

			// If invert is true, pattern must NOT match
			const shouldFail = rule.invert ? matches : !matches

			if (shouldFail) {
				issues.push({
					rule: rule.name,
					message: rule.message,
					level: rule.level,
				})
			}
		} catch {
			issues.push({
				rule: 'custom-rule-error',
				message: `Invalid regex in custom rule "${rule.name}": ${rule.pattern}`,
				level: 'warning',
			})
		}
	}

	const errors = issues.filter((i) => i.level === 'error')
	const warnings = issues.filter((i) => i.level === 'warning')

	return {
		valid: errors.length === 0,
		issues,
		errors,
		warnings,
	}
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
	const lines: string[] = []

	if (result.valid && result.warnings.length === 0) {
		lines.push('✓ Commit message is valid')
		return lines.join('\n')
	}

	if (result.errors.length > 0) {
		lines.push('✗ Errors:')
		for (const error of result.errors) {
			const location = error.line ? ` (line ${error.line})` : ''
			lines.push(`  • ${error.rule}${location}: ${error.message}`)
		}
	}

	if (result.warnings.length > 0) {
		if (lines.length > 0) lines.push('')
		lines.push('⚠ Warnings:')
		for (const warning of result.warnings) {
			const location = warning.line ? ` (line ${warning.line})` : ''
			lines.push(`  • ${warning.rule}${location}: ${warning.message}`)
		}
	}

	return lines.join('\n')
}

/**
 * Get default validation config
 */
export function getDefaultValidationConfig(): ValidationConfig {
	return {
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
	}
}
