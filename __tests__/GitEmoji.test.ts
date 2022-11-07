import { CommitIt, GitEmoji } from '../src'

// jest mock npm package import

describe('GitEmoji', () => {
  it('commit with intentions, areas, and a body', async () => {
    const commitIt = new CommitIt({
      dryRun: true,
      plugins: [
        new GitEmoji(
          {
            areas: [
              {
                text: 'User settings'
              },
              {
                text: 'Dashboard'
              }
            ]
          },
          {
            async prompt(questions) {
              if (questions.name === 'selectedIntention') {
                return Promise.resolve({
                  selectedIntention: ['✔️ Make a test pass', '✅ Adding a test']
                })
              }
              if (questions.name === 'selectedArea') {
                return Promise.resolve({
                  selectedArea: ['User settings', 'Dashboard']
                })
              }
              if (questions.name === 'commitBody') {
                return Promise.resolve({
                  commitBody: 'Testing for certain things'
                })
              }
            }
          }
        )
      ]
    })

    expect(await commitIt.executePlugins()).toMatchSnapshot()
  })
  it('commit body required', async () => {
    const commitIt = new CommitIt({
      dryRun: true,
      plugins: [
        new GitEmoji(
          {
            commitBodyRequired: true
          },
          {
            async prompt(questions) {
              if (questions.name === 'selectedIntention') {
                return Promise.resolve({
                  selectedIntention: ['✔️ Make a test pass', '✅ Adding a test']
                })
              }
              if (questions.name === 'commitBody') {
                return Promise.resolve({
                  commitBody: ''
                })
              }
            }
          }
        )
      ]
    })

    await expect(commitIt.executePlugins()).rejects.toMatchSnapshot()
  })
  it('areas required', async () => {
    const commitIt = new CommitIt({
      dryRun: true,
      plugins: [
        new GitEmoji(
          {
            areasRequired: true
          },
          {
            async prompt(questions) {
              if (questions.name === 'selectedIntention') {
                return Promise.resolve({
                  selectedIntention: ['✔️ Make a test pass', '✅ Adding a test']
                })
              }
              if (questions.name === 'selectedArea') {
                return Promise.resolve({
                  selectedArea: []
                })
              }
              if (questions.name === 'commitBody') {
                return Promise.resolve({
                  commitBody: 'Testing for certain things'
                })
              }
            }
          }
        )
      ]
    })

    await expect(commitIt.executePlugins()).rejects.toMatchSnapshot()
  })

  it('custom title and body formatters', async () => {
    const commitIt = new CommitIt({
      dryRun: true,
      plugins: [
        new GitEmoji(
          {
            formatTitle({ intentions }) {
              return intentions.map((x) => x.choice).join(', ')
            },
            formatBody() {
              return 'Custom body'
            },
            areas: [
              {
                text: 'User settings'
              },
              {
                text: 'Dashboard'
              }
            ]
          },
          {
            async prompt(questions) {
              if (questions.name === 'selectedIntention') {
                return Promise.resolve({
                  selectedIntention: ['✔️ Make a test pass', '✅ Adding a test']
                })
              }
              if (questions.name === 'selectedArea') {
                return Promise.resolve({
                  selectedArea: ['User settings', 'Dashboard']
                })
              }
              if (questions.name === 'commitBody') {
                return Promise.resolve({
                  commitBody: 'Testing for certain things'
                })
              }
            }
          }
        )
      ]
    })

    expect(await commitIt.executePlugins()).toMatchSnapshot()
  })
})
