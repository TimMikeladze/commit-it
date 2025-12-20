import { command } from '@drizzle-team/brocli'
import { presets } from '../presets'

export const presetsCommand = command({
	name: 'presets',
	desc: 'List available commit format presets',
	handler: async () => {
		console.log('\nAvailable presets:\n')
		Object.entries(presets).forEach(([key, preset]) => {
			console.log(`  ${key}: ${preset.name}`)
		})
		console.log()
	},
})
