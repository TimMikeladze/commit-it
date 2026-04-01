import { expect, test } from 'bun:test'
import { listPresets } from '../src'

test('should export listPresets', () => {
	const presets = listPresets()
	expect(presets).toBeArrayOfSize(2)
	expect(presets).toContain('conventional')
})
