import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { boolean, command } from '@drizzle-team/brocli'

const COMMIT_MSG_HOOK = `#!/bin/sh
# commit-it: Validate commit messages
# Installed by: commit-it install-hook

commit_msg_file="$1"

# Run commit-it validation
if command -v commit-it > /dev/null 2>&1; then
    commit-it validate --file "$commit_msg_file"
    exit $?
elif command -v npx > /dev/null 2>&1; then
    npx commit-it validate --file "$commit_msg_file"
    exit $?
else
    echo "Warning: commit-it not found, skipping validation"
    exit 0
fi
`

export const installHookCommand = command({
	name: 'install-hook',
	desc: 'Install git commit-msg hook for validation',
	shortDesc: 'Install commit-msg hook',
	options: {
		force: boolean('force')
			.alias('f')
			.desc('Overwrite existing hook')
			.default(false),
	},
	handler: async (opts) => {
		try {
			// Find git directory
			const gitDir = join(process.cwd(), '.git')
			if (!existsSync(gitDir)) {
				console.error('✗ Not a git repository (no .git directory)')
				process.exit(1)
			}

			const hooksDir = join(gitDir, 'hooks')
			const hookPath = join(hooksDir, 'commit-msg')

			// Create hooks directory if needed
			if (!existsSync(hooksDir)) {
				mkdirSync(hooksDir, { recursive: true })
			}

			// Check for existing hook
			if (existsSync(hookPath)) {
				const existing = readFileSync(hookPath, 'utf-8')

				if (existing.includes('commit-it')) {
					console.log('ℹ commit-it hook already installed')
					process.exit(0)
				}

				if (!opts.force) {
					console.error('✗ A commit-msg hook already exists')
					console.log(
						'  Use --force to overwrite, or manually add commit-it to your hook',
					)
					console.log('\n  Add this to your existing hook:')
					console.log('    commit-it validate --file "$1"')
					process.exit(1)
				}

				console.log('⚠ Overwriting existing hook')
			}

			// Write hook
			writeFileSync(hookPath, COMMIT_MSG_HOOK)
			chmodSync(hookPath, '755')

			console.log('✓ Installed commit-msg hook')
			console.log(`  Location: ${hookPath}`)
			console.log('\nCommit messages will now be validated before each commit.')
			console.log(
				'Configure rules in commit.config.ts or .commitrc under "validation"',
			)
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			console.error('✗ Error:', message)
			process.exit(1)
		}
	},
})

export const uninstallHookCommand = command({
	name: 'uninstall-hook',
	desc: 'Remove git commit-msg hook',
	shortDesc: 'Uninstall commit-msg hook',
	handler: async () => {
		try {
			const gitDir = join(process.cwd(), '.git')
			const hookPath = join(gitDir, 'hooks', 'commit-msg')

			if (!existsSync(hookPath)) {
				console.log('ℹ No commit-msg hook found')
				process.exit(0)
			}

			const content = readFileSync(hookPath, 'utf-8')
			if (!content.includes('commit-it')) {
				console.log('ℹ commit-msg hook is not managed by commit-it')
				process.exit(0)
			}

			unlinkSync(hookPath)

			console.log('✓ Removed commit-msg hook')
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			console.error('✗ Error:', message)
			process.exit(1)
		}
	},
})
