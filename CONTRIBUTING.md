# Contributing to Thred SDK

Thank you for your interest in contributing to Thred SDK! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to foster an inclusive and welcoming community.

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/thredjs.git
   cd thredjs
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building

```bash
# Build once
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run type-check
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

### Local Testing

```bash
# Serve examples
npm run serve
```

Then open http://localhost:8080/basic.html?utm_source=chatgpt

## Project Structure

```
src/
├── core/           # Core SDK modules
│   ├── api.ts      # API client
│   ├── fingerprint.ts  # Fingerprint management
│   └── tracker.ts  # Event tracking
├── utils/          # Utility functions
│   ├── detector.ts # ChatGPT detection
│   └── logger.ts   # Logging utility
├── types/          # TypeScript type definitions
├── __tests__/      # Unit tests
└── index.ts        # Main entry point
```

## Coding Standards

### TypeScript

- Use TypeScript for all source files
- Define explicit types for function parameters and return values
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Follow the ESLint configuration
- Use Prettier for formatting
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Max line length: 80 characters

### Naming Conventions

- **Classes**: PascalCase (`ThredSDK`, `FingerprintManager`)
- **Functions/Methods**: camelCase (`trackPageView`, `getFingerprint`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_BASE_URL`)
- **Interfaces**: PascalCase with descriptive names (`ThredOptions`)
- **Private methods**: prefix with underscore (`_privateMethod`)

### Comments

- Use JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up-to-date with code changes

Example:
```typescript
/**
 * Track page view event
 * 
 * Sends anonymous page view data to Thred API
 * Only tracks if fingerprint is available
 */
async trackPageView(): Promise<void> {
  // Implementation
}
```

## Testing

### Writing Tests

- Place test files in `src/__tests__/`
- Name test files with `.test.ts` suffix
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('MyClass', () => {
  it('should do something when condition is met', () => {
    // Arrange
    const instance = new MyClass();
    
    // Act
    const result = instance.doSomething();
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases and error conditions
- Mock external dependencies

## Pull Request Process

1. **Update documentation**: Update README.md and JSDoc comments as needed
2. **Add tests**: Ensure new code has test coverage
3. **Run checks**: Ensure all tests pass and code is linted
   ```bash
   npm run lint
   npm test
   npm run build
   ```
4. **Update CHANGELOG**: Add your changes to CHANGELOG.md under "Unreleased"
5. **Commit messages**: Use clear, descriptive commit messages
   ```
   feat: add new tracking method
   fix: resolve fingerprint caching issue
   docs: update API documentation
   test: add tests for detector utility
   ```
6. **Submit PR**: Create a pull request with a clear description
   - Reference any related issues
   - Describe what changed and why
   - Include screenshots for UI changes

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or tooling changes

## Reporting Issues

### Bug Reports

Include:
- SDK version
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or console logs
- Code sample (if applicable)

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Potential impact

## Questions?

- Open a GitHub issue
- Email: support@thred.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
