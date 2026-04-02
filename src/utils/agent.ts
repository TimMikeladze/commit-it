/**
 * Detect whether commit-it is being called from an AI agent or
 * non-interactive environment. When true, commit-it should skip its own
 * AI generation (the caller already has context) and instead expose the
 * project's commit schema so the caller can format messages itself.
 */
export function isAgentEnvironment(): boolean {
	// Non-interactive stdin is the primary signal — agents spawn
	// subprocesses without a TTY attached.
	if (!process.stdin.isTTY) {
		return true
	}

	// Known agent environment variables as a secondary signal.
	// These cover cases where a pseudo-TTY is allocated but the
	// caller is still an agent.
	const agentEnvVars = [
		'CLAUDE_CODE',
		'CURSOR_AGENT',
		'CODEX_CLI',
		'AIDER',
		'CLINE',
	]

	return agentEnvVars.some((v) => process.env[v])
}
