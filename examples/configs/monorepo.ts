/**
 * Monorepo Configuration
 *
 * For monorepos with multiple packages.
 * Enforces package-based scopes and cross-package awareness.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',

  // Map packages to scopes
  scopeMap: {
    'packages/core/**': 'core',
    'packages/cli/**': 'cli',
    'packages/web/**': 'web',
    'packages/mobile/**': 'mobile',
    'packages/api/**': 'api',
    'packages/shared/**': 'shared',
    'packages/utils/**': 'utils',
    'apps/admin/**': 'admin',
    'apps/customer/**': 'customer',
    'tools/**': 'tools',
    'docs/**': 'docs',
  },

  github: {
    enabled: true,
    scopeLabelPatterns: [
      'pkg:',      // pkg:core, pkg:cli
      'package:',  // package:web
      'app:',      // app:admin
    ],
  },

  validation: {
    enabled: true,
    maxHeaderLength: 72,
    maxBodyLineLength: 100,
    requireScope: true, // Always require package scope

    // Strict package scope enforcement
    allowedScopes: [
      'core',
      'cli',
      'web',
      'mobile',
      'api',
      'shared',
      'utils',
      'admin',
      'customer',
      'tools',
      'docs',
      'deps', // For dependency updates
      'release', // For release commits
    ],

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

    noTrailingPeriod: true,
    noLeadingCapital: false,

    customRules: [
      // No root-level commits without scope
      {
        name: 'require-package-scope',
        pattern: '^\\w+\\([^)]+\\):',
        message: 'Monorepo commits must specify a package scope',
        level: 'error',
        invert: false,
      },
      // Warn on cross-package changes
      {
        name: 'single-package',
        pattern: '',
        message: 'Consider splitting cross-package changes into separate commits',
        level: 'warning',
        invert: false,
      },
    ],
  },
})
