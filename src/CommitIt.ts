import path from 'path'
import * as fs from 'fs'
import { GitEmoji } from './GitEmoji'
import simpleGit from 'simple-git'
import { Commit, CommitItOptions, CommitItPlugin } from './types'

export const DEFAULT_CONFIG_PATH = './commit.config.js'

export class CommitIt {
  private readonly options: CommitItOptions

  constructor(options: CommitItOptions = {}) {
    this.options = {
      messageSeparator: '\n',
      titleSeparator: '|',
      ...options
    }
  }

  public static async loadConfig(
    configPath: string = DEFAULT_CONFIG_PATH
  ): Promise<CommitItOptions> {
    const p = path.resolve(configPath)
    if (!fs.existsSync(p)) {
      return {
        plugins: [new GitEmoji()]
      }
    } else {
      const importedConfig = await import(p)

      return importedConfig.default
    }
  }

  public async initialize(): Promise<void> {}

  public async executePlugins(): Promise<string> {
    const plugins: CommitItPlugin[] = this.options.plugins || [new GitEmoji()]
    let options = this.options || {}
    let commit: Commit = {
      data: []
    }

    for (const plugin of plugins) {
      let result
      if (plugin.options.pluginAction !== 'run') {
        result = await plugin.load(options, commit)
        options = result[0]
        commit = result[1]
      }
    }

    for (const plugin of plugins) {
      let result
      if (plugin.options.pluginAction !== 'load') {
        result = await plugin.run(options, commit)
      }
      options = result[0]
      commit = result[1]
    }

    const title = commit.title
      ?.map((x) => x.text)
      .join(this.options.titleSeparator)
    const body = commit.body
      ?.map((x) => x.text)
      .join(this.options.messageSeparator)

    const message = (title + '\n\n' + body).trim()

    if (!message) {
      throw new Error('No commit message provided. Commit aborted.')
    }

    if (this.options.dryRun !== true) {
      await simpleGit()
        .outputHandler((cmd, stdout, stderr, ...args) => {
          const out = []
          stdout.on('data', (buffer) => out.push(buffer))
          stdout.on('close', () =>
            console.log(Buffer.concat(out).toString('utf8'))
          )
        })
        .commit(message)
    }

    return message
  }
}
