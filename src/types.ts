import Enquirer from 'enquirer'
import { PromptOptions } from './GitEmoji'

export interface CommitItOptions {
  dryRun?: boolean
  messageSeparator?: string
  // eslint-disable-next-line no-use-before-define
  plugins?: CommitItPlugin[]
  titleSeparator?: string
}

export interface EnquirerInterface {
  prompt(questions: PromptOptions): Promise<any>
}

export abstract class CommitItPlugin {
  public name: string
  public enquirer: EnquirerInterface
  protected constructor(name: string, enquirer?: EnquirerInterface) {
    this.name = name
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
    plugin: string
    text: string
  }[]
  data?: Record<string, any>
  title?: {
    plugin: string
    text: string
  }[]
}
