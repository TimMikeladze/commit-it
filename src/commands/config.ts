import { command } from '@drizzle-team/brocli'
import { loadConfig } from '../config'

export const configCommand = command({
	name: 'config',
	desc: 'Show commit-it configuration',
	handler: async () => {
		try {
			const config = await loadConfig()
			console.log('\nCurrent configuration:\n')
			console.log(JSON.stringify(config, null, 2))
			console.log()
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			console.error('✗ Error loading config:', message)
			process.exit(1)
		}
	},
})
