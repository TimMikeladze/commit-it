# AI CLI Auto-Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace API-key-based AI with auto-detection and invocation of locally installed AI CLIs (claude, codex, agent), configured per-user.

**Architecture:** Factory-function adapters behind a shared `CLIAdapter` interface. Resolution chain: `--provider` flag > user config `provider` > first in config `providers` array > auto-detect from `$PATH` > error. Per-user config at `~/.commit-it/config.json`. Prompt building and response parsing centralized in the module index; adapters are thin CLI wrappers.

**Tech Stack:** TypeScript, Zod (validation), bun:test, execFileNoThrow (child_process wrapper)

---

## File Map

**Create:**
- `src/services/ai/types.ts` -- CLIAdapter interface, AICommitSuggestion, GenerateContext, UserAIConfig, ProviderConfig types + Zod schemas
- `src/services/ai/config.ts` -- loadUserAIConfig(), getConfigPath()
- `src/services/ai/detect.ts` -- detectAvailableCLI(), DETECTION_ORDER
- `src/services/ai/adapters/claude.ts` -- createClaudeAdapter()
- `src/services/ai/adapters/codex.ts` -- createCodexAdapter()
- `src/services/ai/adapters/agent.ts` -- createAgentAdapter()
- `src/services/ai/adapters/custom.ts` -- createCustomAdapter()
- `src/services/ai/index.ts` -- resolveProvider(), generateCommitMessage(), isAIAvailable(), buildPrompt(), parseAIResponse()
- `test/services/ai/config.test.ts`
- `test/services/ai/detect.test.ts`
- `test/services/ai/adapters/claude.test.ts`
- `test/services/ai/adapters/codex.test.ts`
- `test/services/ai/adapters/agent.test.ts`
- `test/services/ai/adapters/custom.test.ts`
- `test/services/ai/index.test.ts`

**Modify:**
- `src/config/index.ts` -- remove `ai` field from Config type and schema
- `src/commands/commit.ts` -- add `--provider` flag, update useAI logic
- `src/prompts/commitFlow.ts` -- update imports, add `provider` to InteractiveOptions, use new AI module
- `src/index.ts` -- update public exports to point to new module
- `test/config/index.test.ts` -- remove AI config tests
- `test/helpers/mocks.ts` -- update mockAI to match new interface

**Delete:**
- `src/services/ai.ts` -- replaced by `src/services/ai/` module

**Dependencies removed from `package.json`:**
- `ai`
- `@ai-sdk/openai`
- `@ai-sdk/anthropic`

---

### Task 1: Create types and Zod schemas

**Files:**
- Create: `src/services/ai/types.ts`

- [ ] **Step 1: Create types.ts with all interfaces and schemas**

```typescript
import { z } from 'zod'

export interface CLIAdapter {
	readonly name: string
	isAvailable(): Promise<boolean>
	execute(prompt: string): Promise<string>
}

export interface AICommitSuggestion {
	type: string
	scope?: string
	message: string
	body?: string
	breaking?: string
}

export interface GenerateContext {
	branchName?: string
	existingTypes?: string[]
}

export const AICommitSuggestionSchema = z.object({
	type: z.string(),
	scope: z.string().optional(),
	message: z.string(),
	body: z.string().optional(),
	breaking: z.string().optional(),
})

export const ProviderConfigSchema = z.object({
	name: z.enum(['claude', 'codex', 'agent', 'custom']),
	model: z.string().optional(),
	command: z.string().optional(),
	diffFlag: z.string().optional(),
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type ProviderName = ProviderConfig['name']

export const UserAIConfigSchema = z.object({
	ai: z
		.object({
			auto: z.boolean().default(false),
			provider: z.enum(['claude', 'codex', 'agent', 'custom']).optional(),
			providers: z.array(ProviderConfigSchema).default([]),
		})
		.optional(),
})

export type UserAIConfig = z.infer<typeof UserAIConfigSchema>
```

- [ ] **Step 2: Verify types compile**

Run: `bun run type-check`
Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/services/ai/types.ts
git commit -m "feat(ai): add types and Zod schemas for CLI adapter system"
```

---

### Task 2: Create user config loader

**Files:**
- Create: `src/services/ai/config.ts`
- Test: `test/services/ai/config.test.ts`

- [ ] **Step 1: Write failing tests for config loading**

```typescript
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { loadUserAIConfig, getConfigPath } from '../../../src/services/ai/config'

const TEST_CONFIG_DIR = '/tmp/commit-it-test-config'
const TEST_CONFIG_PATH = `${TEST_CONFIG_DIR}/config.json`

describe('loadUserAIConfig', () => {
	beforeEach(() => {
		if (existsSync(TEST_CONFIG_DIR)) {
			rmSync(TEST_CONFIG_DIR, { recursive: true })
		}
		mkdirSync(TEST_CONFIG_DIR, { recursive: true })
	})

	afterEach(() => {
		if (existsSync(TEST_CONFIG_DIR)) {
			rmSync(TEST_CONFIG_DIR, { recursive: true })
		}
	})

	test('should return null when config file does not exist', async () => {
		const config = await loadUserAIConfig('/tmp/nonexistent/config.json')
		expect(config).toBeNull()
	})

	test('should return null for invalid JSON', async () => {
		writeFileSync(TEST_CONFIG_PATH, 'not json')
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config).toBeNull()
	})

	test('should parse valid config', async () => {
		writeFileSync(
			TEST_CONFIG_PATH,
			JSON.stringify({
				ai: {
					auto: true,
					provider: 'claude',
					providers: [{ name: 'claude', model: 'sonnet' }],
				},
			}),
		)
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config).not.toBeNull()
		expect(config!.ai?.auto).toBe(true)
		expect(config!.ai?.provider).toBe('claude')
		expect(config!.ai?.providers).toHaveLength(1)
		expect(config!.ai?.providers[0]?.name).toBe('claude')
	})

	test('should handle config with no ai field', async () => {
		writeFileSync(TEST_CONFIG_PATH, JSON.stringify({}))
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config).not.toBeNull()
		expect(config!.ai).toBeUndefined()
	})

	test('should apply defaults for missing fields', async () => {
		writeFileSync(
			TEST_CONFIG_PATH,
			JSON.stringify({ ai: { provider: 'codex' } }),
		)
		const config = await loadUserAIConfig(TEST_CONFIG_PATH)
		expect(config!.ai?.auto).toBe(false)
		expect(config!.ai?.providers).toEqual([])
	})
})

describe('getConfigPath', () => {
	test('should return path under home directory', () => {
		const path = getConfigPath()
		expect(path).toContain('.commit-it')
		expect(path).toEndWith('config.json')
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/config.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement config.ts**

```typescript
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type UserAIConfig, UserAIConfigSchema } from './types'

export function getConfigPath(): string {
	return join(homedir(), '.commit-it', 'config.json')
}

export async function loadUserAIConfig(
	configPath?: string,
): Promise<UserAIConfig | null> {
	const path = configPath ?? getConfigPath()

	try {
		const content = await readFile(path, 'utf-8')
		const json = JSON.parse(content)
		return UserAIConfigSchema.parse(json)
	} catch {
		return null
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/config.ts test/services/ai/config.test.ts
git commit -m "feat(ai): add user config loader for ~/.commit-it/config.json"
```

---

### Task 3: Create CLI detection

**Files:**
- Create: `src/services/ai/detect.ts`
- Test: `test/services/ai/detect.test.ts`

- [ ] **Step 1: Write failing tests for CLI detection**

```typescript
import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../src/utils/execFileNoThrow'
import { detectAvailableCLI, DETECTION_ORDER } from '../../../src/services/ai/detect'

function mockExec(available: string[]): (cmd: string, args?: string[]) => Promise<ExecResult> {
	return async (cmd: string) => {
		if (available.includes(cmd)) {
			return { stdout: '1.0.0', stderr: '', status: 0 }
		}
		return { stdout: '', stderr: 'not found', status: 1 }
	}
}

describe('DETECTION_ORDER', () => {
	test('should have claude, codex, agent in order', () => {
		expect(DETECTION_ORDER).toEqual(['claude', 'codex', 'agent'])
	})
})

describe('detectAvailableCLI', () => {
	test('should return claude when available', async () => {
		const result = await detectAvailableCLI(mockExec(['claude']))
		expect(result).toBe('claude')
	})

	test('should return codex when claude is not available', async () => {
		const result = await detectAvailableCLI(mockExec(['codex']))
		expect(result).toBe('codex')
	})

	test('should return agent when others are not available', async () => {
		const result = await detectAvailableCLI(mockExec(['agent']))
		expect(result).toBe('agent')
	})

	test('should prefer claude over codex', async () => {
		const result = await detectAvailableCLI(mockExec(['claude', 'codex']))
		expect(result).toBe('claude')
	})

	test('should return null when no CLI is available', async () => {
		const result = await detectAvailableCLI(mockExec([]))
		expect(result).toBeNull()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/detect.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement detect.ts**

```typescript
import {
	type ExecResult,
	execFileNoThrow,
} from '../../utils/execFileNoThrow'
import type { ProviderName } from './types'

export const DETECTION_ORDER: readonly ProviderName[] = [
	'claude',
	'codex',
	'agent',
] as const

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export async function detectAvailableCLI(
	exec: ExecFn = execFileNoThrow,
): Promise<ProviderName | null> {
	for (const cli of DETECTION_ORDER) {
		const result = await exec(cli, ['--version'])
		if (result.status === 0) {
			return cli
		}
	}
	return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/detect.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/detect.ts test/services/ai/detect.test.ts
git commit -m "feat(ai): add CLI auto-detection from PATH"
```

---

### Task 4: Create Claude adapter

**Files:**
- Create: `src/services/ai/adapters/claude.ts`
- Test: `test/services/ai/adapters/claude.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createClaudeAdapter } from '../../../../src/services/ai/adapters/claude'

function mockExec(result: ExecResult): (cmd: string, args?: string[]) => Promise<ExecResult> {
	return async () => result
}

function captureExec(): {
	calls: Array<{ cmd: string; args?: string[] }>
	exec: (cmd: string, args?: string[]) => Promise<ExecResult>
} {
	const calls: Array<{ cmd: string; args?: string[] }> = []
	return {
		calls,
		exec: async (cmd: string, args?: string[]) => {
			calls.push({ cmd, args })
			return { stdout: '{"type":"feat","message":"test"}', stderr: '', status: 0 }
		},
	}
}

describe('ClaudeAdapter', () => {
	test('should have name "claude"', () => {
		const adapter = createClaudeAdapter({})
		expect(adapter.name).toBe('claude')
	})

	test('isAvailable should return true when claude exists', async () => {
		const exec = mockExec({ stdout: 'claude 1.0.0', stderr: '', status: 0 })
		const adapter = createClaudeAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('isAvailable should return false when claude is missing', async () => {
		const exec = mockExec({ stdout: '', stderr: 'not found', status: 1 })
		const adapter = createClaudeAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(false)
	})

	test('execute should call claude with -p flag', async () => {
		const { calls, exec } = captureExec()
		const adapter = createClaudeAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.cmd).toBe('claude')
		expect(calls[0]?.args).toContain('-p')
		expect(calls[0]?.args).toContain('test prompt')
	})

	test('execute should pass --model when configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createClaudeAdapter({ model: 'opus', exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).toContain('--model')
		expect(calls[0]?.args).toContain('opus')
	})

	test('execute should not pass --model when not configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createClaudeAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).not.toContain('--model')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = mockExec({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createClaudeAdapter({ exec })
		expect(adapter.execute('test')).rejects.toThrow()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/adapters/claude.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement claude adapter**

```typescript
import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createClaudeAdapter(options: {
	model?: string
	exec?: ExecFn
}): CLIAdapter {
	const exec = options.exec ?? execFileNoThrow
	const model = options.model

	return {
		name: 'claude',

		async isAvailable(): Promise<boolean> {
			const result = await exec('claude', ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			const args = ['-p', prompt]
			if (model) {
				args.push('--model', model)
			}

			const result = await exec('claude', args)
			if (result.status !== 0) {
				throw new Error(`claude CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/adapters/claude.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/adapters/claude.ts test/services/ai/adapters/claude.test.ts
git commit -m "feat(ai): add Claude CLI adapter"
```

---

### Task 5: Create Codex adapter

**Files:**
- Create: `src/services/ai/adapters/codex.ts`
- Test: `test/services/ai/adapters/codex.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createCodexAdapter } from '../../../../src/services/ai/adapters/codex'

function mockExec(result: ExecResult): (cmd: string, args?: string[]) => Promise<ExecResult> {
	return async () => result
}

function captureExec(): {
	calls: Array<{ cmd: string; args?: string[] }>
	exec: (cmd: string, args?: string[]) => Promise<ExecResult>
} {
	const calls: Array<{ cmd: string; args?: string[] }> = []
	return {
		calls,
		exec: async (cmd: string, args?: string[]) => {
			calls.push({ cmd, args })
			return { stdout: '{"type":"feat","message":"test"}', stderr: '', status: 0 }
		},
	}
}

describe('CodexAdapter', () => {
	test('should have name "codex"', () => {
		const adapter = createCodexAdapter({})
		expect(adapter.name).toBe('codex')
	})

	test('isAvailable should return true when codex exists', async () => {
		const exec = mockExec({ stdout: 'codex 1.0.0', stderr: '', status: 0 })
		const adapter = createCodexAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('isAvailable should return false when codex is missing', async () => {
		const exec = mockExec({ stdout: '', stderr: 'not found', status: 1 })
		const adapter = createCodexAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(false)
	})

	test('execute should call codex with -q flag', async () => {
		const { calls, exec } = captureExec()
		const adapter = createCodexAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.cmd).toBe('codex')
		expect(calls[0]?.args).toContain('-q')
		expect(calls[0]?.args).toContain('test prompt')
	})

	test('execute should pass --model when configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createCodexAdapter({ model: 'o3', exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).toContain('--model')
		expect(calls[0]?.args).toContain('o3')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = mockExec({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createCodexAdapter({ exec })
		expect(adapter.execute('test')).rejects.toThrow()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/adapters/codex.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement codex adapter**

```typescript
import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createCodexAdapter(options: {
	model?: string
	exec?: ExecFn
}): CLIAdapter {
	const exec = options.exec ?? execFileNoThrow
	const model = options.model

	return {
		name: 'codex',

		async isAvailable(): Promise<boolean> {
			const result = await exec('codex', ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			const args = ['-q', prompt]
			if (model) {
				args.push('--model', model)
			}

			const result = await exec('codex', args)
			if (result.status !== 0) {
				throw new Error(`codex CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/adapters/codex.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/adapters/codex.ts test/services/ai/adapters/codex.test.ts
git commit -m "feat(ai): add Codex CLI adapter"
```

---

### Task 6: Create Agent adapter

**Files:**
- Create: `src/services/ai/adapters/agent.ts`
- Test: `test/services/ai/adapters/agent.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createAgentAdapter } from '../../../../src/services/ai/adapters/agent'

function mockExec(result: ExecResult): (cmd: string, args?: string[]) => Promise<ExecResult> {
	return async () => result
}

function captureExec(): {
	calls: Array<{ cmd: string; args?: string[] }>
	exec: (cmd: string, args?: string[]) => Promise<ExecResult>
} {
	const calls: Array<{ cmd: string; args?: string[] }> = []
	return {
		calls,
		exec: async (cmd: string, args?: string[]) => {
			calls.push({ cmd, args })
			return { stdout: '{"type":"feat","message":"test"}', stderr: '', status: 0 }
		},
	}
}

describe('AgentAdapter', () => {
	test('should have name "agent"', () => {
		const adapter = createAgentAdapter({})
		expect(adapter.name).toBe('agent')
	})

	test('isAvailable should return true when agent exists', async () => {
		const exec = mockExec({ stdout: 'agent 1.0.0', stderr: '', status: 0 })
		const adapter = createAgentAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('isAvailable should return false when agent is missing', async () => {
		const exec = mockExec({ stdout: '', stderr: 'not found', status: 1 })
		const adapter = createAgentAdapter({ exec })
		expect(await adapter.isAvailable()).toBe(false)
	})

	test('execute should call agent with prompt', async () => {
		const { calls, exec } = captureExec()
		const adapter = createAgentAdapter({ exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.cmd).toBe('agent')
		expect(calls[0]?.args).toContain('test prompt')
	})

	test('execute should pass --model when configured', async () => {
		const { calls, exec } = captureExec()
		const adapter = createAgentAdapter({ model: 'fast', exec })
		await adapter.execute('test prompt')
		expect(calls[0]?.args).toContain('--model')
		expect(calls[0]?.args).toContain('fast')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = mockExec({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createAgentAdapter({ exec })
		expect(adapter.execute('test')).rejects.toThrow()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/adapters/agent.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement agent adapter**

Note: The exact CLI flags for Cursor's `agent` need verification during implementation. Using `-p` as a reasonable default; update if Cursor docs specify otherwise.

```typescript
import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createAgentAdapter(options: {
	model?: string
	exec?: ExecFn
}): CLIAdapter {
	const exec = options.exec ?? execFileNoThrow
	const model = options.model

	return {
		name: 'agent',

		async isAvailable(): Promise<boolean> {
			const result = await exec('agent', ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			const args = ['-p', prompt]
			if (model) {
				args.push('--model', model)
			}

			const result = await exec('agent', args)
			if (result.status !== 0) {
				throw new Error(`agent CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/adapters/agent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/adapters/agent.ts test/services/ai/adapters/agent.test.ts
git commit -m "feat(ai): add Cursor Agent CLI adapter"
```

---

### Task 7: Create Custom adapter

**Files:**
- Create: `src/services/ai/adapters/custom.ts`
- Test: `test/services/ai/adapters/custom.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from 'bun:test'
import type { ExecResult } from '../../../../src/utils/execFileNoThrow'
import { createCustomAdapter } from '../../../../src/services/ai/adapters/custom'

function captureExec(): {
	calls: Array<{ cmd: string; args?: string[] }>
	exec: (cmd: string, args?: string[]) => Promise<ExecResult>
} {
	const calls: Array<{ cmd: string; args?: string[] }> = []
	return {
		calls,
		exec: async (cmd: string, args?: string[]) => {
			calls.push({ cmd, args })
			return { stdout: '{"type":"feat","message":"test"}', stderr: '', status: 0 }
		},
	}
}

describe('CustomAdapter', () => {
	test('should have name "custom"', () => {
		const adapter = createCustomAdapter({
			command: 'my-tool --prompt {{prompt}}',
		})
		expect(adapter.name).toBe('custom')
	})

	test('isAvailable should check the base command exists', async () => {
		const exec = async (cmd: string) => {
			if (cmd === 'my-tool') return { stdout: '1.0', stderr: '', status: 0 }
			return { stdout: '', stderr: 'not found', status: 1 }
		}
		const adapter = createCustomAdapter({
			command: 'my-tool --prompt {{prompt}}',
			exec,
		})
		expect(await adapter.isAvailable()).toBe(true)
	})

	test('execute should substitute {{prompt}} in command template', async () => {
		const { calls, exec } = captureExec()
		const adapter = createCustomAdapter({
			command: 'my-tool --json --prompt {{prompt}}',
			exec,
		})
		await adapter.execute('generate a commit')
		expect(calls[0]?.cmd).toBe('my-tool')
		expect(calls[0]?.args).toContain('--json')
		expect(calls[0]?.args).toContain('--prompt')
		expect(calls[0]?.args).toContain('generate a commit')
	})

	test('execute should throw on CLI failure', async () => {
		const exec = async () => ({ stdout: '', stderr: 'error', status: 1 })
		const adapter = createCustomAdapter({
			command: 'my-tool --prompt {{prompt}}',
			exec,
		})
		expect(adapter.execute('test')).rejects.toThrow()
	})

	test('should throw if command template is missing', () => {
		expect(() => createCustomAdapter({ command: '' })).toThrow()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/adapters/custom.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement custom adapter**

```typescript
import {
	type ExecResult,
	execFileNoThrow,
} from '../../../utils/execFileNoThrow'
import type { CLIAdapter } from '../types'

type ExecFn = (cmd: string, args?: string[]) => Promise<ExecResult>

export function createCustomAdapter(options: {
	command: string
	exec?: ExecFn
}): CLIAdapter {
	if (!options.command) {
		throw new Error('Custom adapter requires a command template')
	}

	const exec = options.exec ?? execFileNoThrow
	const template = options.command

	// Extract the base command (first word) for availability check
	const baseCommand = template.split(' ')[0]!

	return {
		name: 'custom',

		async isAvailable(): Promise<boolean> {
			const result = await exec(baseCommand, ['--version'])
			return result.status === 0
		},

		async execute(prompt: string): Promise<string> {
			// Substitute {{prompt}} placeholder, then split into command + args
			const expanded = template.replace('{{prompt}}', prompt)
			const parts = expanded.split(' ')
			const cmd = parts[0]!
			const args = parts.slice(1)

			const result = await exec(cmd, args)
			if (result.status !== 0) {
				throw new Error(`Custom CLI failed: ${result.stderr}`)
			}
			return result.stdout
		},
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/adapters/custom.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/adapters/custom.ts test/services/ai/adapters/custom.test.ts
git commit -m "feat(ai): add custom CLI adapter with command templates"
```

---

### Task 8: Create main module with resolution chain

**Files:**
- Create: `src/services/ai/index.ts`
- Test: `test/services/ai/index.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from 'bun:test'
import {
	buildPrompt,
	parseAIResponse,
	createAdapter,
	NO_CLI_ERROR_MESSAGE,
} from '../../../src/services/ai'
import type { CLIAdapter, GenerateContext, ProviderConfig } from '../../../src/services/ai/types'

describe('buildPrompt', () => {
	test('should include diff in prompt', () => {
		const prompt = buildPrompt('+ added line', {})
		expect(prompt).toContain('+ added line')
	})

	test('should include branch name when provided', () => {
		const prompt = buildPrompt('diff', { branchName: 'feature/login' })
		expect(prompt).toContain('feature/login')
	})

	test('should include existing types when provided', () => {
		const prompt = buildPrompt('diff', { existingTypes: ['feat', 'fix', 'docs'] })
		expect(prompt).toContain('feat')
		expect(prompt).toContain('fix')
		expect(prompt).toContain('docs')
	})

	test('should truncate long diffs', () => {
		const longDiff = 'x'.repeat(10000)
		const prompt = buildPrompt(longDiff, {})
		expect(prompt.length).toBeLessThan(10000)
	})
})

describe('parseAIResponse', () => {
	test('should parse valid JSON response', () => {
		const result = parseAIResponse('{"type":"feat","scope":"cli","message":"add feature"}')
		expect(result).not.toBeNull()
		expect(result!.type).toBe('feat')
		expect(result!.scope).toBe('cli')
		expect(result!.message).toBe('add feature')
	})

	test('should extract JSON from surrounding text', () => {
		const result = parseAIResponse('Here is the result:\n{"type":"fix","message":"bug fix"}\nDone.')
		expect(result).not.toBeNull()
		expect(result!.type).toBe('fix')
	})

	test('should return null for invalid response', () => {
		const result = parseAIResponse('no json here')
		expect(result).toBeNull()
	})

	test('should default type to feat if missing', () => {
		const result = parseAIResponse('{"message":"something"}')
		expect(result).not.toBeNull()
		expect(result!.type).toBe('feat')
	})

	test('should default message to update if missing', () => {
		const result = parseAIResponse('{"type":"fix"}')
		expect(result).not.toBeNull()
		expect(result!.message).toBe('update')
	})
})

describe('createAdapter', () => {
	test('should create claude adapter', () => {
		const adapter = createAdapter({ name: 'claude' })
		expect(adapter.name).toBe('claude')
	})

	test('should create codex adapter', () => {
		const adapter = createAdapter({ name: 'codex' })
		expect(adapter.name).toBe('codex')
	})

	test('should create agent adapter', () => {
		const adapter = createAdapter({ name: 'agent' })
		expect(adapter.name).toBe('agent')
	})

	test('should create custom adapter with command', () => {
		const adapter = createAdapter({ name: 'custom', command: 'my-tool {{prompt}}' })
		expect(adapter.name).toBe('custom')
	})

	test('should throw for custom adapter without command', () => {
		expect(() => createAdapter({ name: 'custom' })).toThrow()
	})
})

describe('NO_CLI_ERROR_MESSAGE', () => {
	test('should include install URLs', () => {
		expect(NO_CLI_ERROR_MESSAGE).toContain('claude')
		expect(NO_CLI_ERROR_MESSAGE).toContain('codex')
		expect(NO_CLI_ERROR_MESSAGE).toContain('agent')
		expect(NO_CLI_ERROR_MESSAGE).toContain('https://')
	})

	test('should include custom config example', () => {
		expect(NO_CLI_ERROR_MESSAGE).toContain('~/.commit-it/config.json')
		expect(NO_CLI_ERROR_MESSAGE).toContain('custom')
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/ai/index.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement index.ts**

```typescript
import type { ExecResult } from '../../utils/execFileNoThrow'
import { createAgentAdapter } from './adapters/agent'
import { createClaudeAdapter } from './adapters/claude'
import { createCodexAdapter } from './adapters/codex'
import { createCustomAdapter } from './adapters/custom'
import { loadUserAIConfig } from './config'
import { detectAvailableCLI } from './detect'
import {
	AICommitSuggestionSchema,
	type AICommitSuggestion,
	type CLIAdapter,
	type GenerateContext,
	type ProviderConfig,
	type ProviderName,
} from './types'

export type { AICommitSuggestion, CLIAdapter, GenerateContext }

const MAX_DIFF_LENGTH = 8000

export const NO_CLI_ERROR_MESSAGE = `No AI CLI detected. Install one of the following:

  claude   https://docs.anthropic.com/en/docs/claude-code
  codex    https://github.com/openai/codex
  agent    https://www.cursor.com/

Or configure a custom CLI in ~/.commit-it/config.json:

  {
    "ai": {
      "providers": [
        { "name": "custom", "command": "my-tool --prompt {{prompt}}" }
      ]
    }
  }`

export function createAdapter(
	config: ProviderConfig,
	exec?: (cmd: string, args?: string[]) => Promise<ExecResult>,
): CLIAdapter {
	const opts = { model: config.model, exec }

	switch (config.name) {
		case 'claude':
			return createClaudeAdapter(opts)
		case 'codex':
			return createCodexAdapter(opts)
		case 'agent':
			return createAgentAdapter(opts)
		case 'custom':
			if (!config.command) {
				throw new Error('Custom provider requires a "command" field in config')
			}
			return createCustomAdapter({ command: config.command, exec })
	}
}

export async function resolveProvider(
	providerOverride?: string,
): Promise<CLIAdapter> {
	// 1. --provider flag override
	if (providerOverride) {
		const adapter = createAdapter({
			name: providerOverride as ProviderName,
		})
		if (await adapter.isAvailable()) {
			return adapter
		}
		throw new Error(`Provider "${providerOverride}" is not available. Is it installed?`)
	}

	// 2 & 3. User config: provider field, then first in providers array
	const userConfig = await loadUserAIConfig()
	if (userConfig?.ai) {
		const { provider, providers } = userConfig.ai

		if (provider) {
			const providerConfig = providers.find((p) => p.name === provider) ?? {
				name: provider,
			}
			const adapter = createAdapter(providerConfig)
			if (await adapter.isAvailable()) {
				return adapter
			}
		}

		if (providers.length > 0) {
			for (const providerConfig of providers) {
				const adapter = createAdapter(providerConfig)
				if (await adapter.isAvailable()) {
					return adapter
				}
			}
		}
	}

	// 4. Auto-detect from $PATH
	const detected = await detectAvailableCLI()
	if (detected) {
		return createAdapter({ name: detected })
	}

	// 5. Error
	throw new Error(NO_CLI_ERROR_MESSAGE)
}

export function buildPrompt(diff: string, context: GenerateContext): string {
	const types =
		context.existingTypes?.join(', ') ||
		'feat, fix, docs, style, refactor, test, chore'

	return `You are a commit message generator. Analyze the git diff and generate a conventional commit message.

Output a JSON object with these fields:
- type: one of ${types}
- scope: optional, a short word describing the area of change
- message: a concise description (imperative mood, no period, max 72 chars)
- body: optional, longer description if the change is complex
- breaking: optional, description of breaking changes if any

Only output valid JSON, no markdown or explanation.

Generate a commit message for this diff:
${context.branchName ? `\nBranch: ${context.branchName}` : ''}

\`\`\`diff
${diff.slice(0, MAX_DIFF_LENGTH)}
\`\`\``
}

export function parseAIResponse(text: string): AICommitSuggestion | null {
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}/)
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0])
			return {
				type: parsed.type || 'feat',
				scope: parsed.scope,
				message: parsed.message || 'update',
				body: parsed.body,
				breaking: parsed.breaking,
			}
		}
	} catch {
		// Ignore parse errors
	}
	return null
}

export async function generateCommitMessage(
	diff: string,
	context?: GenerateContext,
	providerOverride?: string,
): Promise<AICommitSuggestion | null> {
	try {
		const adapter = await resolveProvider(providerOverride)
		const prompt = buildPrompt(diff, context ?? {})
		const output = await adapter.execute(prompt)
		return parseAIResponse(output)
	} catch (error) {
		console.error(
			'AI generation failed:',
			error instanceof Error ? error.message : error,
		)
		return null
	}
}

export async function isAIAvailable(providerOverride?: string): Promise<boolean> {
	try {
		await resolveProvider(providerOverride)
		return true
	} catch {
		return false
	}
}

export async function shouldAutoAI(): Promise<boolean> {
	const userConfig = await loadUserAIConfig()
	return userConfig?.ai?.auto === true
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/services/ai/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/index.ts test/services/ai/index.test.ts
git commit -m "feat(ai): add provider resolution chain and commit message generation"
```

---

### Task 9: Remove AI from project config

**Files:**
- Modify: `src/config/index.ts`
- Modify: `test/config/index.test.ts`

- [ ] **Step 1: Remove `ai` field from Config type in src/config/index.ts**

Remove from the `Config` type:

```typescript
	ai?: {
		enabled: boolean
		provider: 'openai' | 'anthropic' | 'auto'
		model?: string
	}
```

Remove from `ConfigSchema`:

```typescript
	ai: z
		.object({
			enabled: z.boolean().default(false),
			provider: z.enum(['openai', 'anthropic', 'auto']).default('auto'),
			model: z.string().optional(),
		})
		.optional(),
```

Remove from `getDefaultConfig()` return value:

```typescript
		ai: {
			enabled: false,
			provider: 'auto',
			model: undefined,
		},
```

- [ ] **Step 2: Update test/config/index.test.ts**

Remove the test:

```typescript
		test('should have AI disabled by default', () => {
			const config = getDefaultConfig()
			expect(config.ai?.enabled).toBe(false)
			expect(config.ai?.provider).toBe('auto')
		})
```

Remove the test:

```typescript
		test('should allow AI config', () => {
			const config = defineConfig({
				ai: {
					enabled: true,
					provider: 'openai',
					model: 'gpt-4',
				},
			})
			expect(config.ai?.enabled).toBe(true)
			expect(config.ai?.provider).toBe('openai')
			expect(config.ai?.model).toBe('gpt-4')
		})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `bun test test/config/index.test.ts`
Expected: PASS

- [ ] **Step 4: Verify type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/index.ts test/config/index.test.ts
git commit -m "refactor(config): remove project-level AI config (now per-user)"
```

---

### Task 10: Update commit command and commit flow

**Files:**
- Modify: `src/commands/commit.ts`
- Modify: `src/prompts/commitFlow.ts`

- [ ] **Step 1: Update src/commands/commit.ts to add --provider flag and auto-AI logic**

Replace the options section to add `provider` and update the handler:

```typescript
import { boolean, command, string } from '@drizzle-team/brocli'
import { shouldAutoAI } from '../services/ai'
import { directCommit, interactiveCommit } from '../prompts/commitFlow'

export const commitCommand = command({
	name: 'commit',
	desc: 'Create a standardized commit with GitHub integration',
	shortDesc: 'Interactive commit with GitHub integration',
	options: {
		noGithub: boolean('no-github').desc('Skip GitHub API calls').default(false),
		dryRun: boolean('dry-run')
			.desc('Show commit without creating it')
			.default(false),
		all: boolean('all').alias('a').desc('Stage all changes').default(false),
		amend: boolean('amend').desc('Amend the last commit').default(false),
		breaking: boolean('breaking')
			.alias('b')
			.desc('Mark as breaking change')
			.default(false),
		ai: boolean('ai')
			.desc('Generate message from diff using AI')
			.default(false),
		noAi: boolean('no-ai').desc('Disable AI even if auto is configured').default(false),
		provider: string('provider')
			.desc('AI provider to use (claude, codex, agent, custom)')
			.alias('p'),
		type: string('type').alias('t').desc('Commit type (e.g. feat, fix)'),
		message: string('message')
			.alias('m')
			.desc('Commit message (non-interactive)'),
		scope: string('scope').alias('s').desc('Commit scope'),
		body: string('body').desc('Commit body'),
		coAuthor: string('co-author')
			.alias('c')
			.desc('Add co-author (alias or "Name <email>")'),
	},
	handler: async (opts) => {
		try {
			// Determine if AI should be used
			const autoAI = await shouldAutoAI()
			const useAI = opts.noAi ? false : (opts.ai || autoAI)

			// Non-interactive mode: --type and --message provided
			if (opts.type && opts.message) {
				const commit = await directCommit({
					type: opts.type,
					message: opts.message,
					scope: opts.scope,
					body: opts.body,
					breaking: opts.breaking,
					dryRun: opts.dryRun,
					stageAll: opts.all,
					amend: opts.amend,
					coAuthor: opts.coAuthor,
				})
				console.log(
					`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
				)
				return
			}

			const commit = await interactiveCommit({
				skipGithub: opts.noGithub,
				dryRun: opts.dryRun,
				stageAll: opts.all,
				amend: opts.amend,
				breaking: opts.breaking,
				useAI,
				provider: opts.provider,
				coAuthor: opts.coAuthor,
			})
			console.log(
				`✓ Commit ${opts.amend ? 'amended' : 'created'}: ${commit.hash}`,
			)
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			if (message === 'Cancelled') {
				process.exit(0)
			}
			console.error('✗ Error creating commit:', message)
			process.exit(1)
		}
	},
})
```

- [ ] **Step 2: Update InteractiveOptions in src/prompts/commitFlow.ts**

Add `provider` to `InteractiveOptions`:

```typescript
export interface InteractiveOptions {
	preset?: string
	skipGithub?: boolean
	dryRun?: boolean
	stageAll?: boolean
	amend?: boolean
	breaking?: boolean
	useAI?: boolean
	provider?: string
	coAuthor?: string
}
```

- [ ] **Step 3: Update imports in src/prompts/commitFlow.ts**

Replace the old AI import:

```typescript
import { generateCommitMessage, isAIAvailable } from '../services/ai'
```

With:

```typescript
import {
	generateCommitMessage,
	isAIAvailable,
	NO_CLI_ERROR_MESSAGE,
} from '../services/ai'
```

- [ ] **Step 4: Update AI generation block in interactiveCommit**

Replace the existing AI generation block (lines ~110-143 in commitFlow.ts):

```typescript
	// AI generation (if requested)
	let aiSuggestion = null
	if (options.useAI) {
		const available = await isAIAvailable(options.provider)
		if (!available) {
			console.error(`\n✗ ${NO_CLI_ERROR_MESSAGE}\n`)
			throw new Error('No AI CLI available')
		}

		console.log('🤖 Generating commit message with AI...\n')
		const diff = await git.getStagedDiff()
		if (diff) {
			const types = validator.getAvailableTypes().map((t) => t.value)
			aiSuggestion = await generateCommitMessage(
				diff,
				{
					branchName: await git.getBranchName(),
					existingTypes: types,
				},
				options.provider,
			)
			if (aiSuggestion) {
				console.log('✨ AI suggestion:')
				console.log(
					`   ${aiSuggestion.type}${aiSuggestion.scope ? `(${aiSuggestion.scope})` : ''}: ${aiSuggestion.message}`,
				)
				if (aiSuggestion.body) {
					console.log(`   ${aiSuggestion.body.split('\n')[0]}...`)
				}
				console.log()

				const useAI = await confirm({
					message: 'Use this AI-generated message?',
					initialValue: true,
				})

				if (isCancel(useAI)) {
					throw new Error('Cancelled')
				}

				if (!useAI) {
					aiSuggestion = null
				}
			}
		}
	}
```

- [ ] **Step 5: Verify type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/commands/commit.ts src/prompts/commitFlow.ts
git commit -m "feat(ai): update commit command with --provider flag and auto-AI support"
```

---

### Task 11: Update public exports, mocks, and cleanup

**Files:**
- Modify: `src/index.ts`
- Modify: `test/helpers/mocks.ts`
- Delete: `src/services/ai.ts`
- Modify: `package.json`

- [ ] **Step 1: Update src/index.ts exports**

Replace the AI export block:

```typescript
// AI service
export type { AICommitSuggestion } from './services/ai'
export { generateCommitMessage, isAIAvailable } from './services/ai'
```

With:

```typescript
// AI service
export type { AICommitSuggestion, GenerateContext } from './services/ai'
export {
	generateCommitMessage,
	isAIAvailable,
	shouldAutoAI,
} from './services/ai'
```

- [ ] **Step 2: Update test/helpers/mocks.ts**

Replace the `AICommitSuggestion` import and `mockAI` function:

```typescript
import type { AICommitSuggestion } from '../../src/services/ai'

export function mockAI(overrides: { suggestion?: AICommitSuggestion } = {}) {
	return {
		generateCommitMessage: async () =>
			overrides.suggestion || {
				type: 'feat',
				scope: 'test',
				message: 'add test feature',
			},
		isAIAvailable: async () => true,
		shouldAutoAI: async () => false,
	}
}
```

- [ ] **Step 3: Delete old src/services/ai.ts**

```bash
rm src/services/ai.ts
```

- [ ] **Step 4: Remove AI SDK dependencies from package.json**

Remove these three entries from `dependencies` in `package.json`:

```
"@ai-sdk/anthropic": "^3.0.44",
"@ai-sdk/openai": "^3.0.29",
"ai": "^6.0.86",
```

- [ ] **Step 5: Reinstall dependencies**

Run: `bun install`
Expected: lockfile updates, no errors

- [ ] **Step 6: Run all tests**

Run: `bun test`
Expected: All tests PASS

- [ ] **Step 7: Run type-check**

Run: `bun run type-check`
Expected: PASS

- [ ] **Step 8: Run lint**

Run: `bun run lint:fix`
Expected: PASS (or auto-fixes applied)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(ai): remove AI SDK deps, replace with CLI adapter system"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-03-31-ai-cli-detection.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?