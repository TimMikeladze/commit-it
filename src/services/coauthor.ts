import { execFileNoThrow } from '../utils/execFileNoThrow'

export interface CoAuthor {
	name: string
	email: string
	alias?: string
	source: 'config' | 'github' | 'manual'
}

/**
 * Parse a co-author string like "Name <email@example.com>"
 */
export function parseCoAuthor(value: string): CoAuthor | null {
	const match = value.match(/^(.+?)\s*<(.+)>$/)
	if (match) {
		return {
			name: match[1].trim(),
			email: match[2].trim(),
			source: 'manual',
		}
	}
	return null
}

/**
 * Format a co-author for commit message footer
 */
export function formatCoAuthor(coauthor: CoAuthor): string {
	return `Co-authored-by: ${coauthor.name} <${coauthor.email}>`
}

/**
 * Format multiple co-authors for commit message
 */
export function formatCoAuthors(coauthors: CoAuthor[]): string {
	return coauthors.map(formatCoAuthor).join('\n')
}

/**
 * Get co-authors from config aliases
 */
export function getCoAuthorsFromConfig(
	aliases: Record<string, string> | undefined,
): CoAuthor[] {
	if (!aliases) return []

	return Object.entries(aliases)
		.map(([alias, value]) => {
			const parsed = parseCoAuthor(value)
			if (parsed) {
				return { ...parsed, alias, source: 'config' as const }
			}
			return null
		})
		.filter((c): c is CoAuthor => c !== null)
}

/**
 * Get GitHub collaborators as potential co-authors
 */
export async function getGitHubCollaborators(): Promise<CoAuthor[]> {
	try {
		// Get collaborators with their details
		const result = await execFileNoThrow('gh', [
			'api',
			'repos/{owner}/{repo}/collaborators',
			'--jq',
			'.[] | "(.login)"',
		])

		if (result.status !== 0 || !result.stdout.trim()) {
			return []
		}

		const logins = result.stdout.trim().split('\n').filter(Boolean)
		const coauthors: CoAuthor[] = []

		// Get user details for each collaborator
		for (const login of logins.slice(0, 10)) {
			// Limit to 10 to avoid rate limits
			const userResult = await execFileNoThrow('gh', [
				'api',
				`users/${login}`,
				'--jq',
				'"(.name // .login) <(.email // .login + "@users.noreply.github.com")>"',
			])

			if (userResult.status === 0 && userResult.stdout.trim()) {
				const parsed = parseCoAuthor(
					userResult.stdout.trim().replace(/^"|"$/g, ''),
				)
				if (parsed) {
					coauthors.push({ ...parsed, source: 'github' })
				}
			}
		}

		return coauthors
	} catch {
		return []
	}
}

/**
 * Get all available co-authors from config and GitHub
 */
export async function getAllCoAuthors(
	configAliases: Record<string, string> | undefined,
	includeGitHub: boolean,
): Promise<CoAuthor[]> {
	const configCoAuthors = getCoAuthorsFromConfig(configAliases)

	if (!includeGitHub) {
		return configCoAuthors
	}

	const githubCoAuthors = await getGitHubCollaborators()

	// Deduplicate by email
	const seen = new Set<string>()
	const result: CoAuthor[] = []

	for (const ca of [...configCoAuthors, ...githubCoAuthors]) {
		if (!seen.has(ca.email)) {
			seen.add(ca.email)
			result.push(ca)
		}
	}

	return result
}
