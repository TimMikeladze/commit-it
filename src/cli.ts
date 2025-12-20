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

run(commands, {
	name: 'commit-it',
	description: 'Create standardized commits with GitHub integration',
	version: '0.1.0',
})
