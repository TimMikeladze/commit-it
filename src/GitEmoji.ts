import { EnquirerInterface } from './types'
import {
  IntentionAndAreaPlugin,
  IntentionAndAreaPluginOptions
} from './IntentionAndAreaPlugin'

export const gitEmojiIntentions = [
  {
    description: 'Initial commit',
    text: '🎉'
  },
  {
    description: 'Version tag',
    text: '🔖'
  },
  {
    description: 'New feature',
    text: '✨'
  },
  {
    description: 'Bugfix',
    text: '🐛'
  },
  {
    description: 'Metadata',
    text: '📇'
  },
  {
    description: 'Documentation',
    text: '📚'
  },
  {
    description: 'Documenting source code',
    text: '💡'
  },
  {
    description: 'Performance',
    text: '🐎'
  },
  {
    description: 'Cosmetic',
    text: '💄'
  },
  {
    description: 'Tests',
    text: '🚨'
  },
  {
    description: 'Adding a test',
    text: '✅'
  },
  {
    description: 'Make a test pass',
    text: '✔️'
  },
  {
    description: 'General update',
    text: '⚡'
  },
  {
    description: 'Improve format/structure',
    text: '🎨'
  },
  {
    description: 'Refactor code',
    text: '🔨'
  },
  {
    description: 'Removing code/files',
    text: '🔥'
  },
  {
    description: 'Continuous Integration',
    text: '💚'
  },
  {
    description: 'Security',
    text: '🔒'
  },
  {
    description: 'Upgrading dependencies',
    text: '⬆️'
  },
  {
    description: 'Downgrading dependencies',
    text: '⬇️'
  },
  {
    description: 'Lint',
    text: '👕'
  },
  {
    description: 'Translation',
    text: '👽'
  },
  {
    description: 'Text',
    text: '📝'
  },
  {
    description: 'Critical hotfix',
    text: '🚑'
  },
  {
    description: 'Deploying stuff',
    text: '🚀'
  },
  {
    description: 'Fixing on MacOS',
    text: '🍎'
  },
  {
    description: 'Fixing on Linux',
    text: '🐧'
  },
  {
    description: 'Fixing on Windows',
    text: '🏁'
  },
  {
    description: 'Work in progress',
    text: '🚧'
  },
  {
    description: 'Adding CI build system',
    text: '👷'
  },
  {
    description: 'Analytics or tracking code',
    text: '📈'
  },
  {
    description: 'Removing a dependency',
    text: '➖'
  },
  {
    description: 'Adding a dependency',
    text: '➕'
  },
  {
    description: 'Docker',
    text: '🐳'
  },
  {
    description: 'Configuration files',
    text: '🔧'
  },
  {
    description: 'Package.json in JS',
    text: '📦'
  },
  {
    description: 'Merging branches',
    text: '🔀'
  },
  {
    description: 'Bad code / need improv.',
    text: '💩'
  },
  {
    description: 'Reverting changes',
    text: '⏪'
  },
  {
    description: 'Breaking changes',
    text: '💥'
  },

  {
    description: 'Code review changes',
    text: '👌'
  },

  {
    description: 'Accessibility',
    text: '♿'
  },
  {
    description: 'Move/rename repository',
    text: '🚚'
  }
]

export const gitEmojiDefaultOptions: IntentionAndAreaPluginOptions = {
  pluginId: 'GitEmoji',
  titleSeparator: '',
  multipleIntentions: true,
  multipleAreas: true,
  commitBodyRequired: true,
  areasRequired: false,
  intentions: gitEmojiIntentions,
  sortAreas: (a, b) => a.text.localeCompare(b.text)
}

export class GitEmoji extends IntentionAndAreaPlugin {
  constructor(
    options?: Partial<IntentionAndAreaPluginOptions>,
    enquirer?: EnquirerInterface
  ) {
    super(
      {
        ...gitEmojiDefaultOptions,
        ...options
      },
      enquirer
    )
  }
}
