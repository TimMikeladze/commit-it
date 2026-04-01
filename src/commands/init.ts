import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { confirm, isCancel, select, text } from '@clack/prompts'
import { command } from '@drizzle-team/brocli'
import { setupShellAlias } from './alias'

type ConfigFormat = 'ts' | 'js' | 'json' | 'yaml'

const CONFIG_FILES: Record<ConfigFormat, string> = {
	ts: 'commit.config.ts',
	js: 'commit.config.js',
	json: '.commitrc.json',
	yaml: '.commitrc.yaml',
}

function generateConfig(
	preset: string,
	format: ConfigFormat,
): { filename: string; content: string } {
	const filename = CONFIG_FILES[format]

	const config = {
		preset,
		defaults: {
			scope: '',
			includeBody: true,
		},
		github: {
			enabled: true,
			auto: {
				detectIssues: true,
				suggestReviewers: false,
			},
		},
		validation: {
			enabled: true,
			maxHeaderLength: 72,
			requireScope: false,
		},
	}

	if (format === 'ts') {
		return {
			filename,
			content: `import { defineConfig } from 'commit-it'

export default defineConfig(${JSON.stringify(config, null, '\t')})
`,
		}
	}

	if (format === 'js') {
		return {
			filename,
			content: `/** @type {import('commit-it').Config} */
export default ${JSON.stringify(config, null, '\t')}
`,
		}
	}

	if (format === 'yaml') {
		// Simple YAML generation
		const yaml = `# Commit-It Configuration
preset: ${config.preset}

defaults:
  scope: ""
  includeBody: true

github:
  enabled: true
  auto:
    detectIssues: true
    suggestReviewers: false

validation:
  enabled: true
  maxHeaderLength: 72
  requireScope: false
`
		return { filename, content: yaml }
	}

	// JSON format
	return {
		filename,
		content: `${JSON.stringify(config, null, '\t')}\n`,
	}
}

export const initCommand = command({
	name: 'init',
	desc: 'Initialize a commit-it config file',
	handler: async () => {
		// Check for existing config files
		const existingConfigs = Object.values(CONFIG_FILES).filter((file) =>
			existsSync(join(process.cwd(), file)),
		)

		if (existingConfigs.length > 0) {
			const overwrite = await confirm({
				message: `Config file(s) already exist: ${existingConfigs.join(', ')}. Overwrite?`,
				initialValue: false,
			})

			if (isCancel(overwrite) || !overwrite) {
				console.log('Cancelled')
				return
			}
		}

		const format = await select<ConfigFormat>({
			message: 'Config file format',
			options: [
				{
					value: 'ts',
					label: 'commit.config.ts (TypeScript, recommended)',
				},
				{ value: 'js', label: 'commit.config.js (JavaScript)' },
				{ value: 'json', label: '.commitrc.json (JSON)' },
				{ value: 'yaml', label: '.commitrc.yaml (YAML)' },
			],
			initialValue: 'ts',
		})

		if (isCancel(format)) {
			console.log('Cancelled')
			return
		}

		const preset = await text({
			message: 'Default preset',
			placeholder: 'conventional or gitmoji',
			defaultValue: 'conventional',
		})

		if (isCancel(preset)) {
			console.log('Cancelled')
			return
		}

		const { filename, content } = generateConfig(
			preset || 'conventional',
			format,
		)
		const configPath = join(process.cwd(), filename)

		writeFileSync(configPath, content)
		console.log(`✓ Created ${filename}`)

		// Offer shell alias setup
		const addAlias = await confirm({
			message: 'Add a shell alias? (e.g. type "commit" instead of "commit-it")',
			initialValue: true,
		})

		if (!isCancel(addAlias) && addAlias) {
			await setupShellAlias()
		}

		console.log('\nNext steps:')
		console.log('  1. Run `commit-it` to create your first commit')
		console.log('  2. Run `commit-it install-hook` to enable validation')
	},
})
