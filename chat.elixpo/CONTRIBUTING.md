# Contributing to Elixpo Chat

Thank you for your interest in contributing to Elixpo Chat! We welcome contributions from everyone.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/YOUR-USERNAME/chat.elixpo.git
    cd chat.elixpo
    ```
3.  **Add the upstream repository** to keep your fork synced:
    ```bash
    git remote add upstream https://github.com/elixpo/chat.elixpo.git
    ```

## Branch Naming Convention

Please create a new branch for each feature or fix you are working on. We follow conventional naming:
-   `feat/` - for new features (e.g., `feat/add-dark-mode`)
-   `fix/` - for bug fixes (e.g., `fix/header-alignment`)
-   `docs/` - for documentation updates (e.g., `docs/update-readme`)
-   `chore/` - for maintenance tasks, dependency updates, etc.
-   `ci/` - for CI/CD pipeline changes

Never commit directly to the `main` branch.

## Pull Request Workflow

1.  Create a branch from `main` using the conventions above.
2.  Make your changes and test them thoroughly.
3.  Ensure your code follows the established code style.
4.  Commit your changes using Conventional Commits guidelines (e.g., `feat: add user profile page`, `fix: resolve crash on login`).
5.  Push your branch to your fork on GitHub.
6.  Open a Pull Request against the `main` branch of the `elixpo/chat.elixpo` repository.
7.  Provide a clear and descriptive title and description for your PR.

## Code Style Expectations

-   We use **TypeScript** for new features and components. Please ensure strict typing where possible.
-   We use **Tailwind CSS** for styling.
-   Ensure there are no build errors or linter warnings before submitting your PR.
-   Follow the existing directory structure and component patterns.

## Issue Assignment

-   Before working on an issue, please comment on it asking to be assigned.
-   Do not open a PR for an issue that is already assigned to someone else unless they have been inactive for a significant period.
-   If you find a bug but aren't ready to fix it, please open a detailed issue with reproduction steps.

We appreciate your contributions!
