/**
 * Security-Focused Configuration
 *
 * For security-conscious teams.
 * Blocks sensitive data and enforces security practices.
 */
import { defineConfig } from 'commit-it'

export default defineConfig({
	preset: 'conventional',

	scopeMap: {
		'src/auth/**': 'auth',
		'src/security/**': 'security',
		'src/api/**': 'api',
		'src/crypto/**': 'crypto',
		'src/**': 'core',
	},

	github: {
		enabled: true,
		scopeLabelPatterns: ['security:', 'cve:'],
	},

	validation: {
		enabled: true,
		maxHeaderLength: 72,
		maxBodyLineLength: 100,
		requireScope: true,
		requireBody: false,
		requireIssue: false,
		noTrailingPeriod: true,
		noLeadingCapital: false,

		customRules: [
			// No API keys
			{
				name: 'no-api-keys',
				pattern: '\\b(api[_-]?key|apikey|api[_-]?secret)\\b',
				message: 'Possible API key in commit message',
				level: 'error',
				invert: true,
			},
			// No passwords
			{
				name: 'no-passwords',
				pattern: '\\b(password|passwd|pwd)\\s*[:=]',
				message: 'Possible password in commit message',
				level: 'error',
				invert: true,
			},
			// No tokens
			{
				name: 'no-tokens',
				pattern: '\\b(token|bearer|jwt)\\s*[:=]\\s*["\']?[A-Za-z0-9+/=]{20,}',
				message: 'Possible token in commit message',
				level: 'error',
				invert: true,
			},
			// No private keys
			{
				name: 'no-private-keys',
				pattern: 'BEGIN (RSA |DSA |EC )?PRIVATE KEY',
				message: 'Private key detected',
				level: 'error',
				invert: true,
			},
			// Security issue reference for fixes
			{
				name: 'security-fix-reference',
				pattern: 'CVE-\\d{4}-\\d{4,}|GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}',
				message: 'Security fixes should reference CVE or GHSA',
				level: 'warning',
				invert: false,
			},
			// No hardcoded IPs
			{
				name: 'no-hardcoded-ips',
				pattern: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b',
				message: 'Avoid hardcoded IP addresses',
				level: 'warning',
				invert: true,
			},
			// Require security scope for security changes
			{
				name: 'security-scope',
				pattern: '^(fix|feat)\\((security|auth|crypto)\\):',
				message:
					'Security-related changes should use security/auth/crypto scope',
				level: 'warning',
				invert: false,
			},
		],
	},
})
