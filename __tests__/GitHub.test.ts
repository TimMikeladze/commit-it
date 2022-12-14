import { CommitIt, GitHub } from '../src'

describe('GitHub', () => {
  it('gets labels from Github and uses them as areas', async () => {
    const commitIt = new CommitIt({
      dryRun: true,
      plugins: [
        new GitHub({
          pluginAction: 'load',
          owner: 'TimMikeladze',
          repo: 'commit-it',
          auth: process.env.GITHUB_TOKEN
        })
      ]
    })

    const areas = (await commitIt.execute()).commit.data.areas

    expect(areas.find((area) => area.name === 'bug')).toBeDefined()
  })
})
