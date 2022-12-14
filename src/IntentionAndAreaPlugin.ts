import {
  Commit,
  CommitItOptions,
  CommitItPlugin,
  EnquirerInterface,
  PluginOptions
} from './types'

export interface IntentionAndAreaPluginOptions extends PluginOptions {
  areas?: {
    description?: string
    text: string
  }[]
  areasRequired?: boolean
  askForShortDescription?: boolean
  commitBodyRequired?: boolean
  formatBody?: ({
    shortDescription,
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
    shortDescription: string
  }) => string
  formatTitle?: ({
    shortDescription,
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
    shortDescription: string
    titleText: string
  }) => string
  intentions?: {
    description?: string
    text: string
  }[]
  multipleAreas?: boolean
  multipleIntentions?: boolean
  sortAreas?: (a: { description; text }, b: { description; text }) => number
  sortIntentions?: (
    a: { description; text },
    b: { description; text }
  ) => number
  titleSeparator?: string
}

export class IntentionAndAreaPlugin extends CommitItPlugin {
  private readonly options: IntentionAndAreaPluginOptions
  constructor(
    options?: IntentionAndAreaPluginOptions,
    enquirer?: EnquirerInterface
  ) {
    super(
      {
        pluginId: 'IntentionAndAreaPlugin',
        ...options
      },
      enquirer
    )
    this.options = {
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
    let allIntentions = commit.data.intentions
      .filter((x) => x?.text)
      .map((x) => ({
        ...x,
        choice: `${x.text || ''} ${x.description || ''}`.trim()
      }))

    if (this.options.sortIntentions) {
      allIntentions = allIntentions.sort(this.options.sortIntentions)
    }

    let allAreas =
      commit.data.areas
        ?.filter((x) => x?.text)
        .map((x) => ({
          ...x,
          choice: `${x.text || ''} ${x.description || ''}`.trim()
        })) || []

    if (this.options.sortAreas) {
      allAreas = allAreas.sort(this.options.sortAreas)
    }

    const intentions = (
      await this.enquirer.prompt({
        name: 'selectedIntention',
        type: 'autocomplete',
        message: 'Intention:',
        multiple: true,
        choices: allIntentions.map((x) => x.choice)
      })
    ).selectedIntention
      .map((x) => allIntentions.find((y) => y.choice === x))
      .sort((a, b) => a.description.localeCompare(b.description))

    const noIntentions = !intentions || intentions.length === 0

    if (noIntentions) {
      throw new Error('No intention selected')
    }

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

    const noAreasSelected = !areas || !areas?.length

    if (this.options.areasRequired && noAreasSelected) {
      throw new Error('At least one area is required')
    }

    let shortDescription

    if (
      (noAreasSelected && this.options.askForShortDescription !== false) ||
      this.options.askForShortDescription
    ) {
      shortDescription = (
        await this.enquirer.prompt({
          type: 'input',
          name: 'shortDescription',
          message: 'Short description:'
        })
      )?.shortDescription

      if (shortDescription) {
        areas = [{ text: shortDescription }]
      }
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
      (areas
        ? `${this.options.titleSeparator} ${areas
            .map((x) => x.text)
            .join(', ')}`.trim()
        : `${this.options.titleSeparator} ${commitBody}`
      ).trim()

    const formattedTitleText = this.options.formatTitle
      ? this.options.formatTitle({
          shortDescription,
          titleText,
          commitBody,
          areas,
          intentions
        })
      : titleText

    commit.title = [
      ...(commit.title || []),
      {
        pluginId: this.pluginId,
        pluginAction: this.pluginAction,
        text: formattedTitleText
      }
    ]

    const bodyText = [
      commitBody || '',
      intentions?.length > 0 && '**Intentions:**',
      intentions?.map((x) => `- ${x.choice}`).join('\n') || '',
      areas?.length > 0 && '**Areas:**',
      areas?.map((x) => `- ${x.text}`).join('\n') || ''
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim()

    const formattedBodyText = this.options.formatBody
      ? this.options.formatBody({
          shortDescription,
          bodyText,
          commitBody,
          areas,
          intentions
        })
      : bodyText

    commit.body = [
      ...(commit.body || []),
      {
        pluginId: this.pluginId,
        pluginAction: this.pluginAction,
        text: formattedBodyText
      }
    ]

    return [options, commit]
  }
}
