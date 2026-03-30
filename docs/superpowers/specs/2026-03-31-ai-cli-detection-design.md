# AI CLI Auto-Detection Design

**Date:** 2026-03-31
**Status:** Draft

## Overview

Replace the current API-key-based AI integration (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `ai` SDK) with automatic detection and invocation of AI CLIs already installed on the user's machine. This eliminates the need for API key setup and leverages tools users already have authenticated.

## Supported CLIs

In auto-detection priority order:

1. **claude** -- Anthropic's CLI (OAuth-authenticated)
2. **codex** -- OpenAI Codex CLI
3. **agent** -- Cursor's agent CLI

## Resolution Chain

When AI commit generation is triggered, the provider is resolved in this order:

1. **`--provider` CLI flag** -- e.g., `commit-it --ai --provider codex`
2. **`~/.commit-it/config.json` `provider` field** -- explicit user preference
3. **First entry in `providers` array** in user config
4. **Auto-detect from `$PATH`** -- check `claude`, `codex`, `agent` in order
5. **Error** -- print helpful message with install instructions

## CLI Flags

- **`--ai`** -- enable AI for this run (regardless of config)
- **`--no-ai`** -- disable AI for this run (regardless of config)
- **`--provider <name>`** -- override which CLI to use (e.g., `claude`, `codex`, `agent`, `custom`)
- **No flag** -- check `auto` field in user config; if `true`, behaves as if `--ai` was passed

## Per-User Config

Located at `~/.commit-it/config.json`. This is per-user, not per-project, because team members may have different CLIs installed.

```json
{
  "ai": {
    "auto": true,
    "provider": "claude",
    "providers": [
      { "name": "claude", "model": "sonnet" },
      { "name": "codex" },
      { "name": "agent" },
      {
        "name": "custom",
        "command": "my-ai-tool --json --prompt {{prompt}}",
        "diffFlag": "--diff {{diff}}"
      }
    ]
  }
}
```

### Fields

- **`auto`** -- when `true`, every `commit-it` invocation behaves as if `--ai` was passed. `--no-ai` overrides for a single run. Default: `false`. If the config file doesn't exist, this is treated as `false` (AI only runs when `--ai` is explicitly passed).
- **`provider`** -- which provider to use. If omitted, uses the first entry in `providers`.
- **`providers`** -- ordered array of configured CLIs.
  - **`name`** (required) -- one of `"claude"`, `"codex"`, `"agent"`, or `"custom"`
  - **`model`** (optional) -- model override passed to the CLI
  - **`command`** (custom only) -- command template with `{{prompt}}` and `{{diff}}` placeholders
  - **`diffFlag`** (custom only) -- how to pass the diff to the CLI

## CLI Adapter Interface

Each supported CLI gets a thin adapter implementing a shared interface:

```typescript
interface CLIAdapter {
  name: string
  isAvailable(): Promise<boolean>
  generate(diff: string, context: GenerateContext): Promise<AICommitSuggestion>
}

interface GenerateContext {
  branchName?: string
  existingTypes?: string[]
}

interface AICommitSuggestion {
  type: string
  scope?: string
  message: string
  body?: string
  breaking?: string
}
```

### Built-in Adapters

**claude:**
- Detection: `which claude`
- Invocation: `claude -p "<prompt>" --output-format json`
- Model flag: `--model <model>` if specified

**codex:**
- Detection: `which codex`
- Invocation: `codex -q "<prompt>"` with prompt instructing JSON output
- Model flag: `--model <model>` if specified

**agent:**
- Detection: `which agent`
- Invocation: exact flags to be verified during implementation
- Model flag: TBD

**custom:**
- Uses the command template from config
- Substitutes `{{prompt}}` and `{{diff}}` placeholders
- Expects JSON stdout matching `AICommitSuggestion` shape

All adapters validate responses through Zod against the `AICommitSuggestion` schema.

## File Structure

```
src/
  services/
    ai/
      index.ts          # resolveProvider(), generateCommitMessage(), isAIAvailable()
      adapters/
        claude.ts       # ClaudeAdapter
        codex.ts        # CodexAdapter
        agent.ts        # AgentAdapter
        custom.ts       # CustomAdapter
      types.ts          # CLIAdapter interface, AICommitSuggestion, config types
      config.ts         # loadUserAIConfig(), reads ~/.commit-it/config.json
      detect.ts         # detectAvailableCLIs(), checks $PATH
```

## What Gets Removed

**Dependencies removed from `package.json`:**
- `ai`
- `@ai-sdk/openai`
- `@ai-sdk/anthropic`

**Config changes:**
- Project-level `ai` config in `commit.config.ts` / `.commitrc` is removed entirely (was `ai.enabled`, `ai.provider`, `ai.model`)
- AI is now purely per-user via `~/.commit-it/config.json` + CLI flags

**Code changes:**
- `src/services/ai.ts` -- replaced by `src/services/ai/` module
- `src/config/index.ts` -- remove `ai` field from `Config` type and schema
- `src/commands/commit.ts` -- add `--provider` option, keep `--ai` and `--no-ai`
- `src/prompts/commitFlow.ts` -- update `isAIAvailable` / `generateCommitMessage` calls

## Error Message

When `--ai` is passed but no CLI is found:

```
✗ No AI CLI detected. Install one of the following:

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
  }
```
