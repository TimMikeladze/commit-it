import { confirm, isCancel, multiselect, text } from '@clack/prompts'
import { command, string } from '@drizzle-team/brocli'
import { GitService } from '../services/git'
import { GitHubService } from '../services/github'

export const branchCommand = command({
	name: 'branch',
	desc: 'Create a git branch from GitHub issues',
	shortDesc: 'Create branch from issues',
	options: {
		postfix: string('postfix')
			.alias('p')
			.desc('Optional postfix for branch name'),
	},
	handler: async (opts) => {
		try {
			const github = new GitHubService()
			const git = new GitService()

			// Interactive issue search
			const searchQuery = await text({
				message: 'Search for issues (number or keyword)',
				placeholder: '123 or "login bug"',
			})

			if (isCancel(searchQuery)) {
				throw new Error('Cancelled')
			}

			if (!searchQuery) {
				console.error('✗ Please provide a search query')
				process.exit(1)
			}

			// Search for issues
			const issues = await github.searchIssues(searchQuery)

			if (issues.length === 0) {
				console.error('✗ No issues found')
				process.exit(1)
			}

			// Multi-select issues
			const selectedIssues = await multiselect({
				message: 'Select issues to include in branch name',
				options: issues.map((i) => ({
					value: i.number,
					label: `#${i.number} - ${i.title}`,
				})),
				required: true,
			})

			if (isCancel(selectedIssues)) {
				throw new Error('Cancelled')
			}

			// Ask for optional postfix
			let postfix = opts.postfix
			if (!postfix) {
				const addPostfix = await confirm({
					message: 'Add a postfix to the branch name?',
					initialValue: false,
				})

				if (!isCancel(addPostfix) && addPostfix) {
					const postfixInput = await text({
						message: 'Enter postfix',
						placeholder: 'quick-fix, wip, etc.',
					})

					if (!isCancel(postfixInput)) {
						postfix = postfixInput
					}
				}
			}

			// Create branch name
			const branchName = await github.createBranchName(
				selectedIssues as number[],
				postfix,
			)

			// Preview and confirm
			console.log(`\n🌿 Branch preview: ${branchName}\n`)

			const confirmed = await confirm({
				message: 'Create this branch?',
				initialValue: true,
			})

			if (isCancel(confirmed) || !confirmed) {
				throw new Error('Cancelled')
			}

			// Create or switch to branch
			const result = await git.createOrSwitchBranch(branchName)

			if (result.created) {
				console.log(`✓ Created new branch: ${branchName}`)
			} else {
				console.log(`✓ Switched to existing branch: ${branchName}`)
			}
		} catch (error: any) {
			if (error.message === 'Cancelled') {
				process.exit(0)
			}
			console.error('✗ Error:', error.message)
			process.exit(1)
		}
	},
})
