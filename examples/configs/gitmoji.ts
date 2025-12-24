/**
 * Gitmoji Configuration
 *
 * For teams that love emojis in their commits.
 * Uses the gitmoji preset with enhanced emoji support.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'gitmoji',

  // Custom template with emoji
  template: '{emoji} {message}',

  scopeMap: {
    'src/**': 'core',
    'docs/**': 'docs',
    'tests/**': 'test',
    'scripts/**': 'scripts',
    '.github/**': 'ci',
  },

  github: {
    enabled: true,
    scopeLabelPatterns: ['scope:', 'area:'],
  },

  validation: {
    enabled: true,
    maxHeaderLength: 72,
    maxBodyLineLength: 100,
    requireScope: false,
    requireBody: false,
    requireIssue: false,
    noTrailingPeriod: true,
    noLeadingCapital: false,

    customRules: [
      // Must start with emoji
      {
        name: 'require-emoji',
        pattern: '^(✨|🐛|📚|💅|♻️|⚡|✅|🔧|🚀)',
        message: 'Commit must start with a gitmoji',
        level: 'error',
        invert: false,
      },
      // No duplicate emojis
      {
        name: 'no-duplicate-emoji',
        pattern: '^(.).*\\1',
        message: 'Do not use duplicate emojis',
        level: 'warning',
        invert: true,
      },
    ],
  },
})
