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
import { loadUserAIConfig } from './ai/config'

async function getEditor(): Promise<string> {
	const config = await loadUserAIConfig()
	if (config?.editor) {
		return config.editor
	}
	return process.env.VISUAL || process.env.EDITOR || 'vi'
}

/**
 * Opens the given text in the user's preferred editor.
 * Resolution order: config.editor > $VISUAL > $EDITOR > vi
 * Returns the edited text, or the original if the editor exits with an error.
 */
export async function editInEditor(text: string): Promise<string> {
	const dir = mkdtempSync(join(tmpdir(), 'commit-it-'))
	const file = join(dir, 'COMMIT_EDITMSG')

	writeFileSync(file, text)

	try {
		const editor = await getEditor()
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
