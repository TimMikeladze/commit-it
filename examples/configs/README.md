# Example Configurations

This directory contains example configurations for different team types and workflows.

## Quick Reference

| Configuration | Use Case | Key Features |
|--------------|----------|--------------|
| **minimal.ts** | Personal projects, getting started | Bare minimum setup |
| **full-featured.ts** | Reference implementation | All available options |
| **open-source.ts** | OSS projects | DCO sign-off, issue references |
| **enterprise-jira.ts** | Enterprise with JIRA | Strict validation, JIRA tickets |
| **monorepo.ts** | Monorepos | Package scopes, cross-package rules |
| **ai-first.ts** | AI-powered workflow | Heavy AI usage, minimal validation |
| **strict-validation.ts** | High-quality standards | Maximum enforcement |
| **gitmoji.ts** | Emoji lovers | Gitmoji preset with emoji validation |
| **team-collaboration.ts** | Pair/mob programming | Co-author management |
| **security-focused.ts** | Security-conscious teams | Blocks sensitive data |
| **release-automation.ts** | Automated releases | Semantic-release compatible |
| **mobile-app.ts** | iOS/Android apps | Platform-specific scopes |

## Usage

Copy any example to your project root as `commit.config.ts`:

```bash
# Copy the configuration you want
cp examples/configs/monorepo.ts commit.config.ts

# Or create a symlink
ln -s examples/configs/open-source.ts commit.config.ts
```

Then customize to match your team's needs.

## Configuration Breakdown

### minimal.ts
Perfect for:
- Personal projects
- Quick prototypes
- Learning commit-it
- Solo developers

### full-featured.ts
Perfect for:
- Understanding all options
- Reference documentation
- Building custom configs
- Feature exploration

### open-source.ts
Perfect for:
- GitHub-hosted OSS projects
- Projects requiring DCO
- Community contributions
- Public repositories

Key rules:
- Requires `Signed-off-by` (DCO)
- Encourages issue references
- Blocks merge commits
- Enforces present tense

### enterprise-jira.ts
Perfect for:
- Corporate environments
- JIRA-based workflows
- Strict compliance needs
- Regulated industries

Key rules:
- Requires JIRA ticket (e.g., PROJ-123)
- Enforces scope and body
- Blocks WIP commits
- Minimum body length

### monorepo.ts
Perfect for:
- Lerna/Nx/Turborepo projects
- Multi-package repositories
- Microservices monorepos
- Shared component libraries

Key rules:
- Package-based scopes required
- Cross-package change warnings
- Strict scope allowlist
- Package isolation

### ai-first.ts
Perfect for:
- Teams embracing AI
- Rapid development
- Prototyping
- Modern workflows

Key features:
- AI enabled by default
- Generous scope mapping
- Minimal validation
- Trust the AI

### strict-validation.ts
Perfect for:
- High-quality standards
- Regulated environments
- Audit requirements
- Best practice enforcement

Key rules:
- All fields required
- Short subject lines (50 chars)
- Imperative mood enforced
- Issue references required
- No WIP/merge/fixup commits

### gitmoji.ts
Perfect for:
- Visual commit logs
- Emoji-friendly teams
- Quick type identification
- Fun workflows

Key rules:
- Must start with gitmoji
- No duplicate emojis
- Visual commit history

### team-collaboration.ts
Perfect for:
- Pair programming
- Mob programming
- Remote teams
- Cross-functional teams

Key features:
- Extensive co-author roster
- Team aliases
- Reviewer suggestions
- Collaboration tracking

### security-focused.ts
Perfect for:
- Security teams
- Fintech/Healthcare
- Sensitive data handling
- Compliance requirements

Key rules:
- Blocks API keys/passwords
- Blocks tokens/private keys
- CVE/GHSA references
- No hardcoded IPs
- Security scope enforcement

### release-automation.ts
Perfect for:
- Semantic-release
- Automated versioning
- CI/CD pipelines
- npm/PyPI publishing

Key rules:
- Strict type enforcement
- Breaking change format
- Release commit format
- Version number restrictions
- Issue references for features

### mobile-app.ts
Perfect for:
- React Native apps
- Flutter apps
- Native iOS/Android
- Cross-platform development

Key features:
- Platform scopes (ios/android)
- Release tracking
- Native module warnings
- Dependency scopes

## Combining Configurations

You can mix and match features from different configs:

```typescript
import { defineConfig } from 'commit-it'

export default defineConfig({
  // From monorepo.ts
  scopeMap: {
    'packages/core/**': 'core',
    'packages/web/**': 'web',
  },

  // From ai-first.ts
  ai: {
    enabled: true,
    provider: 'auto',
  },

  // From security-focused.ts
  validation: {
    enabled: true,
    customRules: [
      {
        name: 'no-api-keys',
        pattern: '\\b(api[_-]?key|apikey)\\b',
        message: 'Possible API key in commit message',
        level: 'error',
        invert: true,
      },
    ],
  },
})
```

## Creating Your Own

1. Start with `minimal.ts`
2. Add features as needed
3. Test with `commit-it validate`
4. Share with your team
5. Iterate based on feedback

## Questions?

- Check the main README.md
- Review full-featured.ts for options
- Open a GitHub discussion
- Join our Discord
