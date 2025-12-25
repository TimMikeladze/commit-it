#!/usr/bin/env node

import { run } from '@drizzle-team/brocli'
import { branchCommand } from './commands/branch'
import { commitCommand } from './commands/commit'
import { configCommand } from './commands/config'
import { installHookCommand, uninstallHookCommand } from './commands/hook'
import { initCommand } from './commands/init'
import { presetsCommand } from './commands/presets'
import { validateCommand } from './commands/validate'

const commands = [
	commitCommand,
	branchCommand,
	validateCommand,
	installHookCommand,
	uninstallHookCommand,
	initCommand,
	presetsCommand,
	configCommand,
]

// Default to 'commit' command if no command specified or first arg is a flag
const args = process.argv.slice(2)
const knownCommands = new Set([
	'commit',
	'branch',
	'validate',
	'install-hook',
	'uninstall-hook',
	'init',
	'presets',
	'config',
])

// If no args, or first arg is a flag, inject 'commit' command
if (args.length === 0 || (args[0] && args[0].startsWith('-'))) {
	process.argv.splice(2, 0, 'commit')
} else if (!knownCommands.has(args[0]!)) {
	// First arg isn't a known command, assume it's meant for commit
	process.argv.splice(2, 0, 'commit')
}

run(commands, {
	name: 'commit-it',
	description: 'Create standardized commits with GitHub integration',
	version: '0.1.0',
})
