import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type UserAIConfig, UserAIConfigSchema } from './types'

export function getConfigPath(): string {
	return join(homedir(), '.commit-it', 'config.json')
}

export async function loadUserAIConfig(
	configPath?: string,
): Promise<UserAIConfig | null> {
	const path = configPath ?? getConfigPath()

	try {
		const content = await readFile(path, 'utf-8')
		const json = JSON.parse(content)
		return UserAIConfigSchema.parse(json)
	} catch {
		return null
	}
}
