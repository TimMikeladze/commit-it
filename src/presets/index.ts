import type { Preset } from '../services/format'

export const presets: Record<string, Preset> = {
	conventional: {
		name: 'Conventional Commits',
		template: '{type}({scope}): {message}',
		types: [
			{ value: 'feat', desc: '✨ A new feature' },
			{ value: 'fix', desc: '🐛 A bug fix' },
			{ value: 'docs', desc: '📚 Documentation only changes' },
			{
				value: 'style',
				desc: '💅 Changes that do not affect the meaning of code',
			},
			{
				value: 'refactor',
				desc: '♻️ Code change that neither fixes a bug nor adds a feature',
			},
			{ value: 'perf', desc: '⚡ Code change that improves performance' },
			{ value: 'test', desc: '✅ Adding missing tests' },
			{ value: 'chore', desc: '🔧 Changes to build process or dependencies' },
		],
		scopes: [],
		validator: (msg) =>
			/^(feat|fix|docs|style|refactor|perf|test|chore)(\([^)]+\))?: .+/.test(
				msg,
			),
	},

	angular: {
		name: 'Angular Style',
		template: '{type}({scope}): {message}',
		types: [
			{ value: 'feat', desc: '✨ Feature' },
			{ value: 'fix', desc: '🐛 Bug fix' },
			{ value: 'docs', desc: '📚 Documentation' },
			{ value: 'style', desc: '💅 Formatting' },
			{ value: 'refactor', desc: '♻️ Refactoring' },
			{ value: 'perf', desc: '⚡ Performance' },
			{ value: 'test', desc: '✅ Tests' },
		],
		scopes: [],
		validator: (msg) =>
			/^(feat|fix|docs|style|refactor|perf|test)(\([^)]+\))?: .+/.test(msg),
	},

	gitmoji: {
		name: 'Gitmoji',
		template: '{type} {message}',
		types: [
			{ value: '✨', desc: 'New feature' },
			{ value: '🐛', desc: 'Bug fix' },
			{ value: '📚', desc: 'Documentation' },
			{ value: '💅', desc: 'Style' },
			{ value: '♻️', desc: 'Refactor' },
			{ value: '⚡', desc: 'Performance' },
			{ value: '✅', desc: 'Test' },
			{ value: '🔧', desc: 'Chore' },
			{ value: '🚀', desc: 'Deploy' },
		],
		validator: (msg) => /^(✨|🐛|📚|💅|♻️|⚡|✅|🔧|🚀) .+/.test(msg),
	},
}

export function getPreset(name: string): Preset {
	const preset = presets[name]
	if (!preset) {
		throw new Error(`Unknown preset: ${name}`)
	}
	return preset
}

export function listPresets(): string[] {
	return Object.keys(presets)
}
