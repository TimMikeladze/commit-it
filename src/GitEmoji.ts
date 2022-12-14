import { EnquirerInterface } from './types'
import {
  IntentionAndAreaPlugin,
  IntentionAndAreaPluginOptions
} from './IntentionAndAreaPlugin'

export const gitEmojiIntentions = [
  {
    description: 'Initial commit',
    name: '🎉'
  },
  {
    description: 'Version tag',
    name: '🔖'
  },
  {
    description: 'New feature',
    name: '✨'
  },
  {
    description: 'Bugfix',
    name: '🐛'
  },
  {
    description: 'Metadata',
    name: '📇'
  },
  {
    description: 'Documentation',
    name: '📚'
  },
  {
    description: 'Documenting source code',
    name: '💡'
  },
  {
    description: 'Performance',
    name: '🐎'
  },
  {
    description: 'Cosmetic',
    name: '💄'
  },
  {
    description: 'Tests',
    name: '🚨'
  },
  {
    description: 'Adding a test',
    name: '✅'
  },
  {
    description: 'Make a test pass',
    name: '✔️'
  },
  {
    description: 'General update',
    name: '⚡'
  },
  {
    description: 'Improve format/structure',
    name: '🎨'
  },
  {
    description: 'Refactor code',
    name: '🔨'
  },
  {
    description: 'Removing code/files',
    name: '🔥'
  },
  {
    description: 'Continuous Integration',
    name: '💚'
  },
  {
    description: 'Security',
    name: '🔒'
  },
  {
    description: 'Upgrading dependencies',
    name: '⬆️'
  },
  {
    description: 'Downgrading dependencies',
    name: '⬇️'
  },
  {
    description: 'Lint',
    name: '👕'
  },
  {
    description: 'Translation',
    name: '👽'
  },
  {
    description: 'Text',
    name: '📝'
  },
  {
    description: 'Critical hotfix',
    name: '🚑'
  },
  {
    description: 'Deploying stuff',
    name: '🚀'
  },
  {
    description: 'Fixing on MacOS',
    name: '🍎'
  },
  {
    description: 'Fixing on Linux',
    name: '🐧'
  },
  {
    description: 'Fixing on Windows',
    name: '🏁'
  },
  {
    description: 'Work in progress',
    name: '🚧'
  },
  {
    description: 'Adding CI build system',
    name: '👷'
  },
  {
    description: 'Analytics or tracking code',
    name: '📈'
  },
  {
    description: 'Removing a dependency',
    name: '➖'
  },
  {
    description: 'Adding a dependency',
    name: '➕'
  },
  {
    description: 'Docker',
    name: '🐳'
  },
  {
    description: 'Configuration files',
    name: '🔧'
  },
  {
    description: 'Package.json in JS',
    name: '📦'
  },
  {
    description: 'Merging branches',
    name: '🔀'
  },
  {
    description: 'Bad code / need improv.',
    name: '💩'
  },
  {
    description: 'Reverting changes',
    name: '⏪'
  },
  {
    description: 'Breaking changes',
    name: '💥'
  },

  {
    description: 'Code review changes',
    name: '👌'
  },

  {
    description: 'Accessibility',
    name: '♿'
  },
  {
    description: 'Move/rename repository',
    name: '🚚'
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
  sortAreas: (a, b) => a.name.localeCompare(b.name)
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
