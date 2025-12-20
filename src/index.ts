export type { Config, CustomRule, ValidationConfig } from './config'
export { defineConfig, getDefaultConfig, loadConfig } from './config'
export { getPreset, listPresets, presets } from './presets'
export { interactiveCommit } from './prompts/commitFlow'
// AI service
export type { AICommitSuggestion } from './services/ai'
export { generateCommitMessage, isAIAvailable } from './services/ai'
// Co-author service
export type { CoAuthor } from './services/coauthor'
export {
	formatCoAuthor,
	formatCoAuthors,
	getAllCoAuthors,
	getCoAuthorsFromConfig,
	parseCoAuthor,
} from './services/coauthor'
// Format service
export type {
	CommitData,
	CommitType,
	Preset,
	ValidationResult as FormatValidationResult,
} from './services/format'
export { FormatValidator } from './services/format'
// Git service
export type {
	CommitOptions,
	CommitResult,
	IssueReference,
	ParsedCommit,
} from './services/git'
export { createCommit, GitService } from './services/git'
// GitHub service
export type { CommitContext } from './services/github'
export { GitHubService } from './services/github'
// Scope service
export type { ScopeSuggestion } from './services/scope'
export {
	getAllScopeSuggestions,
	getScopesFromConfig,
	getScopesFromLabels,
	getScopesFromPaths,
} from './services/scope'

// Template service
export type { TemplateData } from './services/template'
export {
	buildFullMessage,
	DEFAULT_TEMPLATES,
	renderTemplate,
} from './services/template'

// Validation service
export type {
	ParsedMessage,
	ValidationIssue,
	ValidationResult,
} from './services/validation'
export {
	formatValidationResult,
	getDefaultValidationConfig,
	parseCommitMessage,
	validateCommitMessage,
} from './services/validation'
