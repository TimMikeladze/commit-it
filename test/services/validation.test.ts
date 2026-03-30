import { describe, expect, test } from 'bun:test'
import {
	parseCommitMessage,
	validateCommitMessage,
} from '../../src/services/validation'
import { createTestConfig } from '../helpers/testUtils'

describe('Validation Service', () => {
	describe('parseCommitMessage', () => {
		test('should parse conventional commit', () => {
			const result = parseCommitMessage('feat(cli): add new command')
			expect(result.type).toBe('feat')
			expect(result.scope).toBe('cli')
			expect(result.subject).toBe('add new command')
			expect(result.isBreaking).toBe(false)
		})

		test('should parse breaking change with !', () => {
			const result = parseCommitMessage('feat(api)!: redesign auth')
			expect(result.type).toBe('feat')
			expect(result.scope).toBe('api')
			expect(result.isBreaking).toBe(true)
		})

		test('should parse commit without scope', () => {
			const result = parseCommitMessage('docs: update README')
			expect(result.type).toBe('docs')
			expect(result.scope).toBeUndefined()
			expect(result.subject).toBe('update README')
		})

		test('should parse multi-line commit', () => {
			const msg =
				'feat(cli): add command\n\nThis is the body\n\nBREAKING CHANGE: breaks stuff'
			const result = parseCommitMessage(msg)
			expect(result.body).toBe('This is the body')
			expect(result.isBreaking).toBe(true)
		})

		test('should extract issue numbers from footer', () => {
			const msg = 'fix(api): resolve bug\n\nFixes #123\nRef #456'
			const result = parseCommitMessage(msg)
			expect(result.issues).toContain(123)
			expect(result.issues).toContain(456)
		})

		test('should parse header correctly', () => {
			const result = parseCommitMessage('chore: update dependencies')
			expect(result.header).toBe('chore: update dependencies')
			expect(result.type).toBe('chore')
		})

		test('should handle commit with body and footer', () => {
			const msg = 'feat(auth): add login\n\nImplement OAuth2 flow\n\nCloses #42'
			const result = parseCommitMessage(msg)
			expect(result.body).toBe('Implement OAuth2 flow')
			expect(result.footer).toBe('Closes #42')
		})

		test('should handle multiple footer lines', () => {
			const msg =
				'feat: new feature\n\nBody text\n\nBREAKING CHANGE: API changed\nCloses #1'
			const result = parseCommitMessage(msg)
			expect(result.isBreaking).toBe(true)
			expect(result.footer).toContain('BREAKING CHANGE')
			expect(result.footer).toContain('Closes #1')
		})
	})

	describe('validateCommitMessage', () => {
		test('should validate correct commit', () => {
			const config = createTestConfig()
			const result = validateCommitMessage(
				'feat(cli): add command',
				config.validation,
			)
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		test('should reject invalid type', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					allowedTypes: ['feat', 'fix', 'docs'],
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'invalid(cli): test',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
			expect(result.errors.some((e) => e.rule === 'type-enum')).toBe(true)
		})

		test('should enforce maxHeaderLength', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 20,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'feat(cli): this is way too long',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'header-max-length')).toBe(
				true,
			)
		})

		test('should enforce requireScope', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: true,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'feat: no scope here',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'scope-required')).toBe(true)
		})

		test('should enforce custom rules', () => {
			const config = createTestConfig({
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
						{
							name: 'no-wip',
							pattern: '\\bWIP\\b',
							message: 'No WIP commits',
							level: 'error',
							invert: true,
						},
					],
				},
			})
			const result = validateCommitMessage('feat: WIP test', config.validation)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'no-wip')).toBe(true)
		})

		test('should enforce requireBody', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: true,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'feat(cli): add command',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'body-required')).toBe(true)
		})

		test('should enforce requireIssue', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: true,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'feat(cli): add command',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'issue-required')).toBe(true)
		})

		test('should enforce noTrailingPeriod', () => {
			const config = createTestConfig()
			const result = validateCommitMessage(
				'feat(cli): add command.',
				config.validation,
			)
			expect(result.valid).toBe(true) // Still valid, but has warnings
			expect(
				result.warnings.some((e) => e.rule === 'subject-no-trailing-period'),
			).toBe(true)
		})

		test('should enforce noLeadingCapital', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: true,
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'feat(cli): Add command',
				config.validation,
			)
			expect(result.valid).toBe(true) // Still valid, but has warnings
			expect(
				result.warnings.some((e) => e.rule === 'subject-no-leading-capital'),
			).toBe(true)
		})

		test('should require blank line after header', () => {
			const config = createTestConfig()
			const msg = 'feat(cli): add command\nThis should be blank'
			const result = validateCommitMessage(msg, config.validation)
			expect(result.valid).toBe(false)
			expect(
				result.errors.some((e) => e.rule === 'blank-line-after-header'),
			).toBe(true)
		})

		test('should validate allowed scopes', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					allowedScopes: ['cli', 'api', 'core'],
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'feat(invalid): test',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'scope-enum')).toBe(true)
		})

		test('should check conventional format when allowedTypes configured', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					allowedTypes: ['feat', 'fix'],
					customRules: [],
				},
			})
			const result = validateCommitMessage(
				'not a conventional commit',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'conventional-format')).toBe(
				true,
			)
		})

		test('should not enforce conventional format without allowedTypes', () => {
			const config = createTestConfig()
			const result = validateCommitMessage(
				'✨ add new feature',
				config.validation,
			)
			expect(
				result.errors.some((e) => e.rule === 'conventional-format'),
			).toBe(false)
		})

		test('should warn on body line length', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 20,
					requireScope: false,
					requireBody: false,
					requireIssue: false,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					customRules: [],
				},
			})
			const msg =
				'feat: test\n\nThis is a very long body line that exceeds the limit'
			const result = validateCommitMessage(msg, config.validation)
			expect(result.valid).toBe(true) // Body length is a warning, not error
			expect(
				result.warnings.some((e) => e.rule === 'body-max-line-length'),
			).toBe(true)
		})

		test('should handle custom rule with invert false', () => {
			const config = createTestConfig({
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
						{
							name: 'must-have-ticket',
							pattern: '#\\d+',
							message: 'Must reference a ticket',
							level: 'error',
							invert: false,
						},
					],
				},
			})
			const result = validateCommitMessage(
				'feat: test without ticket',
				config.validation,
			)
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.rule === 'must-have-ticket')).toBe(
				true,
			)
		})

		test('should pass with valid issue reference', () => {
			const config = createTestConfig({
				validation: {
					enabled: true,
					maxHeaderLength: 72,
					maxBodyLineLength: 100,
					requireScope: false,
					requireBody: false,
					requireIssue: true,
					noTrailingPeriod: true,
					noLeadingCapital: false,
					customRules: [],
				},
			})
			const msg = 'feat(cli): add command\n\nCloses #123'
			const result = validateCommitMessage(msg, config.validation)
			expect(result.valid).toBe(true)
		})

		test('should handle invalid regex in custom rule', () => {
			const config = createTestConfig({
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
						{
							name: 'bad-regex',
							pattern: '[invalid(regex',
							message: 'Invalid pattern',
							level: 'error',
							invert: false,
						},
					],
				},
			})
			const result = validateCommitMessage('feat: test', config.validation)
			expect(result.warnings.some((e) => e.rule === 'custom-rule-error')).toBe(
				true,
			)
		})
	})
})
