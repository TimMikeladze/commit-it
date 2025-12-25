import micromatch from 'micromatch'
import type { Label } from './github'

export interface ScopeSuggestion {
	value: string
	source: 'config' | 'label' | 'path'
	label?: string
	color?: string // hex color for label-sourced scopes
}

/**
 * Extract scope suggestions from changed file paths using config scopeMap
 */
export function getScopesFromConfig(
	changedFiles: string[],
	scopeMap: Record<string, string> | undefined,
): ScopeSuggestion[] {
	if (!scopeMap || Object.keys(scopeMap).length === 0) {
		return []
	}

	const scopes = new Set<string>()
	const patterns = Object.keys(scopeMap)

	for (const file of changedFiles) {
		for (const pattern of patterns) {
			if (micromatch.isMatch(file, pattern)) {
				const scope = scopeMap[pattern]
				if (scope) {
					scopes.add(scope)
				}
			}
		}
	}

	return Array.from(scopes).map((value) => ({
		value,
		source: 'config' as const,
	}))
}

/**
 * Extract scope from GitHub labels matching patterns like scope:api, area/auth
 */
export function getScopesFromLabels(
	labels: Label[],
	patterns: string[],
): ScopeSuggestion[] {
	const scopes: ScopeSuggestion[] = []

	for (const label of labels) {
		for (const pattern of patterns) {
			if (label.name.startsWith(pattern)) {
				const scope = label.name.slice(pattern.length)
				if (scope) {
					scopes.push({
						value: scope,
						source: 'label',
						label: label.name,
						color: label.color,
					})
				}
			}
		}
	}

	return scopes
}

/**
 * Auto-detect scopes from file paths by extracting directory names
 */
export function getScopesFromPaths(changedFiles: string[]): ScopeSuggestion[] {
	const scopeCounts = new Map<string, number>()

	for (const file of changedFiles) {
		const parts = file.split('/')
		// Skip root files and extract meaningful directory names
		if (parts.length > 1) {
			// Try to get a meaningful scope from the path
			// e.g., src/services/github.ts → "services" or "github"
			// e.g., src/commands/commit.ts → "commands" or "commit"
			for (let i = 0; i < parts.length - 1; i++) {
				const dir = parts[i]
				if (!dir) continue

				// Skip common non-descriptive directories
				if (
					![
						'src',
						'lib',
						'app',
						'packages',
						'dist',
						'build',
						'node_modules',
					].includes(dir)
				) {
					scopeCounts.set(dir, (scopeCounts.get(dir) || 0) + 1)
				}
			}
		}
	}

	// Sort by frequency and return top scopes
	return Array.from(scopeCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([value]) => ({
			value,
			source: 'path' as const,
		}))
}

/**
 * Get all scope suggestions from multiple sources, deduplicated
 */
export function getAllScopeSuggestions(
	changedFiles: string[],
	scopeMap: Record<string, string> | undefined,
	labels: Label[],
	labelPatterns: string[],
): ScopeSuggestion[] {
	const configScopes = getScopesFromConfig(changedFiles, scopeMap)
	const labelScopes = getScopesFromLabels(labels, labelPatterns)
	const pathScopes = getScopesFromPaths(changedFiles)

	// Deduplicate by value, keeping highest priority source
	const seen = new Map<string, ScopeSuggestion>()

	// Config scopes have highest priority
	for (const scope of configScopes) {
		seen.set(scope.value, scope)
	}

	// Label scopes next
	for (const scope of labelScopes) {
		if (!seen.has(scope.value)) {
			seen.set(scope.value, scope)
		}
	}

	// Path scopes last
	for (const scope of pathScopes) {
		if (!seen.has(scope.value)) {
			seen.set(scope.value, scope)
		}
	}

	return Array.from(seen.values())
}
