import { describe, expect, test } from 'bun:test'
import { defineConfig, getDefaultConfig } from '../../src'

describe('Configuration', () => {
	describe('getDefaultConfig', () => {
		test('should return default config', () => {
			const config = getDefaultConfig()
			expect(config.preset).toBe('conventional')
			expect(config.validation?.enabled).toBe(true)
			expect(config.github?.enabled).toBe(true)
		})

		test('should have validation defaults', () => {
			const config = getDefaultConfig()
			expect(config.validation?.maxHeaderLength).toBe(72)
			expect(config.validation?.maxBodyLineLength).toBe(100)
			expect(config.validation?.noTrailingPeriod).toBe(true)
		})

		test('should have scope mode default', () => {
			const config = getDefaultConfig()
			expect(config.scopeMode).toBe('single')
		})

		test('should have defaults object', () => {
			const config = getDefaultConfig()
			expect(config.defaults).toBeDefined()
			expect(config.defaults?.includeBody).toBe(true)
			expect(config.defaults?.scope).toBe('')
		})

		test('should have empty plugins array', () => {
			const config = getDefaultConfig()
			expect(config.plugins).toEqual([])
		})

		test('should have AI disabled by default', () => {
			const config = getDefaultConfig()
			expect(config.ai?.enabled).toBe(false)
			expect(config.ai?.provider).toBe('auto')
		})

		test('should have GitHub auto detect issues enabled', () => {
			const config = getDefaultConfig()
			expect(config.github?.auto?.detectIssues).toBe(true)
			expect(config.github?.auto?.suggestReviewers).toBe(false)
		})

		test('should have GitHub scope label patterns', () => {
			const config = getDefaultConfig()
			expect(config.github?.scopeLabelPatterns).toContain('scope:')
			expect(config.github?.scopeLabelPatterns).toContain('area:')
			expect(config.github?.scopeLabelPatterns).toContain('component:')
		})

		test('should have validation custom rules as empty array', () => {
			const config = getDefaultConfig()
			expect(config.validation?.customRules).toEqual([])
		})

		test('should have no trailing period enabled', () => {
			const config = getDefaultConfig()
			expect(config.validation?.noTrailingPeriod).toBe(true)
			expect(config.validation?.noLeadingCapital).toBe(false)
		})

		test('should have optional fields undefined', () => {
			const config = getDefaultConfig()
			expect(config.template).toBeUndefined()
			expect(config.scopeMap).toBeUndefined()
			expect(config.coauthors).toBeUndefined()
			expect(config.validation?.allowedTypes).toBeUndefined()
			expect(config.validation?.allowedScopes).toBeUndefined()
		})
	})

	describe('defineConfig', () => {
		test('should define config with type safety', () => {
			const config = defineConfig({
				preset: 'angular',
				scopeMap: {
					'src/**': 'src',
				},
			})
			expect(config.preset).toBe('angular')
			expect(config.scopeMap?.['src/**']).toBe('src')
		})

		test('should allow partial config', () => {
			const config = defineConfig({
				preset: 'conventional',
			})
			expect(config.preset).toBe('conventional')
			expect(config.scopeMap).toBeUndefined()
		})

		test('should allow validation config', () => {
			const config = defineConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 50,
					requireScope: true,
				},
			})
			expect(config.validation?.enabled).toBe(true)
			expect(config.validation?.maxHeaderLength).toBe(50)
			expect(config.validation?.requireScope).toBe(true)
		})

		test('should allow AI config', () => {
			const config = defineConfig({
				ai: {
					enabled: true,
					provider: 'openai',
					model: 'gpt-4',
				},
			})
			expect(config.ai?.enabled).toBe(true)
			expect(config.ai?.provider).toBe('openai')
			expect(config.ai?.model).toBe('gpt-4')
		})

		test('should allow GitHub config', () => {
			const config = defineConfig({
				github: {
					enabled: false,
					scopeLabelPatterns: ['custom:'],
				},
			})
			expect(config.github?.enabled).toBe(false)
			expect(config.github?.scopeLabelPatterns).toEqual(['custom:'])
		})

		test('should allow custom rules', () => {
			const config = defineConfig({
				validation: {
					customRules: [
						{
							name: 'no-wip',
							pattern: 'WIP',
							message: 'No WIP commits allowed',
							level: 'error',
							invert: true,
						},
					],
				},
			})
			expect(config.validation?.customRules).toHaveLength(1)
			expect(config.validation?.customRules?.[0].name).toBe('no-wip')
		})

		test('should allow coauthors', () => {
			const config = defineConfig({
				coauthors: {
					alice: 'Alice <alice@example.com>',
					bob: 'Bob <bob@example.com>',
				},
			})
			expect(config.coauthors?.alice).toBe('Alice <alice@example.com>')
			expect(config.coauthors?.bob).toBe('Bob <bob@example.com>')
		})

		test('should allow scope mode configuration', () => {
			const config = defineConfig({
				scopeMode: 'multi-inline',
			})
			expect(config.scopeMode).toBe('multi-inline')
		})

		test('should return the same object', () => {
			const input = {
				preset: 'conventional',
				scopeMap: { 'test/**': 'test' },
			}
			const output = defineConfig(input)
			expect(output).toBe(input)
		})
	})
})
