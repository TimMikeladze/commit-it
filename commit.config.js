import { GitEmoji } from './dist/index.modern.js'

export default {
  plugins: [
    new GitEmoji({
      areas: [
        {
          text: 'CLI commands'
        },
        {
          text: 'Plugins'
        }
      ]
    })
  ]
}
