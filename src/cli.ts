#!/usr/bin/env node

import { run } from '@drizzle-team/brocli'
import { commitCommand } from './commands/commit'
import { configCommand } from './commands/config'
import { initCommand } from './commands/init'
import { presetsCommand } from './commands/presets'

const commands = [commitCommand, initCommand, presetsCommand, configCommand]

run(commands, {
	name: 'commit-it',
	description: 'Create standardized commits with GitHub integration',
	version: '0.1.0',
})
