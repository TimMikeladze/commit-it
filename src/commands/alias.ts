import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { confirm, isCancel, select, text } from '@clack/prompts'
import { command } from '@drizzle-team/brocli'

type ShellType = 'zsh' | 'bash' | 'fish'

interface ShellInfo {
	name: string
	configPath: string
	formatAlias: (name: string, target: string) => string
}

function getHomeDir(): string {
	return process.env.HOME || process.env.USERPROFILE || ''
}

function detectShell(): ShellType | null {
	const shell = process.env.SHELL || ''
	if (shell.endsWith('/zsh')) return 'zsh'
	if (shell.endsWith('/bash')) return 'bash'
	if (shell.endsWith('/fish')) return 'fish'
	return null
}

function getShellInfo(shell: ShellType): ShellInfo {
	const home = getHomeDir()

	switch (shell) {
		case 'zsh':
			return {
				name: 'Zsh',
				configPath: join(home, '.zshrc'),
				formatAlias: (name, target) => `alias ${name}='${target}'`,
			}
		case 'bash':
			return {
				name: 'Bash',
				configPath: join(home, '.bashrc'),
				formatAlias: (name, target) => `alias ${name}='${target}'`,
			}
		case 'fish':
			return {
				name: 'Fish',
				configPath: join(home, '.config', 'fish', 'config.fish'),
				formatAlias: (name, target) => `alias ${name} '${target}'`,
			}
	}
}

function aliasExistsInFile(filePath: string, aliasName: string): boolean {
	if (!existsSync(filePath)) return false

	const content = readFileSync(filePath, 'utf-8')
	// Check for alias name= or alias name ' (fish)
	const patterns = [
		new RegExp(`^\\s*alias\\s+${aliasName}\\s*=`, 'm'),
		new RegExp(`^\\s*alias\\s+${aliasName}\\s+'`, 'm'),
		new RegExp(`^\\s*alias\\s+${aliasName}\\s+"`, 'm'),
	]
	return patterns.some((p) => p.test(content))
}

export async function setupShellAlias(): Promise<boolean> {
	const detected = detectShell()

	const shellOptions: Array<{ value: ShellType; label: string }> = [
		{
			value: 'zsh',
			label: `Zsh (~/.zshrc)${detected === 'zsh' ? ' (detected)' : ''}`,
		},
		{
			value: 'bash',
			label: `Bash (~/.bashrc)${detected === 'bash' ? ' (detected)' : ''}`,
		},
		{
			value: 'fish',
			label: `Fish (~/.config/fish/config.fish)${detected === 'fish' ? ' (detected)' : ''}`,
		},
	]

	const shell = await select<ShellType>({
		message: 'Which shell do you use?',
		options: shellOptions,
		initialValue: detected || 'zsh',
	})

	if (isCancel(shell)) {
		return false
	}

	const aliasName = await text({
		message: 'Alias name',
		placeholder: 'commit',
		defaultValue: 'commit',
	})

	if (isCancel(aliasName)) {
		return false
	}

	const name = aliasName || 'commit'
	const info = getShellInfo(shell)
	const aliasLine = info.formatAlias(name, 'commit-it')

	// Check if alias already exists
	if (aliasExistsInFile(info.configPath, name)) {
		console.log(`ℹ Alias "${name}" already exists in ${info.configPath}`)
		return true
	}

	// Preview and confirm
	console.log(`\n  Will append to ${info.configPath}:`)
	console.log(`  ${aliasLine}\n`)

	const confirmed = await confirm({
		message: `Add alias to ${info.configPath}?`,
		initialValue: true,
	})

	if (isCancel(confirmed) || !confirmed) {
		return false
	}

	// Ensure parent directory exists (for fish)
	const dir = dirname(info.configPath)
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}

	// Append alias
	const prefix = existsSync(info.configPath) ? '\n' : ''
	appendFileSync(
		info.configPath,
		`${prefix}# commit-it: shell alias\n${aliasLine}\n`,
	)

	console.log(`✓ Added alias "${name}" to ${info.configPath}`)
	console.log(`\n  Run this to activate now:`)
	console.log(`  source ${info.configPath}`)
	console.log(`\n  Then use "${name}" instead of "commit-it":`)
	console.log(`  ${name}          # interactive commit`)
	console.log(`  ${name} --ai     # AI-generated commit`)

	return true
}

export const setupAliasCommand = command({
	name: 'setup-alias',
	desc: 'Add a shell alias (e.g. "commit") to your shell config',
	shortDesc: 'Add shell alias',
	handler: async () => {
		try {
			await setupShellAlias()
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			if (message === 'Cancelled') {
				process.exit(0)
			}
			console.error('✗ Error:', message)
			process.exit(1)
		}
	},
})
