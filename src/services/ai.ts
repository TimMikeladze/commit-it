// Re-export from the CLI-based AI service implementation
export type {
	AICommitSuggestion,
	AIMultiCommitPlan,
	CLIAdapter,
	GenerateContext,
} from './ai/index'
export {
	buildMultiCommitPrompt,
	buildPrompt,
	createAdapter,
	generateCommitMessage,
	generateMultiCommitPlan,
	isAIAvailable,
	NO_CLI_ERROR_MESSAGE,
	parseAIResponse,
	parseMultiCommitResponse,
	resolveProvider,
	shouldAutoAI,
} from './ai/index'
