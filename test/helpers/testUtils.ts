import type { Config, ValidationConfig } from '../../src/config'

type DeepPartialConfig = Partial<
	Omit<Config, 'validation'> & {
		validation?: Partial<ValidationConfig>
	}
>

export function createTestConfig(overrides: DeepPartialConfig = {}): Config {
	const defaults: Config = {
		preset: 'conventional',
		scopeMode: 'single',
		defaults: { scope: '', includeBody: true },
		plugins: [],
		validation: {
			enabled: true,
			maxHeaderLength: 72,
			maxBodyLineLength: 100,
			requireScope: false,
			requireBody: false,
			requireIssue: false,
			noTrailingPeriod: true,
			noLeadingCapital: false,
			customRules: [],
		},
		ai: { enabled: false, provider: 'auto' },
		github: {
			enabled: true,
			scopeLabelPatterns: ['scope:', 'area:'],
			auto: { detectIssues: true, suggestReviewers: false },
		},
	}

	// Deep merge validation config if provided
	const result = {
		...defaults,
		...overrides,
	}

	if (overrides.validation) {
		result.validation = {
			...defaults.validation!,
			...overrides.validation,
		}
	}

	return result as Config
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Normalize whitespace for easier testing
 */
export function normalizeWhitespace(text: string): string {
	return text.trim().replace(/\s+/g, ' ')
}

/**
 * Create a test spy for tracking function calls
 */
export function createSpy<T extends (...args: unknown[]) => unknown>() {
	const calls: Parameters<T>[] = []
	const spy = (...args: Parameters<T>) => {
		calls.push(args)
	}
	spy.calls = calls
	spy.reset = () => {
		calls.length = 0
	}
	return spy
}
