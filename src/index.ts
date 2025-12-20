export type { Config } from './config'
export { getDefaultConfig, loadConfig } from './config'
export { getPreset, listPresets, presets } from './presets'
export { interactiveCommit } from './prompts/commitFlow'
export type {
	CommitData,
	CommitType,
	Preset,
	ValidationResult,
} from './services/format'
export { FormatValidator } from './services/format'
export type {
	CommitOptions,
	CommitResult,
	IssueReference,
} from './services/git'
export { createCommit, GitService } from './services/git'
// Re-export types
export type { CommitContext } from './services/github'
export { GitHubService } from './services/github'
