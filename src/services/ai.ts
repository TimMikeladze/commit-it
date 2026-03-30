// Re-export from the CLI-based AI service implementation
export type { AICommitSuggestion, CLIAdapter, GenerateContext } from './ai/index'
export {
	NO_CLI_ERROR_MESSAGE,
	buildPrompt,
	createAdapter,
	generateCommitMessage,
	isAIAvailable,
	parseAIResponse,
	resolveProvider,
	shouldAutoAI,
} from './ai/index'
