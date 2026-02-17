import { describe, expect, test } from 'bun:test'
import {
	getAllScopeSuggestions,
	getScopesFromConfig,
	getScopesFromLabels,
	getScopesFromPaths,
} from '../../src'
import type { Label } from '../../src/services/github'

describe('Scope Service', () => {
	describe('getScopesFromConfig', () => {
		test('should extract scopes from file paths using scopeMap', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
				'src/api/**': 'api',
				'docs/**': 'docs',
			}
			const scopes = getScopesFromConfig(['src/cli/index.ts'], scopeMap)
			expect(scopes).toHaveLength(1)
			expect(scopes[0]?.value).toBe('cli')
			expect(scopes[0]?.source).toBe('config')
		})

		test('should handle multiple matching paths', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
				'src/api/**': 'api',
			}
			const scopes = getScopesFromConfig(
				['src/cli/index.ts', 'src/api/routes.ts'],
				scopeMap,
			)
			expect(scopes).toHaveLength(2)
			const values = scopes.map((s) => s.value)
			expect(values).toContain('cli')
			expect(values).toContain('api')
		})

		test('should return empty for no matches', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
			}
			const scopes = getScopesFromConfig(['other/file.ts'], scopeMap)
			expect(scopes).toHaveLength(0)
		})

		test('should return empty for undefined scopeMap', () => {
			const scopes = getScopesFromConfig(['src/cli/index.ts'], undefined)
			expect(scopes).toHaveLength(0)
		})

		test('should deduplicate scopes from multiple files', () => {
			const scopeMap = {
				'src/cli/**': 'cli',
			}
			const scopes = getScopesFromConfig(
				['src/cli/index.ts', 'src/cli/utils.ts'],
				scopeMap,
			)
			expect(scopes).toHaveLength(1)
			expect(scopes[0]?.value).toBe('cli')
		})
	})

	describe('getScopesFromLabels', () => {
		test('should extract scope from labels', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'bug', color: '00ff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:', 'area:'])
			expect(scopes).toHaveLength(1)
			expect(scopes[0]?.value).toBe('cli')
			expect(scopes[0]?.source).toBe('label')
			expect(scopes[0]?.label).toBe('scope:cli')
			expect(scopes[0]?.color).toBe('ff0000')
		})

		test('should handle multiple scope labels', () => {
			const labels: Label[] = [
				{ name: 'scope:cli', color: 'ff0000' },
				{ name: 'area:api', color: '00ff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:', 'area:'])
			expect(scopes).toHaveLength(2)
			const values = scopes.map((s) => s.value)
			expect(values).toContain('cli')
			expect(values).toContain('api')
		})

		test('should use custom label patterns', () => {
			const labels: Label[] = [{ name: 'component:auth', color: '0000ff' }]
			const scopes = getScopesFromLabels(labels, ['component:', 'module:'])
			expect(scopes).toHaveLength(1)
			expect(scopes[0]?.value).toBe('auth')
		})

		test('should return empty for non-matching labels', () => {
			const labels: Label[] = [
				{ name: 'bug', color: 'ff0000' },
				{ name: 'feature', color: '00ff00' },
			]
			const scopes = getScopesFromLabels(labels, ['scope:', 'area:'])
			expect(scopes).toHaveLength(0)
		})

		test('should handle empty scope value', () => {
			const labels: Label[] = [{ name: 'scope:', color: 'ff0000' }]
			const scopes = getScopesFromLabels(labels, ['scope:'])
			expect(scopes).toHaveLength(0)
		})
	})

	describe('getScopesFromPaths', () => {
		test('should extract scopes from directory names', () => {
			const scopes = getScopesFromPaths(['src/services/github.ts'])
			expect(scopes.length).toBeGreaterThan(0)
			const values = scopes.map((s) => s.value)
			expect(values).toContain('services')
		})

		test('should skip common non-descriptive directories', () => {
			const scopes = getScopesFromPaths(['src/index.ts'])
			const values = scopes.map((s) => s.value)
			expect(values).not.toContain('src')
		})

		test('should handle multiple files and count frequency', () => {
			const scopes = getScopesFromPaths([
				'src/services/github.ts',
				'src/services/git.ts',
				'src/commands/commit.ts',
			])
			expect(scopes.length).toBeGreaterThan(0)
			// services appears twice, should be first
			expect(scopes[0]?.value).toBe('services')
			expect(scopes[0]?.source).toBe('path')
		})

		test('should return empty for root files', () => {
			const scopes = getScopesFromPaths(['README.md'])
			expect(scopes).toHaveLength(0)
		})

		test('should limit to top 5 scopes', () => {
			const scopes = getScopesFromPaths([
				'dir1/file.ts',
				'dir2/file.ts',
				'dir3/file.ts',
				'dir4/file.ts',
				'dir5/file.ts',
				'dir6/file.ts',
				'dir7/file.ts',
			])
			expect(scopes.length).toBeLessThanOrEqual(5)
		})
	})

	describe('getAllScopeSuggestions', () => {
		test('should combine scopes from all sources', () => {
			const scopeMap = { 'src/cli/**': 'cli' }
			const labels: Label[] = [{ name: 'scope:api', color: 'ff0000' }]
			const scopes = getAllScopeSuggestions(
				['src/services/github.ts'],
				scopeMap,
				labels,
				['scope:'],
			)

			const values = scopes.map((s) => s.value)
			expect(values).toContain('api') // from label
			expect(values).toContain('services') // from path
		})

		test('should prioritize config scopes over others', () => {
			const scopeMap = { 'src/services/**': 'config-services' }
			const labels: Label[] = [{ name: 'scope:services', color: 'ff0000' }]
			const scopes = getAllScopeSuggestions(
				['src/services/github.ts'],
				scopeMap,
				labels,
				['scope:'],
			)

			const servicesScope = scopes.find(
				(s) => s.value === 'config-services' || s.value === 'services',
			)
			expect(servicesScope?.value).toBe('config-services')
			expect(servicesScope?.source).toBe('config')
		})

		test('should deduplicate scopes by value', () => {
			const scopeMap = { 'src/cli/**': 'cli' }
			const labels: Label[] = [{ name: 'scope:cli', color: 'ff0000' }]
			const scopes = getAllScopeSuggestions(
				['src/cli/index.ts'],
				scopeMap,
				labels,
				['scope:'],
			)

			const cliScopes = scopes.filter((s) => s.value === 'cli')
			expect(cliScopes).toHaveLength(1)
			expect(cliScopes[0]?.source).toBe('config') // config has priority
		})
	})
})
