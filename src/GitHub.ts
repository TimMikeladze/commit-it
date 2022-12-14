import { Commit, CommitItOptions, EnquirerInterface } from './types'
import {
  IntentionAndAreaPlugin,
  IntentionAndAreaPluginOptions
} from './IntentionAndAreaPlugin'

export const githubDefaultOptions: IntentionAndAreaPluginOptions = {
  pluginId: 'github'
}

export class GitHub extends IntentionAndAreaPlugin {
  constructor(
    options?: Partial<IntentionAndAreaPluginOptions>,
    enquirer?: EnquirerInterface
  ) {
    super(
      {
        ...githubDefaultOptions,
        ...options
      },
      enquirer
    )
  }
}
