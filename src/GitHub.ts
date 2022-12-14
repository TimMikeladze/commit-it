import { Commit, CommitItOptions, EnquirerInterface } from './types'
import {
  IntentionAndAreaPlugin,
  IntentionAndAreaPluginOptions
} from './IntentionAndAreaPlugin'
import { Octokit } from '@octokit/rest'

export interface GitHubPluginOptions extends IntentionAndAreaPluginOptions {
  auth: any
  owner: string
  repo: string
}

export const githubDefaultOptions: Partial<GitHubPluginOptions> = {
  pluginId: 'GitHub'
}

export class GitHub extends IntentionAndAreaPlugin<GitHubPluginOptions> {
  private readonly octokit: Octokit

  constructor(options?: GitHubPluginOptions, enquirer?: EnquirerInterface) {
    super(
      {
        ...githubDefaultOptions,
        ...options
      },
      enquirer
    )

    this.octokit = new Octokit({
      auth: options.auth
    })
  }

  public async fetchLabels(): Promise<
    {
      color: string
      description?: string
      name: string
    }[]
  > {
    const labels = await this.octokit.issues.listLabelsForRepo({
      owner: this.options.owner,
      repo: this.options.repo
    })

    return labels.data
  }

  public async load(
    config: CommitItOptions,
    commit: Commit
  ): Promise<[any, any]> {
    commit.data.intentions = [
      ...(commit.data.intentions || []),
      ...(this.options.intentions || [])
    ].filter(Boolean)

    commit.data.areas = [
      ...(commit.data.areas || []),
      ...(this.options.areas || []),
      ...(await this.fetchLabels())
    ].filter(Boolean)

    return [config, commit]
  }
}
