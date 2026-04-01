import { command } from '@drizzle-team/brocli'
import { runSetupWizard } from '../services/setup'

export const setupCommand = command({
	name: 'setup',
	desc: 'Run the setup wizard to configure AI provider, model, and editor',
	shortDesc: 'Configure commit-it',
	handler: async () => {
		try {
			await runSetupWizard()
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			if (message === 'Cancelled') {
				process.exit(0)
			}
			console.error('Setup failed:', message)
			process.exit(1)
		}
	},
})
