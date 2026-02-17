import { describe, expect, test } from 'bun:test'
import {
	type CoAuthor,
	formatCoAuthor,
	formatCoAuthors,
	getCoAuthorsFromConfig,
	parseCoAuthor,
} from '../../src'

describe('Co-author Service', () => {
	describe('parseCoAuthor', () => {
		test('should parse name and email', () => {
			const result = parseCoAuthor('Alice Smith <alice@example.com>')
			expect(result?.name).toBe('Alice Smith')
			expect(result?.email).toBe('alice@example.com')
			expect(result?.source).toBe('manual')
		})

		test('should handle various formats', () => {
			const result = parseCoAuthor('Bob<bob@example.com>')
			expect(result?.name).toBe('Bob')
			expect(result?.email).toBe('bob@example.com')
		})

		test('should handle extra whitespace around name', () => {
			const result = parseCoAuthor('  Alice Smith  <alice@example.com>')
			expect(result?.name).toBe('Alice Smith')
			expect(result?.email).toBe('alice@example.com')
		})

		test('should return null for invalid format', () => {
			const result = parseCoAuthor('invalid')
			expect(result).toBeNull()
		})

		test('should return null for missing email', () => {
			const result = parseCoAuthor('Alice Smith')
			expect(result).toBeNull()
		})

		test('should return null for empty string', () => {
			const result = parseCoAuthor('')
			expect(result).toBeNull()
		})
	})

	describe('formatCoAuthor', () => {
		test('should format co-author line', () => {
			const coauthor: CoAuthor = {
				name: 'Alice Smith',
				email: 'alice@example.com',
				source: 'manual',
			}
			const result = formatCoAuthor(coauthor)
			expect(result).toBe('Co-authored-by: Alice Smith <alice@example.com>')
		})

		test('should format co-author with alias', () => {
			const coauthor: CoAuthor = {
				name: 'Bob Jones',
				email: 'bob@example.com',
				alias: 'bob',
				source: 'config',
			}
			const result = formatCoAuthor(coauthor)
			expect(result).toBe('Co-authored-by: Bob Jones <bob@example.com>')
		})

		test('should handle different sources', () => {
			const githubAuthor: CoAuthor = {
				name: 'GitHub User',
				email: 'user@github.com',
				source: 'github',
			}
			const result = formatCoAuthor(githubAuthor)
			expect(result).toBe('Co-authored-by: GitHub User <user@github.com>')
		})
	})

	describe('formatCoAuthors', () => {
		test('should format multiple co-authors', () => {
			const coauthors: CoAuthor[] = [
				{ name: 'Alice Smith', email: 'alice@example.com', source: 'manual' },
				{ name: 'Bob Jones', email: 'bob@example.com', source: 'manual' },
			]
			const result = formatCoAuthors(coauthors)
			expect(result).toContain(
				'Co-authored-by: Alice Smith <alice@example.com>',
			)
			expect(result).toContain('Co-authored-by: Bob Jones <bob@example.com>')
			expect(result.split('\n')).toHaveLength(2)
		})

		test('should format single co-author', () => {
			const coauthors: CoAuthor[] = [
				{ name: 'Alice Smith', email: 'alice@example.com', source: 'manual' },
			]
			const result = formatCoAuthors(coauthors)
			expect(result).toBe('Co-authored-by: Alice Smith <alice@example.com>')
		})

		test('should return empty string for empty array', () => {
			const result = formatCoAuthors([])
			expect(result).toBe('')
		})

		test('should preserve order', () => {
			const coauthors: CoAuthor[] = [
				{ name: 'Alice', email: 'alice@example.com', source: 'manual' },
				{ name: 'Bob', email: 'bob@example.com', source: 'manual' },
				{ name: 'Charlie', email: 'charlie@example.com', source: 'manual' },
			]
			const result = formatCoAuthors(coauthors)
			const lines = result.split('\n')
			expect(lines[0]).toContain('Alice')
			expect(lines[1]).toContain('Bob')
			expect(lines[2]).toContain('Charlie')
		})
	})

	describe('getCoAuthorsFromConfig', () => {
		test('should return co-authors from config', () => {
			const aliases = {
				alice: 'Alice Smith <alice@example.com>',
				bob: 'Bob Jones <bob@example.com>',
			}
			const authors = getCoAuthorsFromConfig(aliases)
			expect(authors).toHaveLength(2)
			expect(authors.some((a) => a.name === 'Alice Smith')).toBe(true)
			expect(authors.some((a) => a.name === 'Bob Jones')).toBe(true)
		})

		test('should include alias in result', () => {
			const aliases = {
				alice: 'Alice Smith <alice@example.com>',
			}
			const authors = getCoAuthorsFromConfig(aliases)
			expect(authors[0]?.alias).toBe('alice')
		})

		test('should set source to config', () => {
			const aliases = {
				alice: 'Alice Smith <alice@example.com>',
			}
			const authors = getCoAuthorsFromConfig(aliases)
			expect(authors[0]?.source).toBe('config')
		})

		test('should filter out invalid entries', () => {
			const aliases = {
				alice: 'Alice Smith <alice@example.com>',
				invalid: 'not a valid format',
				bob: 'Bob Jones <bob@example.com>',
			}
			const authors = getCoAuthorsFromConfig(aliases)
			expect(authors).toHaveLength(2)
			expect(authors.some((a) => a.name === 'Alice Smith')).toBe(true)
			expect(authors.some((a) => a.name === 'Bob Jones')).toBe(true)
		})

		test('should return empty array for undefined', () => {
			const authors = getCoAuthorsFromConfig(undefined)
			expect(authors).toEqual([])
		})

		test('should return empty array for empty object', () => {
			const authors = getCoAuthorsFromConfig({})
			expect(authors).toEqual([])
		})
	})
})
