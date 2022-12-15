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

export interface Label {
  color: string
  default: boolean
  description: string
  id: number
  name: string
  node_id: string
  url: string
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

  public static async fetchLabels({
    owner,
    repo,
    auth,
    octokit
  }: {
    auth?: any
    octokit?: Octokit
    owner: string
    repo: string
  }): Promise<Label[]> {
    const _octokit =
      octokit ||
      new Octokit({
        auth
      })
    const labels = await _octokit.issues.listLabelsForRepo({
      owner,
      repo
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
      ...(await GitHub.fetchLabels({
        owner: this.options.owner,
        repo: this.options.repo,
        octokit: this.octokit
      }))
    ].filter(Boolean)

    return [config, commit]
  }
}
