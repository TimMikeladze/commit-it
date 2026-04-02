import { describe, expect, test } from 'bun:test'
import {
	defineConfig,
	FormatValidator,
	getAllScopeSuggestions,
	getDefaultConfig,
	normalizeScopeConfig,
	validateCommitMessage,
} from '../../src'
import type { ScopeDefinition } from '../../src/config'
import type { Preset } from '../../src/services/format'
import type { Label } from '../../src/services/github'

describe('Predefined Scopes', () => {
	describe('normalizeScopeConfig', () => {
		test('should convert string array to ScopeSuggestions with source predefined', () => {
			const result = normalizeScopeConfig(['cli', 'api', 'core'])
			expect(result).toHaveLength(3)
			for (const suggestion of result) {
				expect(suggestion.source).toBe('predefined')
			}
			expect(result[0]?.value).toBe('cli')
			expect(result[1]?.value).toBe('api')
			expect(result[2]?.value).toBe('core')
		})

		test('should convert ScopeDefinition objects to ScopeSuggestions with desc preserved', () => {
			const scopes: ScopeDefinition[] = [
				{ value: 'cli', desc: 'Command line interface' },
				{ value: 'api', desc: 'REST API layer' },
			]
			const result = normalizeScopeConfig(scopes)
			expect(result).toHaveLength(2)
			expect(result[0]).toEqual({
				value: 'cli',
				desc: 'Command line interface',
				source: 'predefined',
			})
			expect(result[1]).toEqual({
				value: 'api',
				desc: 'REST API layer',
				source: 'predefined',
			})
		})

		test('should handle mixed array of strings and ScopeDefinition objects', () => {
			const scopes: Array<string | ScopeDefinition> = [
				'cli',
				{ value: 'api', desc: 'REST API layer' },
				'core',
			]
			const result = normalizeScopeConfig(scopes)
			expect(result).toHaveLength(3)
			expect(result[0]).toEqual({ value: 'cli', source: 'predefined' })
			expect(result[1]).toEqual({
				value: 'api',
				desc: 'REST API layer',
				source: 'predefined',
			})
			expect(result[2]).toEqual({ value: 'core', source: 'predefined' })
		})

		test('should return empty array for empty input', () => {
			const result = normalizeScopeConfig([])
			expect(result).toEqual([])
		})

		test('should not include desc when ScopeDefinition has no desc', () => {
			const scopes: ScopeDefinition[] = [{ value: 'cli' }]
			const result = normalizeScopeConfig(scopes)
			expect(result[0]?.value).toBe('cli')
			expect(result[0]?.desc).toBeUndefined()
			expect(result[0]?.source).toBe('predefined')
		})
	})

	describe('getAllScopeSuggestions with predefined scopes', () => {
		test('should include predefined scopes in result', () => {
			const scopes = getAllScopeSuggestions(
				[],
				undefined,
				[],
				['scope:'],
				['cli', 'api'],
			)
			expect(scopes).toHaveLength(2)
			expect(scopes[0]?.value).toBe('cli')
			expect(scopes[1]?.value).toBe('api')
			for (const scope of scopes) {
				expect(scope.source).toBe('predefined')
			}
		})

		test('should give predefined scopes highest priority over config scopes', () => {
			const scopeMap = { 'src/cli/**': 'cli' }
			const scopes = getAllScopeSuggestions(
				['src/cli/index.ts'],
				scopeMap,
				[],
				['scope:'],
				[{ value: 'cli', desc: 'Predefined CLI scope' }],
			)

			const cliScopes = scopes.filter((s) => s.value === 'cli')
			expect(cliScopes).toHaveLength(1)
			expect(cliScopes[0]?.source).toBe('predefined')
			expect(cliScopes[0]?.desc).toBe('Predefined CLI scope')
		})

		test('should give predefined scopes highest priority over label scopes', () => {
			const labels: Label[] = [{ name: 'scope:auth', color: 'ff0000' }]
			const scopes = getAllScopeSuggestions(
				[],
				undefined,
				labels,
				['scope:'],
				[{ value: 'auth', desc: 'Authentication module' }],
			)

			const authScopes = scopes.filter((s) => s.value === 'auth')
			expect(authScopes).toHaveLength(1)
			expect(authScopes[0]?.source).toBe('predefined')
			expect(authScopes[0]?.desc).toBe('Authentication module')
		})

		test('should merge predefined scopes with scopeMap and label scopes', () => {
			const scopeMap = { 'src/api/**': 'api' }
			const labels: Label[] = [{ name: 'scope:ui', color: '00ff00' }]
			const scopes = getAllScopeSuggestions(
				['src/api/routes.ts'],
				scopeMap,
				labels,
				['scope:'],
				['cli', 'core'],
			)

			const values = scopes.map((s) => s.value)
			expect(values).toContain('cli')
			expect(values).toContain('core')
			expect(values).toContain('api')
			expect(values).toContain('ui')
			expect(scopes).toHaveLength(4)
		})

		test('should work when predefinedScopes is undefined (backward compat)', () => {
			const scopeMap = { 'src/cli/**': 'cli' }
			const labels: Label[] = [{ name: 'scope:api', color: 'ff0000' }]
			const scopes = getAllScopeSuggestions(
				['src/cli/index.ts'],
				scopeMap,
				labels,
				['scope:'],
			)

			const values = scopes.map((s) => s.value)
			expect(values).toContain('cli')
			expect(values).toContain('api')
		})

		test('should preserve desc from ScopeDefinition objects in predefined scopes', () => {
			const scopes = getAllScopeSuggestions(
				[],
				undefined,
				[],
				['scope:'],
				[
					{ value: 'cli', desc: 'Command line' },
					{ value: 'api', desc: 'REST API' },
				],
			)

			expect(scopes[0]?.desc).toBe('Command line')
			expect(scopes[1]?.desc).toBe('REST API')
		})
	})

	describe('validateCommitMessage with scopeValidation', () => {
		test('strict mode: unknown scope produces error', () => {
			const result = validateCommitMessage(
				'feat(unknown): add feature',
				{ scopeValidation: 'strict' },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'scope-enum')).toBe(true)
			expect(result.errors[0]?.message).toContain('unknown')
		})

		test('strict mode: known scope is valid', () => {
			const result = validateCommitMessage(
				'feat(cli): add feature',
				{ scopeValidation: 'strict' },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		test('strict mode: no scope is valid (scope is optional unless requireScope is set)', () => {
			const result = validateCommitMessage(
				'feat: add feature',
				{ scopeValidation: 'strict' },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		test('strict mode: no scope is invalid when requireScope is set', () => {
			const result = validateCommitMessage(
				'feat: add feature',
				{ scopeValidation: 'strict', requireScope: true },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'scope-required')).toBe(true)
		})

		test('warn mode: unknown scope produces warning but remains valid', () => {
			const result = validateCommitMessage(
				'feat(unknown): add feature',
				{ scopeValidation: 'warn' },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(true)
			expect(result.warnings.some((w) => w.rule === 'scope-enum')).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		test('warn mode: known scope produces no warnings', () => {
			const result = validateCommitMessage(
				'feat(api): add feature',
				{ scopeValidation: 'warn' },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(true)
			expect(
				result.warnings.filter((w) => w.rule === 'scope-enum'),
			).toHaveLength(0)
		})

		test('off mode: unknown scope is valid with no scope check', () => {
			const result = validateCommitMessage(
				'feat(anything): add feature',
				{ scopeValidation: 'off' },
				['cli', 'api', 'core'],
			)
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
			expect(
				result.warnings.filter((w) => w.rule === 'scope-enum'),
			).toHaveLength(0)
		})

		test('merges predefinedScopeValues with allowedScopes', () => {
			const result = validateCommitMessage(
				'feat(predefined): add feature',
				{
					scopeValidation: 'strict',
					allowedScopes: ['config-scope'],
				},
				['predefined'],
			)
			expect(result.valid).toBe(true)

			// Verify the config-scope is also accepted
			const result2 = validateCommitMessage(
				'feat(config-scope): add feature',
				{
					scopeValidation: 'strict',
					allowedScopes: ['config-scope'],
				},
				['predefined'],
			)
			expect(result2.valid).toBe(true)

			// Verify unknown is rejected
			const result3 = validateCommitMessage(
				'feat(other): add feature',
				{
					scopeValidation: 'strict',
					allowedScopes: ['config-scope'],
				},
				['predefined'],
			)
			expect(result3.valid).toBe(false)
			expect(result3.errors.some((e) => e.rule === 'scope-enum')).toBe(true)
		})

		test('backward compat: no scopeValidation with allowedScopes still works as error', () => {
			const result = validateCommitMessage('feat(invalid): test', {
				allowedScopes: ['cli', 'api'],
			})
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'scope-enum')).toBe(true)
		})

		test('backward compat: no scopeValidation with allowedScopes accepts valid scope', () => {
			const result = validateCommitMessage('feat(cli): test', {
				allowedScopes: ['cli', 'api'],
			})
			expect(result.valid).toBe(true)
		})

		test('strict mode: empty predefinedScopeValues with no allowedScopes does not restrict', () => {
			const result = validateCommitMessage(
				'feat(anything): test',
				{ scopeValidation: 'strict' },
				[],
			)
			// Combined list is empty, so no restriction applies
			expect(result.valid).toBe(true)
		})

		test('warn mode: empty predefinedScopeValues with no allowedScopes does not restrict', () => {
			const result = validateCommitMessage(
				'feat(anything): test',
				{ scopeValidation: 'warn' },
				[],
			)
			expect(result.valid).toBe(true)
			expect(
				result.warnings.filter((w) => w.rule === 'scope-enum'),
			).toHaveLength(0)
		})
	})

	describe('FormatValidator with rich scopes', () => {
		function makePreset(scopes?: Array<string | ScopeDefinition>): Preset {
			return {
				name: 'test',
				template: '{type}({scope}): {message}',
				types: [
					{ value: 'feat', desc: 'A new feature' },
					{ value: 'fix', desc: 'A bug fix' },
				],
				scopes,
				validator: (msg: string) => /^\w+(\(\w+\))?: .+/.test(msg),
			}
		}

		test('validateScope works with string scopes', () => {
			const preset = makePreset(['cli', 'api', 'core'])
			const validator = new FormatValidator(preset)
			expect(validator.validateScope('cli')).toBe(true)
			expect(validator.validateScope('api')).toBe(true)
			expect(validator.validateScope('unknown')).toBe(false)
		})

		test('validateScope works with ScopeDefinition scopes', () => {
			const preset = makePreset([
				{ value: 'cli', desc: 'Command line' },
				{ value: 'api', desc: 'REST API' },
			])
			const validator = new FormatValidator(preset)
			expect(validator.validateScope('cli')).toBe(true)
			expect(validator.validateScope('api')).toBe(true)
			expect(validator.validateScope('unknown')).toBe(false)
		})

		test('validateScope works with mixed scopes', () => {
			const preset = makePreset(['cli', { value: 'api', desc: 'REST API' }])
			const validator = new FormatValidator(preset)
			expect(validator.validateScope('cli')).toBe(true)
			expect(validator.validateScope('api')).toBe(true)
			expect(validator.validateScope('other')).toBe(false)
		})

		test('validateScope allows empty scope', () => {
			const preset = makePreset(['cli', 'api'])
			const validator = new FormatValidator(preset)
			expect(validator.validateScope('')).toBe(true)
		})

		test('validateScope allows any scope when no scopes defined', () => {
			const preset = makePreset(undefined)
			const validator = new FormatValidator(preset)
			expect(validator.validateScope('anything')).toBe(true)
		})

		test('validateScope allows any scope when scopes array is empty', () => {
			const preset = makePreset([])
			const validator = new FormatValidator(preset)
			expect(validator.validateScope('anything')).toBe(true)
		})

		test('getAvailableScopes returns ScopeDefinition array', () => {
			const preset = makePreset([
				'cli',
				{ value: 'api', desc: 'REST API' },
				'core',
			])
			const validator = new FormatValidator(preset)
			const scopes = validator.getAvailableScopes()
			expect(scopes).toEqual([
				{ value: 'cli' },
				{ value: 'api', desc: 'REST API' },
				{ value: 'core' },
			])
		})

		test('getAvailableScopes returns empty array when no scopes', () => {
			const preset = makePreset(undefined)
			const validator = new FormatValidator(preset)
			expect(validator.getAvailableScopes()).toEqual([])
		})

		test('getAvailableScopeValues returns string array', () => {
			const preset = makePreset([
				'cli',
				{ value: 'api', desc: 'REST API' },
				'core',
			])
			const validator = new FormatValidator(preset)
			const values = validator.getAvailableScopeValues()
			expect(values).toEqual(['cli', 'api', 'core'])
		})

		test('getAvailableScopeValues returns empty array when no scopes', () => {
			const preset = makePreset(undefined)
			const validator = new FormatValidator(preset)
			expect(validator.getAvailableScopeValues()).toEqual([])
		})
	})

	describe('Config parsing', () => {
		test('config with string scopes parses correctly via defineConfig', () => {
			const config = defineConfig({
				scopes: ['cli', 'api', 'core'],
			})
			expect(config.scopes).toEqual(['cli', 'api', 'core'])
		})

		test('config with ScopeDefinition scopes parses correctly via defineConfig', () => {
			const config = defineConfig({
				scopes: [
					{ value: 'cli', desc: 'Command line' },
					{ value: 'api', desc: 'REST API' },
				],
			})
			expect(config.scopes).toHaveLength(2)
			expect(config.scopes?.[0]).toEqual({ value: 'cli', desc: 'Command line' })
			expect(config.scopes?.[1]).toEqual({ value: 'api', desc: 'REST API' })
		})

		test('config with mixed scopes parses correctly via defineConfig', () => {
			const config = defineConfig({
				scopes: ['cli', { value: 'api', desc: 'REST API' }, 'core'],
			})
			expect(config.scopes).toHaveLength(3)
			expect(config.scopes?.[0]).toBe('cli')
			expect(config.scopes?.[1]).toEqual({ value: 'api', desc: 'REST API' })
			expect(config.scopes?.[2]).toBe('core')
		})

		test('scopeValidation defaults to off in getDefaultConfig', () => {
			const config = getDefaultConfig()
			expect(config.scopeValidation).toBe('off')
		})

		test('scopeValidation accepts strict via defineConfig', () => {
			const config = defineConfig({ scopeValidation: 'strict' })
			expect(config.scopeValidation).toBe('strict')
		})

		test('scopeValidation accepts warn via defineConfig', () => {
			const config = defineConfig({ scopeValidation: 'warn' })
			expect(config.scopeValidation).toBe('warn')
		})

		test('scopeValidation accepts off via defineConfig', () => {
			const config = defineConfig({ scopeValidation: 'off' })
			expect(config.scopeValidation).toBe('off')
		})

		test('scopes defaults to undefined in getDefaultConfig', () => {
			const config = getDefaultConfig()
			expect(config.scopes).toBeUndefined()
		})

		test('config with scopes and scopeValidation together', () => {
			const config = defineConfig({
				scopes: ['cli', { value: 'api', desc: 'REST API' }],
				scopeValidation: 'strict',
			})
			expect(config.scopes).toHaveLength(2)
			expect(config.scopeValidation).toBe('strict')
		})
	})
})
