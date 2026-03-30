import { readFileSync } from 'node:fs'
import { command, string } from '@drizzle-team/brocli'
import { loadConfig } from '../config'
import {
	formatValidationResult,
	getDefaultValidationConfig,
	validateCommitMessage,
} from '../services/validation'

export const validateCommand = command({
	name: 'validate',
	desc: 'Validate a commit message against configured rules',
	shortDesc: 'Validate commit message',
	options: {
		message: string('message').alias('m').desc('Commit message to validate'),
		file: string('file')
			.alias('f')
			.desc('File containing commit message (e.g., .git/COMMIT_EDITMSG)'),
	},
	handler: async (opts) => {
		try {
			let message: string

			if (opts.file) {
				// Read message from file
				try {
					message = readFileSync(opts.file, 'utf-8').trim()
				} catch {
					console.error(`✗ Could not read file: ${opts.file}`)
					process.exit(1)
				}
			} else if (opts.message) {
				message = opts.message
			} else {
				console.error('✗ Please provide a message with --message or --file')
				console.log('\nUsage:')
				console.log('  commit-it validate --message "feat: add feature"')
				console.log('  commit-it validate --file .git/COMMIT_EDITMSG')
				process.exit(1)
			}

			const config = await loadConfig()
			const validationConfig =
				config.validation || getDefaultValidationConfig()

			if (!validationConfig.enabled) {
				console.log('ℹ Validation is disabled in config')
				process.exit(0)
			}

			console.log('Validating commit message:\n')
			console.log(`  "${message.split('\n')[0]}"`)
			if (message.split('\n').length > 1) {
				console.log(`  ... (${message.split('\n').length} lines total)`)
			}
			console.log()

			const result = validateCommitMessage(message, validationConfig)
			console.log(formatValidationResult(result))

			if (!result.valid) {
				process.exit(1)
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			console.error('✗ Error:', message)
			process.exit(1)
		}
	},
})
