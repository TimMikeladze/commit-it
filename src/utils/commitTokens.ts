/**
 * Shared footer token list for conventional commit parsing and validation.
 *
 * BREAKING CHANGE is listed separately because it receives special handling
 * in the parser (it sets the `isBreaking` flag), but it is still part of
 * the regex so that both git.ts and validation.ts detect footers consistently.
 */
export const FOOTER_TOKENS: readonly string[] = [
	'BREAKING CHANGE',
	'Co-authored-by',
	'Closes',
	'Fixes',
	'Resolves',
	'Ref',
	'Signed-off-by',
	'Acked-by',
	'Reviewed-by',
	'Tested-by',
	'Cc',
] as const

/**
 * Regex that matches the start of any recognised footer line.
 * Anchored to the beginning of the line; matches the token followed by
 * `:` or `#` (with optional surrounding whitespace).
 *
 * Case-insensitive.
 */
export const FOOTER_TOKEN_REGEX: RegExp = new RegExp(
	`^(${FOOTER_TOKENS.join('|')})\\s*[:#]`,
	'i',
)
