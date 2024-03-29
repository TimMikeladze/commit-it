import path from 'path'
import * as fs from 'fs'
import { GitEmoji } from './GitEmoji'
import simpleGit from 'simple-git'
import { Commit, CommitItOptions, CommitItPlugin } from './types'
import url from 'node:url'

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
      const importedConfig = await import(url.pathToFileURL(p).toString())

      return importedConfig.default
    }
  }

  public async execute(): Promise<{
    commit: Commit
    message: string
    options: CommitItOptions
  }> {
    const plugins: CommitItPlugin[] = this.options.plugins || [new GitEmoji()]
    let options =
      {
        ...this.options
      } || {}
    let commit: Commit = {
      data: []
    }

    for (const plugin of plugins) {
      let result
      if (plugin.options.pluginAction !== 'run') {
        result = await plugin.load(options, commit)
        if (result?.[0]) {
          options = result[0]
        }
        if (result?.[1]) {
          commit = result[1]
        }
      }
    }

    for (const plugin of plugins) {
      let result
      if (plugin.options.pluginAction !== 'load') {
        result = await plugin.run(options, commit)
        if (result?.[0]) {
          options = result[0]
        }
        if (result?.[1]) {
          commit = result[1]
        }
      }
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

    return { message, commit, options }
  }
}
