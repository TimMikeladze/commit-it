import { expect, test } from 'bun:test'
import { listPresets } from '../src'

test('should export listPresets', () => {
	const presets = listPresets()
	expect(presets).toBeArrayOfSize(3)
	expect(presets).toContain('conventional')
})
