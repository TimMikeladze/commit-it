#!/usr/bin/env node

import { Command } from 'commander'
import * as path from 'path'
import { CommitIt, DEFAULT_CONFIG_PATH } from './CommitIt'

interface CommanderOptions {
  config?: string
  dryRun?: boolean
}

;(async () => {
  const program = new Command()

  program
    .option(
      '-c, --config <config>',
      'path to a js config file. Defaults to ./commit.config.js'
    )
    .option('-d, --dry-run', 'does not make a commit')

  const options: CommanderOptions = program.opts()

  const configPath = path.resolve(options.config || DEFAULT_CONFIG_PATH)

  const config = await CommitIt.loadConfig(configPath)

  const am = new CommitIt(config)

  try {
    await am.execute()
    process.exit(0)
  } catch (err: any) {
    console.error(err.message)
    process.exit(1)
  }
})()
