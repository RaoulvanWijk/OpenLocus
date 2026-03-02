# Contributing to Open Locus

Below you'll find a set of guidelines for how to contribute to Open Locus.

## Installation & Requirements

TBD

## Development Workflow

When you are ready to start working on a feature or a fix, please ensure your work is based on the latest `main` branch. We use semantic branch names to keep our repository organized and easily scannable.

Format: `<type>/<short-description>`

The type should map to the Conventional Commits types (e.g., `feat`, `fix`, `docs`, `refactor`).

Examples:
- `feat/user-authentication`
- `fix/mobile-header-alignment`

## Code Style & Linting

We use Prettier and ESLint to maintain a consistent codebase. The configuration for these tools is included directly within the project repository.

To ensure your code meets our formatting standards effortlessly:
1. Ensure you have followed the [installation setup](https://github.com/RaoulvanWijk/OpenLocus/blob/main/CONTRIBUTING.md#installation--requirements) to download the local `prettier` and `eslint` dependencies.
2. Install the **Prettier** and **ESLint** extensions in your IDE.
3. Configure your IDE so **Format on Save** is set to **Prettier**. 

All code will be linted during the CI process, and PRs with formatting or linting errors will fail the pipeline.

## Testing

You are expected to write and include tests for any new features or bug fixes you contribute. The specific testing libraries and local commands are currently TBD while we finalize our testing infrastructure, but please design your code with testability in mind. Further details will be added here soon.

## Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for all commit messages. This helps us keep a machine-readable and organized history.

Format: `<type>(<scope>): <description>`

- **type:** Use `feat`, `fix`, `docs`, `style`, `refactor`, `test`, or `chore`.
- **scope:** (Optional) The specific package or module affected (e.g., `ui`, `api`, `deps`).
- **description:** A short, imperative-style summary (e.g., "add login validation").

Example: `fix(ui): resolve alignment issue on mobile headers`

## Pull Requests

For all Pull Requests, you should be extremely descriptive about both the problem you are solving and your proposed solution. 

All commits within a PR are squashed when merged, using the PR title as the commit message. For that reason, please use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for your PR titles.

Here are some examples:
- `feat: add new feature`
- `fix: fix bug`
- `docs: add documentation`
- `test: add/fix tests`
- `refactor: refactor code`
- `chore: anything that does not fit into the above categories`

If applicable, you must indicate the affected packages or scopes in parentheses to "scope" the changes.

Here are some examples:
- `feat(popup): add new component`
- `fix(background): resolve sync issue`

## The Review Process

Once your Pull Request is open, it will go through the following review cycle:

1. **Automated Checks:** All CI/CD pipeline checks (linting, building, and eventually tests) must pass successfully.
2. **Peer Review:** Your code requires approval from at least **one reviewer** within the relevant department (e.g., frontend engineers review frontend changes). This requirement is enforced via GitHub branch protection rules, meaning it is not possible to merge your PR without this approval.
3. **Iterative Feedback:** If the reviewer leaves comments or requests changes, you are expected to address the feedback, push your updates, and request a re-review. This cycle continues until the reviewer is satisfied and approves the changes.
4. **Merge:** Once the PR has been officially approved and all automated checks are green, it can be safely merged.

### Guidelines for Reviewers

If you are assigned to review a Pull Request, please keep the following in mind to maintain the quality of the project:

- **Enforce the Standards:** Use this document as your baseline. Ensure the PR complies with our semantic branching, code style, and testing expectations.
- **Provide Actionable Feedback:** Be clear and constructive in your comments. If you are blocking approval with requested changes, try to offer clear guidance or examples on how to resolve the issue.
