# Coding Rules & Guidelines

This document outlines the standards and practices for contributing to the **Obsidian Ollama Tagger** project. These rules must be strictly followed.

## 1. Language & Typing
- **Language**: TypeScript.
- **Strict Mode**: `noImplicitAny` is enforced. Do not use `any` unless absolutely necessary and documented.
- **Types**: Always define interfaces for data structures (e.g., API responses, settings).

## 2. Architecture & Style
- **Paradigm**: **Object-Oriented Programming (OOP)**.
- **Structure**:
    - Use **Classes** for Logic, Services, and UI components.
    - Keep `main.ts` light (orchestration only). Delegate logic to dedicated Service classes (e.g., `OllamaService`).
- **File Naming**: `snake_case` for filenames (e.g., `ollama_service.ts`), `PascalCase` for Classes.

## 3. Documentation & Release Notes
- **Language**: **English** only.
- **Comments**: JSDoc format for all public methods and complex logic.
- **Release Tracking**:
    - Every user-facing change must be recorded.
    - Update `CHANGELOG.md` (to be created) for features and fixes.

## 4. Testing
- **Framework**: Jest.
- **Requirement**: **Mandatory** and **Exhaustive** unit tests for all business logic.
- **Naming Convention**: `it('should [expected behavior] when [condition]', ...)`
- **Mocking**: Mock external dependencies (Obsidian API, Network) to ensure tests are fast and isolated.

## 5. Error Handling
- **Mechanism**: Standard `try/catch` blocks.
- **Reporting**:
    - Catch errors at the boundary (e.g., user action).
    - Log full errors to console (`console.error`).
    - Show user-friendly messages via `Notice` for UI errors.

## 6. Git Conventions
- **Format**: **Conventional Commits**.
    - `feat: ...` for new features.
    - `fix: ...` for bug fixes.
    - `docs: ...` for documentation.
    - `style: ...` for formatting.
    - `refactor: ...` for code restructuring without behavior change.
    - `test: ...` for adding/fixing tests.
    - `chore: ...` for build/tooling maintenance.

## 7. Obsidian Best Practices
Obsidian plugins run inside a specific environment. Follow these patterns:

- **Lifecycle**:
    - **`onload()`**: Initialize services, register events/commands.
    - **`onunload()`**: Clean up intervals, DOM elements, or manual event listeners. *Note: events registered via `this.registerEvent` are auto-cleaned.*
- **API Usage**:
    - Use `requestUrl` (from `obsidian` module) instead of `fetch` to avoid CORS issues.
    - access the vault via `this.app.vault`.
    - access metadata via `this.app.metadataCache`.
- **UI**:
    - Use `Notice` for transient messages.
    - Use `Modal` for user input dialogs.
    - Use `PluginSettingTab` for configuration.
- **Design**:
    - Respect the user's theme (CSS variables).
    - Avoid direct DOM manipulation; use Obsidian's helper functions when possible.
