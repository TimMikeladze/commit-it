import { describe, expect, test } from 'bun:test'
import { validateCommitMessage } from '../../src'
import { createTestConfig } from '../helpers/testUtils'

describe('README Examples - Custom Validation Rules', () => {
	test('should enforce no-wip rule', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				customRules: [
					{
						name: 'no-wip',
						pattern: '\\bWIP\\b',
						message: 'Commit messages should not contain WIP',
						level: 'error',
						invert: true,
					},
				],
			},
		})

		const invalidResult = validateCommitMessage(
			'feat(cli): WIP add command',
			config.validation,
		)
		expect(invalidResult.valid).toBe(false)
		expect(invalidResult.errors.some((e) => e.rule === 'no-wip')).toBe(true)

		const validResult = validateCommitMessage(
			'feat(cli): add command',
			config.validation,
		)
		expect(validResult.valid).toBe(true)
	})

	test('should require ticket reference', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				customRules: [
					{
						name: 'require-ticket',
						pattern: 'JIRA-\\d+',
						message: 'Must reference a JIRA ticket',
						level: 'error',
						invert: false,
					},
				],
			},
		})

		const validResult = validateCommitMessage(
			'feat(cli): add command\n\nJIRA-123',
			config.validation,
		)
		expect(validResult.valid).toBe(true)

		const invalidResult = validateCommitMessage(
			'feat(cli): add command',
			config.validation,
		)
		expect(invalidResult.valid).toBe(false)
		expect(invalidResult.errors.some((e) => e.rule === 'require-ticket')).toBe(
			true,
		)
	})

	test('should warn about fixup commits', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				customRules: [
					{
						name: 'no-fixup',
						pattern: '^fixup!',
						message: 'Squash fixup commits before merging',
						level: 'warning',
						invert: true,
					},
				],
			},
		})

		const result = validateCommitMessage(
			'fixup! feat(cli): add',
			config.validation,
		)
		expect(result.warnings.some((w) => w.rule === 'no-fixup')).toBe(true)
	})

	test('should require DCO sign-off', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				customRules: [
					{
						name: 'require-signoff',
						pattern: 'Signed-off-by: .+ <.+>',
						message: 'DCO sign-off required. Use: git commit -s',
						level: 'error',
						invert: false,
					},
				],
			},
		})

		const validResult = validateCommitMessage(
			'feat(cli): add command\n\nSigned-off-by: Alice <alice@example.com>',
			config.validation,
		)
		expect(validResult.valid).toBe(true)

		const invalidResult = validateCommitMessage(
			'feat(cli): add command',
			config.validation,
		)
		expect(invalidResult.valid).toBe(false)
		expect(invalidResult.errors.some((e) => e.rule === 'require-signoff')).toBe(
			true,
		)
	})

	test('should require issue reference with warning', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				customRules: [
					{
						name: 'require-issue',
						pattern: '(#\\d+|fixes #\\d+|closes #\\d+)',
						message: 'Reference a GitHub issue',
						level: 'warning',
						invert: false,
					},
				],
			},
		})

		const validResult = validateCommitMessage(
			'feat(cli): add command\n\nCloses #42',
			config.validation,
		)
		expect(validResult.warnings).toHaveLength(0)

		const warningResult = validateCommitMessage(
			'feat(cli): add command',
			config.validation,
		)
		expect(warningResult.warnings.some((w) => w.rule === 'require-issue')).toBe(
			true,
		)
	})

	test('should enforce JIRA ticket format', () => {
		const config = createTestConfig({
			validation: {
				enabled: true,
				customRules: [
					{
						name: 'jira-ticket',
						pattern: '[A-Z]+-\\d+',
						message: 'Must include JIRA ticket (e.g., PROJ-123)',
						level: 'error',
						invert: false,
					},
				],
			},
		})

		const validResult = validateCommitMessage(
			'feat(cli): add command PROJ-456',
			config.validation,
		)
		expect(validResult.valid).toBe(true)

		const invalidResult = validateCommitMessage(
			'feat(cli): add command',
			config.validation,
		)
		expect(invalidResult.valid).toBe(false)
	})
})
