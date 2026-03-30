import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import {
	getConfigPath,
	loadUserAIConfig,
} from '../../../src/services/ai/config'

const TEST_CONFIG_DIR = '/tmp/commit-it-test-config'
const TEST_CONFIG_PATH = `${TEST_CONFIG_DIR}/config.json`

describe('loadUserAIConfig', () => {
	beforeEach(() => {
		if (existsSync(TEST_CONFIG_DIR)) {
			rmSync(TEST_CONFIG_DIR, { recursive: true })
		}
		mkdirSync(TEST_CONFIG_DIR, { recursive: true })
	})

	afterEach(() => {
		if (existsSync(TEST_CONFIG_DIR)) {
			rmSync(TEST_CONFIG_DIR, { recursive: true })
		}
	})

	test('should return null when config file does not exist', async () => {
		const config = await loadUserAIConfig('/tmp/nonexistent/config.json')
		expect(config).toBeNull()
	})

	test('should return null for invalid JSON', async () => {
		writeFileSync(TEST_CONFIG_PATH, 'not json')
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config).toBeNull()
	})

	test('should parse valid config', async () => {
		writeFileSync(
			TEST_CONFIG_PATH,
			JSON.stringify({
				ai: {
					auto: true,
					provider: 'claude',
					providers: [{ name: 'claude', model: 'sonnet' }],
				},
			}),
		)
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config).not.toBeNull()
		expect(config?.ai?.auto).toBe(true)
		expect(config?.ai?.provider).toBe('claude')
		expect(config?.ai?.providers).toHaveLength(1)
		expect(config?.ai?.providers[0]?.name).toBe('claude')
	})

	test('should handle config with no ai field', async () => {
		writeFileSync(TEST_CONFIG_PATH, JSON.stringify({}))
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config).not.toBeNull()
		expect(config?.ai).toBeUndefined()
	})

	test('should apply defaults for missing fields', async () => {
		writeFileSync(
			TEST_CONFIG_PATH,
			JSON.stringify({ ai: { provider: 'codex' } }),
		)
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config?.ai?.auto).toBe(false)
		expect(config?.ai?.providers).toEqual([])
	})
})

describe('getConfigPath', () => {
	test('should return path under home directory', () => {
		const path = getConfigPath()
		expect(path).toContain('.commit-it')
		expect(path).toEndWith('config.json')
	})
})
