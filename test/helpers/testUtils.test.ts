import { describe, expect, test } from 'bun:test'
import {
	createSpy,
	createTestConfig,
	normalizeWhitespace,
	sleep,
} from './testUtils'

describe('Test Utils', () => {
	test('createTestConfig should create a valid config', () => {
		const config = createTestConfig()
		expect(config.preset).toBe('conventional')
		expect(config.scopeMode).toBe('single')
		expect(config.validation?.enabled).toBe(true)
	})

	test('createTestConfig should accept overrides', () => {
		const config = createTestConfig({
			preset: 'custom',
			scopeMode: 'multi-inline',
		})
		expect(config.preset).toBe('custom')
		expect(config.scopeMode).toBe('multi-inline')
		expect(config.validation?.enabled).toBe(true) // default not overridden
	})

	test('normalizeWhitespace should normalize text', () => {
		const text = '  hello   world  \n  test  '
		expect(normalizeWhitespace(text)).toBe('hello world test')
	})

	test('createSpy should track function calls', () => {
		const spy = createSpy<(...args: unknown[]) => void>()
		spy(1, 'test')
		spy(2, 'another')

		expect(spy.calls.length).toBe(2)
		expect(spy.calls[0]).toEqual([1, 'test'])
		expect(spy.calls[1]).toEqual([2, 'another'])
	})

	test('createSpy reset should clear calls', () => {
		const spy = createSpy<() => void>()
		spy()
		spy()
		expect(spy.calls.length).toBe(2)

		spy.reset()
		expect(spy.calls.length).toBe(0)
	})

	test('sleep should wait for specified time', async () => {
		const start = Date.now()
		await sleep(50)
		const elapsed = Date.now() - start
		expect(elapsed).toBeGreaterThanOrEqual(45) // Allow small variance
	})
})
