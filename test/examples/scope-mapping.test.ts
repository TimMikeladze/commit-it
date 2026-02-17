import { describe, expect, test } from 'bun:test'
import {
	getAllScopeSuggestions,
	getScopesFromConfig,
	getScopesFromLabels,
} from '../../src'
import type { Label } from '../../src/services/github'

describe('README Examples - Scope Mapping', () => {
	describe('getScopesFromPaths (via getScopesFromConfig)', () => {
		test('should map file paths to scopes', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
				'src/services/**': 'services',
				'src/api/**': 'api',
				'docs/**': 'docs',
				'tests/**': 'test',
			}

			const scopes = getScopesFromConfig(
				['src/cli/index.ts', 'src/api/users.ts'],
				scopeMap,
			)
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'api'])
		})

		test('should handle single scope', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
			}

			const scopes = getScopesFromConfig(['src/cli/commands.ts'], scopeMap)
			expect(scopes.map((s) => s.value)).toEqual(['cli'])
		})

		test('should deduplicate scopes from multiple files', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
			}

			const scopes = getScopesFromConfig(
				['src/cli/index.ts', 'src/cli/commands.ts', 'src/cli/utils.ts'],
				scopeMap,
			)
			expect(scopes.map((s) => s.value)).toEqual(['cli'])
		})

		test('should handle no matches', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
			}

			const scopes = getScopesFromConfig(['README.md'], scopeMap)
			expect(scopes).toEqual([])
		})

		test('should handle complex patterns', () => {
			const scopeMap = {
				'packages/core/**': 'core',
				'packages/cli/**': 'cli',
				'packages/web/**': 'web',
				'packages/api/**': 'api',
			}

			const scopes = getScopesFromConfig(
				['packages/core/src/index.ts', 'packages/web/src/app.tsx'],
				scopeMap,
			)
			expect(scopes.map((s) => s.value)).toEqual(['core', 'web'])
		})
	})

	describe('getScopesFromLabels', () => {
		test('should extract scopes from GitHub labels', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'scope:api', color: '00ff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:'])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'api'])
		})

		test('should handle multiple label patterns', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'area:core', color: '00ff00' },
				{ name: 'component:ui', color: '0000ff' },
			]
			const scopes = getScopesFromLabels(labels, [
				'scope:',
				'area:',
				'component:',
			])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'core', 'ui'])
		})

		test('should ignore labels without matching patterns', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'bug', color: '00ff00' },
				{ name: 'feature', color: '0000ff' },
				{ name: 'scope:api', color: 'ffff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:'])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'api'])
		})

		test('should handle slash separator', () => {
			const labels: Label[] = [
				{ name: 'scope/cli', color: 'ff0000' },
				{ name: 'scope/api', color: '00ff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope/'])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'api'])
		})

		test('should not deduplicate scopes (one per label)', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'area:cli', color: '00ff00' },
				{ name: 'component:cli', color: '0000ff' },
			]
			const scopes = getScopesFromLabels(labels, [
				'scope:',
				'area:',
				'component:',
			])
			expect(scopes.map((s) => s.value)).toEqual(['cli', 'cli', 'cli'])
		})
	})

	describe('getAllScopeSuggestions', () => {
		test('should combine scopes from paths and labels', () => {
			const labels: Label[] = [{ name: 'scope:core', color: 'ff0000' }]
			const suggestions = getAllScopeSuggestions(
				['src/cli/index.ts'],
				{
					'src/cli/**': 'cli',
					'src/api/**': 'api',
				},
				labels,
				['scope:', 'area:'],
			)

			const values = suggestions.map((s) => s.value)
			expect(values).toContain('cli')
			expect(values).toContain('core')
		})

		test('should deduplicate suggestions from multiple sources', () => {
			const labels: Label[] = [{ name: 'scope:cli', color: 'ff0000' }]
			const suggestions = getAllScopeSuggestions(
				['src/cli/index.ts'],
				{
					'src/cli/**': 'cli',
				},
				labels,
				['scope:'],
			)

			const cliScopes = suggestions.filter((s) => s.value === 'cli')
			expect(cliScopes).toHaveLength(1)
			expect(cliScopes[0]?.source).toBe('config') // config has priority
		})

		test('should handle empty inputs', () => {
			const suggestions = getAllScopeSuggestions([], undefined, [], [])

			expect(suggestions.length).toBe(0) // no files = no suggestions
		})

		test('should prioritize config scopes over label scopes', () => {
			const labels: Label[] = [{ name: 'scope:core', color: 'ff0000' }]
			const suggestions = getAllScopeSuggestions(
				['src/cli/index.ts', 'src/api/users.ts'],
				{
					'src/cli/**': 'cli',
					'src/api/**': 'api',
				},
				labels,
				['scope:'],
			)

			const values = suggestions.map((s) => s.value)
			// Config scopes come first
			expect(values[0]).toBe('cli')
			expect(values[1]).toBe('api')
			expect(values).toContain('core')
		})
	})

	describe('Monorepo patterns', () => {
		test('should handle monorepo scope mapping', () => {
			const scopeMap = {
				'packages/core/**': 'core',
				'packages/cli/**': 'cli',
				'packages/web/**': 'web',
				'packages/api/**': 'api',
				'packages/shared/**': 'shared',
			}

			const scopes = getScopesFromConfig(
				[
					'packages/core/src/index.ts',
					'packages/shared/utils.ts',
					'packages/web/components/Button.tsx',
				],
				scopeMap,
			)

			expect(scopes.map((s) => s.value)).toEqual(['core', 'shared', 'web'])
		})

		test('should work with validation requiring scopes', () => {
			const suggestions = getAllScopeSuggestions(
				['packages/core/index.ts'],
				{
					'packages/core/**': 'core',
					'packages/cli/**': 'cli',
				},
				[],
				[],
			)

			expect(suggestions.map((s) => s.value)).toContain('core')
		})
	})
})
