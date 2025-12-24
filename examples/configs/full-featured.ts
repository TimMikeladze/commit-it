/**
 * Full-Featured Configuration
 *
 * Demonstrates all available options.
 * Use this as a reference for what's possible.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',

  // Custom template (overrides preset)
  // template: '{type}({scope}): {message}',

  // How multiple scopes are handled
  scopeMode: 'single', // 'single' | 'multi-inline' | 'multi-body'

  // Default values for prompts
  defaults: {
    scope: '',
    includeBody: true,
  },

  // Map file paths to scope suggestions
  scopeMap: {
    'src/cli/**': 'cli',
    'src/commands/**': 'cli',
    'src/services/**': 'services',
    'src/prompts/**': 'prompts',
    'src/config/**': 'config',
    'src/utils/**': 'utils',
    'src/presets/**': 'presets',
    'tests/**': 'test',
    'docs/**': 'docs',
    '*.md': 'docs',
  },

  // Co-author aliases for easy attribution
  coauthors: {
    alice: 'Alice Smith <alice@example.com>',
    bob: 'Bob Jones <bob@example.com>',
    charlie: 'Charlie Wilson <charlie@example.com>',
  },

  // AI-powered commit message generation
  ai: {
    enabled: true,
    provider: 'auto', // 'openai' | 'anthropic' | 'auto'
    model: 'gpt-4o-mini', // or 'claude-sonnet-4-20250514'
  },

  // GitHub integration via gh CLI
  github: {
    enabled: true,
    scopeLabelPatterns: [
      'scope:',
      'scope/',
      'area:',
      'area/',
      'component:',
      'component/',
      'module:',
      'module/',
    ],
    auto: {
      detectIssues: true,
      suggestReviewers: false,
    },
  },

  // Validation rules
  validation: {
    enabled: true,
    maxHeaderLength: 72,
    maxBodyLineLength: 100,
    requireScope: false,
    requireBody: false,
    requireIssue: false,
    allowedTypes: [
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'perf',
      'test',
      'chore',
    ],
    allowedScopes: undefined, // undefined = allow any scope
    noTrailingPeriod: true,
    noLeadingCapital: false,
    customRules: [
      {
        name: 'no-wip',
        pattern: '\\bWIP\\b',
        message: 'Remove WIP before committing',
        level: 'error',
        invert: true,
      },
      {
        name: 'no-temp',
        pattern: '\\b(temp|tmp|temporary)\\b',
        message: 'Remove temporary markers',
        level: 'warning',
        invert: true,
      },
    ],
  },

  // Plugin extensions (future feature)
  plugins: [],
})
