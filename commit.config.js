import { GitEmoji } from './dist/index.modern.js'

export default {
  plugins: [
    new GitEmoji({
      areas: [
        {
          text: 'CLI'
        },
        {
          text: 'Plugins - Core'
        },
        {
          text: 'Plugins - GitEmoji'
        },
        {
          text: 'Plugins - IntentionsAndArea'
        },
        {
          text: 'Plugins - GitHub'
        }
      ]
    })
  ]
}
