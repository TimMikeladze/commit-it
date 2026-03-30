// Re-export from the CLI-based AI service implementation
export type {
	AICommitSuggestion,
	CLIAdapter,
	GenerateContext,
} from './ai/index'
export {
	buildPrompt,
	createAdapter,
	generateCommitMessage,
	isAIAvailable,
	NO_CLI_ERROR_MESSAGE,
	parseAIResponse,
	resolveProvider,
	shouldAutoAI,
} from './ai/index'
