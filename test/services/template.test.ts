import { describe, expect, test } from 'bun:test'
import {
	buildFullMessage,
	DEFAULT_TEMPLATES,
	renderTemplate,
} from '../../src/services/template'

describe('Template Service', () => {
	describe('renderTemplate', () => {
		test('should render basic template with all fields', () => {
			const result = renderTemplate('{{type}}({{scope}}): {{message}}', {
				type: 'feat',
				scope: 'cli',
				message: 'add command',
			})
			expect(result).toBe('feat(cli): add command')
		})

		test('should handle missing scope with placeholder', () => {
			const result = renderTemplate('{{type}}({{scope}}): {{message}}', {
				type: 'feat',
				message: 'add command',
			})
			expect(result).toBe('feat(): add command')
		})

		test('should handle conditional section with scope present', () => {
			const result = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}',
				{
					type: 'feat',
					scope: 'cli',
					message: 'add command',
				},
			)
			expect(result).toBe('feat(cli): add command')
		})

		test('should omit conditional section when scope missing', () => {
			const result = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}',
				{
					type: 'feat',
					message: 'add command',
				},
			)
			expect(result).toBe('feat: add command')
		})

		test('should handle breaking change indicator in template', () => {
			const result = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}',
				{
					type: 'feat',
					scope: 'api',
					message: 'redesign auth',
					breaking: 'Changes API contract',
				},
			)
			expect(result).toBe('feat(api)!: redesign auth')
		})

		test('should omit breaking indicator when not present', () => {
			const result = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}{{#breaking}}!{{/breaking}}: {{message}}',
				{
					type: 'feat',
					scope: 'api',
					message: 'add feature',
				},
			)
			expect(result).toBe('feat(api): add feature')
		})

		test('should handle nested conditional sections', () => {
			const result = renderTemplate(
				'{{type}}{{#scope}} ({{scope}}){{/scope}} {{message}}',
				{
					type: 'feat',
					scope: 'cli',
					message: 'add command',
				},
			)
			expect(result).toBe('feat (cli) add command')
		})

		test('should trim whitespace from result', () => {
			const result = renderTemplate('  {{type}}: {{message}}  ', {
				type: 'feat',
				message: 'add feature',
			})
			expect(result).toBe('feat: add feature')
		})

		test('should handle all optional fields missing', () => {
			const result = renderTemplate(
				'{{type}}{{#scope}}({{scope}}){{/scope}}: {{message}}',
				{
					type: 'chore',
					message: 'update deps',
				},
			)
			expect(result).toBe('chore: update deps')
		})

		test('should handle body in template', () => {
			const result = renderTemplate(
				'{{type}}: {{message}}{{#body}}\n\n{{body}}{{/body}}',
				{
					type: 'feat',
					message: 'add feature',
					body: 'This is the body',
				},
			)
			expect(result).toBe('feat: add feature\n\nThis is the body')
		})
	})

	describe('buildFullMessage', () => {
		test('should build basic message without optional parts', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
			})
			expect(result).toBe('feat(api): add endpoint')
		})

		test('should build message with body', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
				body: 'This adds a new endpoint for users',
			})
			expect(result).toContain('feat(api): add endpoint')
			expect(result).toContain('This adds a new endpoint for users')
			expect(result).toMatch(
				/feat\(api\): add endpoint\n\nThis adds a new endpoint for users/,
			)
		})

		test('should build message with breaking change', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'redesign auth',
				breaking: 'Changes API contract',
			})
			expect(result).toContain('feat(api)!: redesign auth')
			expect(result).toContain('BREAKING CHANGE: Changes API contract')
		})

		test('should build message with issue references', () => {
			const result = buildFullMessage({
				type: 'fix',
				message: 'resolve bug',
				issues: 'Closes #42',
			})
			expect(result).toContain('Closes #42')
		})

		test('should build message with multiple issue references', () => {
			const result = buildFullMessage({
				type: 'fix',
				message: 'resolve bugs',
				issues: 'Closes #42\nFixes #43\nRef #44',
			})
			expect(result).toContain('Closes #42')
			expect(result).toContain('Fixes #43')
			expect(result).toContain('Ref #44')
		})

		test('should build message with co-authors', () => {
			const result = buildFullMessage({
				type: 'feat',
				message: 'add feature',
				coauthors: 'Co-authored-by: Alice <alice@example.com>',
			})
			expect(result).toContain('Co-authored-by: Alice <alice@example.com>')
		})

		test('should build message with multiple co-authors', () => {
			const result = buildFullMessage({
				type: 'feat',
				message: 'add feature',
				coauthors:
					'Co-authored-by: Alice <alice@example.com>\nCo-authored-by: Bob <bob@example.com>',
			})
			expect(result).toContain('Co-authored-by: Alice <alice@example.com>')
			expect(result).toContain('Co-authored-by: Bob <bob@example.com>')
		})

		test('should build message with all components', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'api',
				message: 'redesign authentication',
				body: 'This is a major overhaul of the auth system.\n\nIt introduces new patterns.',
				breaking: 'API endpoints changed',
				issues: 'Closes #123',
				coauthors: 'Co-authored-by: Alice <alice@example.com>',
			})

			expect(result).toContain('feat(api)!: redesign authentication')
			expect(result).toContain('This is a major overhaul')
			expect(result).toContain('BREAKING CHANGE: API endpoints changed')
			expect(result).toContain('Closes #123')
			expect(result).toContain('Co-authored-by: Alice <alice@example.com>')

			// Verify order
			const breakingIndex = result.indexOf('BREAKING CHANGE:')
			const issuesIndex = result.indexOf('Closes #123')
			const coauthorIndex = result.indexOf('Co-authored-by:')
			expect(breakingIndex).toBeLessThan(issuesIndex)
			expect(issuesIndex).toBeLessThan(coauthorIndex)
		})

		test('should use custom template when provided', () => {
			const result = buildFullMessage(
				{
					type: 'feat',
					scope: 'cli',
					message: 'add command',
				},
				'{{type}} {{#scope}}({{scope}}) {{/scope}}{{message}}',
			)
			expect(result).toBe('feat (cli) add command')
		})

		test('should use conventional template by default', () => {
			const result = buildFullMessage({
				type: 'feat',
				scope: 'cli',
				message: 'add command',
			})
			expect(result).toBe('feat(cli): add command')
		})

		test('should handle breaking change without scope', () => {
			const result = buildFullMessage({
				type: 'feat',
				message: 'redesign system',
				breaking: 'Everything changed',
			})
			expect(result).toContain('feat!: redesign system')
			expect(result).toContain('BREAKING CHANGE: Everything changed')
		})

		test('should preserve newlines in body', () => {
			const result = buildFullMessage({
				type: 'feat',
				message: 'add feature',
				body: 'Line 1\nLine 2\nLine 3',
			})
			expect(result).toContain('Line 1\nLine 2\nLine 3')
		})

		test('should preserve newlines in breaking change', () => {
			const result = buildFullMessage({
				type: 'feat',
				message: 'add feature',
				breaking: 'Breaking line 1\nBreaking line 2',
			})
			expect(result).toContain(
				'BREAKING CHANGE: Breaking line 1\nBreaking line 2',
			)
		})
	})

	describe('DEFAULT_TEMPLATES', () => {
		test('should have conventional template', () => {
			expect(DEFAULT_TEMPLATES.conventional).toBeDefined()
			expect(DEFAULT_TEMPLATES.conventional).toContain('{{type}}')
			expect(DEFAULT_TEMPLATES.conventional).toContain('{{message}}')
		})

		test('should have angular template', () => {
			expect(DEFAULT_TEMPLATES.angular).toBeDefined()
			expect(DEFAULT_TEMPLATES.angular).toContain('{{type}}')
			expect(DEFAULT_TEMPLATES.angular).toContain('{{message}}')
		})

		test('should have gitmoji template', () => {
			expect(DEFAULT_TEMPLATES.gitmoji).toBeDefined()
			expect(DEFAULT_TEMPLATES.gitmoji).toContain('{{type}}')
			expect(DEFAULT_TEMPLATES.gitmoji).toContain('{{message}}')
		})

		test('conventional template should render correctly', () => {
			const result = renderTemplate(DEFAULT_TEMPLATES.conventional, {
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
			})
			expect(result).toBe('feat(api): add endpoint')
		})

		test('angular template should render correctly', () => {
			const result = renderTemplate(DEFAULT_TEMPLATES.angular, {
				type: 'feat',
				scope: 'api',
				message: 'add endpoint',
			})
			expect(result).toBe('feat(api): add endpoint')
		})

		test('gitmoji template should render correctly', () => {
			const result = renderTemplate(DEFAULT_TEMPLATES.gitmoji, {
				type: '✨',
				scope: 'api',
				message: 'add endpoint',
			})
			expect(result).toBe('✨ (api) add endpoint')
		})
	})
})
