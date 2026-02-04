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

## 7. Release Process
- **Versioning**:
    - **Increment Version**: Before every commit/push that adds features or fixes, increment the version using `npm version patch` (or minor/major).
    - This automatically updates `package.json`, `manifest.json`, and `versions.json`.
    - **Git**: The `npm version` command creates a git commit and tag. Push these tags (`git push --follow-tags`).

## 8. Obsidian Best Practices
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

## 9. Obsidian Submission Guidelines
To ensure acceptance in the Community Plugin list, follow these rules strictly. These are enforced by the **ObsidianReviewBot**.

### 9.1 Styling
- **No Inline Styles**: Never use `element.style.prop = ...` or `setCssProps()`.
- **CSS Classes**: Use `addClass('class-name')` and define styles in `styles.css`.
- **Theme Compatibility**: Use CSS variables (e.g., `var(--background-modifier-border)`).

### 9.2 UI Text & Elements
- **Sentence Case**: All UI text must use sentence case.
  - ✅ `"Suggest tags"`, `"Add to note"`
  - ❌ `"Suggest Tags"`, `"Add To Note"`
- **Settings Headings**: 
  - Use `new Setting(el).setName('...').setHeading()` instead of `createEl('h1')`.
  - Do NOT include the word "settings" in settings headings.
  - Do NOT include the plugin name in settings headings.
- **Document Fragments**: Avoid `DocumentFragment` unless strictly necessary.

### 9.3 Async & Promise Handling
- **No Unawaited Promises**: All Promises must be handled.
  - Use `await` for sequential operations.
  - Use `void` to explicitly ignore fire-and-forget promises.
  - Use `.catch()` for error handling.
- **Async Callbacks**: If an event callback is async, wrap the call:
  ```typescript
  // ❌ Bad
  .onClick(async () => { await doSomething(); })
  
  // ✅ Good
  .onClick(() => { void doSomething(); })
  ```
- **Async IIFEs**: Must be prefixed with `void`:
  ```typescript
  void (async () => {
      const data = await fetchData();
  })();
  ```

### 9.4 Type Safety
- **No `any` Type**: Use specific types or `unknown` with type guards.
  ```typescript
  // ❌ Bad
  let data: any;
  
  // ✅ Good
  let data: unknown;
  const obj = data as Record<string, unknown>;
  ```
- **Error Typing**: Always type caught errors:
  ```typescript
  } catch (error) {
      const err = error as Error;
      new Notice(err.message);
  }
  ```
- **No Type Assertions** to `any` (e.g., `as any`).

### 9.5 Console Usage
- **No `console.log`**: Forbidden in production code.
- **Allowed**: `console.warn`, `console.error`, `console.debug` (sparingly).
- **User Feedback**: Use `Notice` for user-facing messages.

### 9.6 Code Quality
- **No Unused Imports**: Remove all unused imports and variables.
- **No Unused Catch Variables**: Use empty `catch {}` if variable is not needed.
- **No Obfuscation**: Code must be readable and unminified in source.
- **No External Network Calls**: Unless essential to plugin functionality.

### 9.7 Manifest & Release
- **`manifest.json`**:
  - `id`: Must match the folder name and `package.json` name.
  - `authorUrl`: Must be a valid URL (typically GitHub profile).
  - `version`: Must match `package.json` version.
- **`versions.json`**: Map each version to minimum Obsidian version.
- **Release Assets**: Include `main.js`, `manifest.json`, and `styles.css` (if present).

### 9.8 Repository Structure
- **`styles.css`**: Must be tracked in git (not in `.gitignore`).
- **`main.js`**: Should be in `.gitignore` (generated file).
- **Entry in `community-plugins.json`**: Must be at the end of the file.
