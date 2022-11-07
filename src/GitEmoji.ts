import {
  Commit,
  CommitItOptions,
  CommitItPlugin,
  EnquirerInterface
} from './types'

export interface GitEmojiOptions {
  areas?: {
    description?: string
    text: string
  }[]
  areasRequired?: boolean
  commitBodyRequired?: boolean
  formatBody?: ({
    bodyText,
    commitBody,
    areas,
    intentions
  }: {
    areas: { choice: string; description?: string; text: string }[]
    bodyText: string
    commitBody: string
    intentions: {
      choice: string
      description?: string
      text: string
    }[]
  }) => string
  formatTitle?: ({
    titleText,
    commitBody,
    areas,
    intentions
  }: {
    areas: { choice: string; description?: string; text: string }[]
    commitBody: string
    intentions: {
      choice: string
      description?: string
      text: string
    }[]
    titleText: string
  }) => string
  intentions?: {
    description?: string
    text: string
  }[]
  multipleAreas?: boolean
  multipleIntentions?: boolean
}

export const gitEmojiDefaultOptions: GitEmojiOptions = {
  multipleIntentions: true,
  multipleAreas: true,
  commitBodyRequired: true,
  areasRequired: false,
  intentions: [
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
}

export interface PromptOptions {
  [key: string]: any
  name: string
}

export class GitEmoji extends CommitItPlugin {
  private readonly options: GitEmojiOptions
  constructor(options?: GitEmojiOptions, enquirer?: EnquirerInterface) {
    super('GitEmoji', enquirer)
    this.options = {
      ...gitEmojiDefaultOptions,
      ...options
    }
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
      ...(this.options.areas || [])
    ].filter(Boolean)
    return [config, commit]
  }

  public async run(options, commit: Commit): Promise<[any, any]> {
    const allIntentions = commit.data.intentions
      .filter((x) => x?.text)
      .map((x) => ({
        ...x,
        choice: `${x.text || ''} ${x.description || ''}`.trim()
      }))

    const allAreas =
      commit.data.areas
        ?.filter((x) => x?.text)
        .map((x) => ({
          ...x,
          choice: `${x.text || ''} ${x.description || ''}`.trim()
        })) || []

    const intentions = (
      await this.enquirer.prompt({
        name: 'selectedIntention',
        type: 'autocomplete',
        message: 'Intention:',
        multiple: true,
        choices: allIntentions.map((x) => x.choice)
      })
    ).selectedIntention.map((x) => allIntentions.find((y) => y.choice === x))

    let areas
    if (allAreas.length) {
      areas = (
        await this.enquirer.prompt({
          name: 'selectedArea',
          type: 'autocomplete',
          message: 'Area:',
          multiple: true,
          choices: allAreas.map((x) => x.choice)
        })
      ).selectedArea
        ?.map((x) => allAreas.find((y) => y.choice === x))
        .sort((a, b) => a.text.localeCompare(b.text))
    }
    if (this.options.areasRequired && (!areas || !areas?.length)) {
      throw new Error('At least one area is required')
    }

    const {
      commitBody
    }: {
      commitBody: string
    } = await this.enquirer.prompt({
      type: 'input',
      name: 'commitBody',
      message: 'Message:'
    })

    if (this.options.commitBodyRequired && !commitBody?.trim()) {
      throw new Error('Commit body is required')
    }

    const titleText =
      intentions.map((x) => x.text).join(' ') +
      ' ' +
      (areas ? `| ${areas.map((x) => x.text).join(', ')}` : '')

    const formattedTitleText = this.options.formatTitle
      ? this.options.formatTitle({
          titleText,
          commitBody,
          areas,
          intentions
        })
      : titleText

    commit.title = [
      ...(commit.title || []),
      { plugin: this.name, text: formattedTitleText }
    ]

    const bodyText = [
      intentions.map((x) => x.choice).join(', '),
      areas?.map((x) => `- ${x.text}`).join('\n') || '',
      commitBody || ''
    ]
      .join('\n\n')
      .trim()

    const formattedBodyText = this.options.formatBody
      ? this.options.formatBody({
          bodyText,
          commitBody,
          areas,
          intentions
        })
      : bodyText

    commit.body = [
      ...(commit.body || []),
      {
        plugin: this.name,
        text: formattedBodyText
      }
    ]

    return [options, commit]
  }
}