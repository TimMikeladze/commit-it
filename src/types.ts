import Enquirer from 'enquirer'

export interface CommitItOptions {
  dryRun?: boolean
  messageSeparator?: string
  // eslint-disable-next-line no-use-before-define
  plugins?: CommitItPlugin[]
  titleSeparator?: string
}

export interface PluginOptions {
  pluginAction?: 'load' | 'run'
  pluginId: string
}

export interface PromptOptions {
  [key: string]: any
  name: string
}

export interface EnquirerInterface {
  prompt(questions: PromptOptions): Promise<any>
}

export abstract class CommitItPlugin {
  public enquirer: EnquirerInterface
  public pluginId: string
  public pluginAction?: 'load' | 'run'
  protected constructor(
    { pluginId, pluginAction }: PluginOptions,
    enquirer?: EnquirerInterface
  ) {
    this.pluginId = pluginId
    this.pluginAction = pluginAction
    if (enquirer) {
      this.enquirer = enquirer
    } else {
      ;(this as any).enquirer = new Enquirer()
    }
  }

  public abstract load(
    options: CommitItOptions,
    commit: any
  ): Promise<[any, any]>

  public abstract run(
    options: CommitItOptions,
    commit: any
  ): Promise<[any, any]>
}

export interface Commit {
  body?: {
    pluginAction?: 'load' | 'run'
    pluginId: string
    text: string
  }[]
  data?: Record<string, any>
  title?: {
    pluginAction?: 'load' | 'run'
    pluginId: string
    text: string
  }[]
}
