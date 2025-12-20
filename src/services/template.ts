export interface TemplateData {
	type: string
	scope?: string
	message: string
	body?: string
	breaking?: string
	issues?: string
	coauthors?: string
}

/**
 * Render a commit message template with simple placeholder substitution
 * Supports: {{type}}, {{scope}}, {{message}}, {{body}}, {{breaking}}, {{issues}}, {{coauthors}}
 * Conditional sections: {{#scope}}({{scope}}){{/scope}} - only rendered if scope exists
 */
export function renderTemplate(template: string, data: TemplateData): string {
	let result = template

	// Handle conditional sections first: {{#field}}content{{/field}}
	const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g
	result = result.replace(conditionalRegex, (_, field, content) => {
		const value = data[field as keyof TemplateData]
		if (value) {
			// Recursively render the content with placeholders
			return renderPlaceholders(content, data)
		}
		return ''
	})

	// Handle simple placeholders
	result = renderPlaceholders(result, data)

	return result.trim()
}

function renderPlaceholders(text: string, data: TemplateData): string {
	return text.replace(/\{\{(\w+)\}\}/g, (_, field) => {
		const value = data[field as keyof TemplateData]
		return value ?? ''
	})
}

/**
 * Default templates for different presets
 */
export const DEFAULT_TEMPLATES: Record<string, string> = {
	conventional:
		'{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}',
	angular: '{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}',
	gitmoji: '{{type}} {{#scope}}({{scope}}) {{/scope}}{{message}}',
}

/**
 * Build full commit message with body, breaking changes, issues, and co-authors
 */
export function buildFullMessage(
	data: TemplateData,
	template?: string,
): string {
	const preset = template || DEFAULT_TEMPLATES.conventional
	let message = renderTemplate(preset, data)

	// Add body
	if (data.body) {
		message += `\n\n${data.body}`
	}

	// Add breaking change footer
	if (data.breaking) {
		message += `\n\nBREAKING CHANGE: ${data.breaking}`
	}

	// Add issues
	if (data.issues) {
		message += `\n\n${data.issues}`
	}

	// Add co-authors
	if (data.coauthors) {
		message += `\n\n${data.coauthors}`
	}

	return message
}
