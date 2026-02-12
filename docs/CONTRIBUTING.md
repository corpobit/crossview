# Contributing to Crossview

Thank you for your interest in contributing to Crossview. This guide will help you get started.

## How to Contribute

### Getting Started

1. Fork the repository on GitHub.
2. Clone your fork and add the upstream remote:
   ```bash
   git clone https://github.com/YOUR_USERNAME/crossview.git
   cd crossview
   git remote add upstream https://github.com/corpobit/crossview.git
   ```
3. Create a branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. Make your changes, commit, and push to your fork.
5. Open a Pull Request against the `main` branch of the upstream repository.

### Development Setup

- **Frontend:** Node.js 20+, `npm install`, `npm run dev`
- **Backend:** Go 1.24+, `cd crossview-go-server && go run main.go app:serve`
- **Config:** Copy `config/examples/config.yaml.example` to `config/config.yaml` and adjust as needed.

See [Getting Started](GETTING_STARTED.md) and [Configuration](CONFIGURATION.md) for full details.

### Code Style

- Follow existing patterns and structure in the codebase.
- Keep functions and components focused and maintainable.
- Run the linter before submitting: `npm run lint` (frontend), `go vet ./...` (backend).
- Ensure existing tests pass: `npm run test` (if applicable), `go test ./...` in `crossview-go-server`.

### Pull Requests

- One feature or fix per PR when possible.
- Use a clear title and description; reference any related issues.
- Update documentation if you change behavior or add options.
- Rebase on latest `main` if the branch becomes outdated.

### Reporting Issues

- Use the [GitHub issue tracker](https://github.com/corpobit/crossview/issues).
- For bugs: describe steps to reproduce, expected vs actual behavior, and environment (OS, Node/Go versions, Kubernetes version).
- For feature ideas: check existing issues first; open a Discussion or Issue to propose or discuss.

### Questions

For questions or general discussion, open a GitHub Issue or join us on [Slack](https://join.slack.com/t/crossviewtalk/shared_invite/zt-3px5umxyo-G_tgt_3Eyt84nE1c1ykNTw).
