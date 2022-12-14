import Enquirer from 'enquirer'

export interface PluginOptions {
  pluginAction?: 'load' | 'run'
  pluginId: string
}

export interface CommitItOptions<T extends PluginOptions = PluginOptions> {
  dryRun?: boolean
  messageSeparator?: string
  // eslint-disable-next-line no-use-before-define
  plugins?: CommitItPlugin<T>[]
  titleSeparator?: string
}

export interface PromptOptions {
  [key: string]: any
  name: string
}

export interface EnquirerInterface {
  prompt(questions: PromptOptions): Promise<any>
}

export abstract class CommitItPlugin<T extends PluginOptions = PluginOptions> {
  public enquirer: EnquirerInterface
  public options: T
  protected constructor(options: T, enquirer?: EnquirerInterface) {
    this.options = {
      ...options
    }
    if (enquirer) {
      this.enquirer = enquirer
    } else {
      ;(this as any).enquirer = new Enquirer()
    }
  }

  public abstract load(
    options: CommitItOptions<T>,
    commit: any
  ): Promise<[any, any]>

  public abstract run(
    options: CommitItOptions<T>,
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
