import { execSync } from 'node:child_process'
import {
	mkdtempSync,
	readFileSync,
	rmdirSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function getEditor(): string {
	return process.env.VISUAL || process.env.EDITOR || 'vi'
}

/**
 * Opens the given text in the user's preferred editor ($VISUAL, $EDITOR, or vi).
 * Returns the edited text, or the original if the editor exits with an error.
 */
export function editInEditor(text: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'commit-it-'))
	const file = join(dir, 'COMMIT_EDITMSG')

	writeFileSync(file, text)

	try {
		const editor = getEditor()
		execSync(`${editor} "${file}"`, { stdio: 'inherit' })
		return readFileSync(file, 'utf-8')
	} catch {
		return text
	} finally {
		try {
			unlinkSync(file)
			rmdirSync(dir)
		} catch {
			// ignore cleanup errors
		}
	}
}
