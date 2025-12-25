import { describe, expect, test } from 'bun:test'
import { getPreset, listPresets, presets } from '../../src'

describe('Presets', () => {
	describe('listPresets', () => {
		test('should list all presets', () => {
			const list = listPresets()
			expect(list).toContain('conventional')
			expect(list).toContain('angular')
			expect(list).toContain('gitmoji')
		})
	})

	describe('getPreset', () => {
		test('should get conventional preset', () => {
			const preset = getPreset('conventional')
			expect(preset.name).toBe('Conventional Commits')
			expect(preset.types).toBeDefined()
			expect(preset.types.length).toBeGreaterThan(0)
		})

		test('should get angular preset', () => {
			const preset = getPreset('angular')
			expect(preset.name).toBe('Angular Style')
		})

		test('should get gitmoji preset', () => {
			const preset = getPreset('gitmoji')
			expect(preset.name).toBe('Gitmoji')
		})
	})

	describe('presets', () => {
		test('should have conventional types', () => {
			const types = presets.conventional!.types.map((t) => t.value)
			expect(types).toContain('feat')
			expect(types).toContain('fix')
			expect(types).toContain('docs')
			expect(types).toContain('style')
			expect(types).toContain('refactor')
			expect(types).toContain('perf')
			expect(types).toContain('test')
			expect(types).toContain('chore')
		})

		test('should have gitmoji types', () => {
			const types = presets.gitmoji!.types
			expect(types.some((t) => t.value === '✨')).toBe(true)
			expect(types.some((t) => t.value === '🐛')).toBe(true)
		})
	})
})
