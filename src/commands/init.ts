import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { confirm, text } from '@clack/prompts'
import { command } from '@drizzle-team/brocli'

export const initCommand = command({
	name: 'init',
	desc: 'Initialize a .commitit.json config file',
	handler: async () => {
		const configPath = join(process.cwd(), '.commitit.json')

		if (existsSync(configPath)) {
			const overwrite = await confirm({
				message: '.commitit.json already exists. Overwrite?',
				initialValue: false,
			})
			if (!overwrite) {
				console.log('Cancelled')
				return
			}
		}

		const preset = await text({
			message: 'Default preset (conventional, angular, gitmoji)?',
			defaultValue: 'conventional',
		})

		const config = {
			preset,
			defaults: {
				scope: '',
				includeBody: true,
			},
			plugins: [],
			github: {
				enabled: true,
				auto: {
					detectIssues: true,
					suggestReviewers: false,
				},
			},
		}

		writeFileSync(configPath, JSON.stringify(config, null, 2))
		console.log(`✓ Created .commitit.json`)
	},
})
