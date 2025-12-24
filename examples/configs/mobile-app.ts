/**
 * Mobile App Configuration
 *
 * For iOS/Android mobile app development.
 * Platform-specific scopes and release tracking.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
  preset: 'conventional',

  scopeMap: {
    // iOS
    'ios/**': 'ios',
    'ios/App/**': 'ios',
    '**/*.swift': 'ios',
    'Podfile': 'ios-deps',

    // Android
    'android/**': 'android',
    '**/*.kt': 'android',
    '**/*.java': 'android',
    'build.gradle': 'android-deps',

    // Shared
    'src/**': 'shared',
    'lib/**': 'shared',
    'assets/**': 'assets',
    'config/**': 'config',

    // Platform-specific features
    'src/native/ios/**': 'ios-native',
    'src/native/android/**': 'android-native',
  },

  github: {
    enabled: true,
    scopeLabelPatterns: ['platform:', 'feature:'],
  },

  validation: {
    enabled: true,
    maxHeaderLength: 72,
    maxBodyLineLength: 100,
    requireScope: true,

    allowedScopes: [
      // Platforms
      'ios',
      'android',
      'shared',

      // Features
      'auth',
      'ui',
      'api',
      'navigation',
      'storage',
      'notifications',
      'analytics',
      'payments',

      // Dependencies
      'ios-deps',
      'android-deps',
      'deps',

      // Other
      'assets',
      'config',
      'release',
    ],

    customRules: [
      // Track app store releases
      {
        name: 'ios-release',
        pattern: '^chore\\(ios\\): release v\\d+\\.\\d+\\.\\d+ \\(\\d+\\)',
        message: 'iOS releases: chore(ios): release v1.2.3 (42)',
        level: 'warning',
        invert: false,
      },
      {
        name: 'android-release',
        pattern: '^chore\\(android\\): release v\\d+\\.\\d+\\.\\d+ \\(\\d+\\)',
        message: 'Android releases: chore(android): release v1.2.3 (42)',
        level: 'warning',
        invert: false,
      },
      // Warn on platform-specific breaking changes
      {
        name: 'platform-breaking-change',
        pattern: '^feat\\((ios|android)\\)!:',
        message: 'Platform-specific breaking changes may affect users',
        level: 'warning',
        invert: false,
      },
      // Native module changes
      {
        name: 'native-module',
        pattern: '(ios-native|android-native)',
        message: 'Native module changes require testing on device',
        level: 'warning',
        invert: false,
      },
    ],
  },
})
