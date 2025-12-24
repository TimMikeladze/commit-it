/**
 * Strict Validation Configuration
 *
 * For teams that want maximum enforcement:
 * - Required fields
 * - Strict formatting
 * - Comprehensive rules
 * - No exceptions
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',

  scopeMap: {
    'src/**': 'core',
    'docs/**': 'docs',
    'tests/**': 'test',
  },

  validation: {
    enabled: true,
    maxHeaderLength: 50, // Short and sweet
    maxBodyLineLength: 72, // Classic Git standard
    requireScope: true,
    requireBody: true,
    requireIssue: true,

    allowedTypes: [
      'feat',
      'fix',
      'docs',
      'refactor',
      'test',
    ],

    allowedScopes: [
      'core',
      'api',
      'ui',
      'db',
      'auth',
      'docs',
      'test',
      'deps',
    ],

    noTrailingPeriod: true,
    noLeadingCapital: true, // Force lowercase

    customRules: [
      // Must reference issue
      {
        name: 'require-issue',
        pattern: '#\\d+',
        message: 'Must reference issue number (e.g., #123)',
        level: 'error',
        invert: false,
      },
      // Imperative mood
      {
        name: 'imperative-mood',
        pattern: '^\\w+\\([^)]*\\): (add|fix|update|remove|refactor|improve|implement)',
        message: 'Use imperative mood: "add" not "adds" or "added"',
        level: 'error',
        invert: false,
      },
      // No past tense
      {
        name: 'no-past-tense',
        pattern: '(added|fixed|updated|removed|changed|implemented)',
        message: 'Use present tense: "add" not "added"',
        level: 'error',
        invert: true,
      },
      // No WIP
      {
        name: 'no-wip',
        pattern: '\\b(WIP|wip|work in progress)\\b',
        message: 'WIP commits not allowed',
        level: 'error',
        invert: true,
      },
      // No merge commits
      {
        name: 'no-merge',
        pattern: '^Merge',
        message: 'Merge commits not allowed',
        level: 'error',
        invert: true,
      },
      // No fixup commits
      {
        name: 'no-fixup',
        pattern: '^fixup!',
        message: 'Squash fixup commits before pushing',
        level: 'error',
        invert: true,
      },
      // Minimum subject length
      {
        name: 'min-subject-length',
        pattern: '^\\w+\\([^)]*\\): .{10,}',
        message: 'Subject must be at least 10 characters',
        level: 'error',
        invert: false,
      },
      // Maximum subject length (stricter)
      {
        name: 'max-subject-length',
        pattern: '^.{0,50}$',
        message: 'Subject must not exceed 50 characters',
        level: 'error',
        invert: false,
      },
    ],
  },
})
