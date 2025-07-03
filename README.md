# EventCatalog Linter

A comprehensive linter for EventCatalog that validates frontmatter schemas and resource references to ensure your event-driven architecture documentation is correct and consistent.

[![npm version](https://badge.fury.io/js/eventcatalog-linter.svg)](https://badge.fury.io/js/eventcatalog-linter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📋 Schema Validation**: Validates all resource frontmatter against defined schemas using Zod
- **🔗 Reference Validation**: Ensures all referenced resources (services, events, domains, etc.) actually exist
- **📦 Semver Version Support**: Supports semantic versions, ranges (`^1.0.0`, `~1.2.0`), x-patterns (`0.0.x`), and `latest`
- **🎯 Comprehensive Coverage**: Supports all EventCatalog resource types
- **⚡ Fast Performance**: Efficiently scans large catalogs
- **🎨 ESLint-Inspired Output**: Clean, file-grouped error reporting with severity levels
- **⚠️ Warnings Support**: Distinguish between errors and warnings with `--fail-on-warning` option
- **🧪 Well Tested**: Comprehensive test suite with 100% coverage

### Supported Resource Types

- 🏢 **Domains** (including subdomains)
- ⚙️ **Services**
- 📨 **Events**
- 📤 **Commands**
- ❓ **Queries**
- 📡 **Channels**
- 🔄 **Flows**
- 📊 **Entities**
- 👤 **Users**
- 👥 **Teams**

## 📦 Installation

### Global Installation

```bash
npm install -g @eventcatalog/linter
```

### Use with npx (Recommended)

```bash
npx @eventcatalog/linter
```

### Add to your project

```bash
npm install --save-dev @eventcatalog/linter
```

## 🛠️ Usage

### Basic Usage

Run the linter in your EventCatalog directory:

```bash
# Lint current directory
eventcatalog-linter

# Lint specific directory
eventcatalog-linter ./my-eventcatalog

# Verbose output with detailed information
eventcatalog-linter --verbose

# Show help
eventcatalog-linter --help
```

### CLI Options

```
Usage: eventcatalog-linter [options] [directory]

Arguments:
  directory              EventCatalog directory to lint (default: ".")

Options:
  -V, --version          output the version number
  -v, --verbose          Show verbose output (default: false)
  --fail-on-warning      Exit with non-zero code on warnings (default: false)
  -h, --help             display help for command
```

### Package.json Integration

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "lint:eventcatalog": "@eventcatalog/linter",
    "lint:eventcatalog:verbose": "@eventcatalog/linter --verbose"
  }
}
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: EventCatalog Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npx @eventcatalog/linter
```

#### GitLab CI

```yaml
eventcatalog-lint:
  stage: test
  image: node:18
  script:
    - npx @eventcatalog/linter
```

## ✅ What It Validates

### Frontmatter Schema Validation

- ✅ Required fields are present (`id`, `name`, `version`)
- ✅ Field types are correct (strings, arrays, objects)
- ✅ Semantic versions follow proper format (`1.0.0`, `2.1.3-beta`)
- ✅ Version patterns supported (`latest`, `^1.0.0`, `~1.2.0`, `0.0.x`)
- ✅ URLs are valid format
- ✅ Email addresses are valid format
- ✅ Enum values are from allowed lists
- ✅ Nested object structures are correct

### Reference Validation

- ✅ Services referenced in domains exist
- ✅ Events/Commands/Queries referenced in services exist
- ✅ Entities referenced in domains/services exist
- ✅ Users/Teams referenced as owners exist
- ✅ Flow steps reference existing services/messages
- ✅ Entity properties reference existing entities
- ✅ Version-specific references are valid

### Example EventCatalog Structure

```
my-eventcatalog/
├── domains/
│   └── sales/
│       └── index.mdx
├── services/
│   ├── user-service/
│   │   └── index.mdx
│   └── order-service/
│       ├── index.mdx
│       └── 2.0.0/
│           └── index.mdx
├── events/
│   ├── user-created/
│   │   └── index.mdx
│   └── order-placed/
│       └── index.mdx
├── commands/
│   └── create-user/
│       └── index.mdx
├── flows/
│   └── user-registration/
│       └── index.mdx
├── entities/
│   ├── user/
│   │   └── index.mdx
│   └── order/
│       └── index.mdx
├── users/
│   ├── john-doe.mdx
│   └── jane-smith.mdx
└── teams/
    └── platform-team.mdx
```

## 📊 Example Output

### ✅ Success Output

```bash
$ eventcatalog-linter

✔ No problems found!

  42 files checked
```

### ❌ Error Output

```bash
$ eventcatalog-linter

services/user-service/index.mdx
  ✖ error version: Invalid semantic version format [version] (@eventcatalog/schema-validation)
  ⚠ warning summary should be provided for better documentation [summary] (@eventcatalog/schema-validation)

✖ 2 problems

domains/sales/index.mdx
  ✖ error Referenced service "order-service" does not exist [services] (@eventcatalog/invalid-reference)

✖ 1 problem

flows/user-registration/index.mdx
  ✖ error Referenced service "notification-service" (version: 2.0.0) does not exist [steps[1].service] (@eventcatalog/invalid-reference)

✖ 1 problem

✖ 4 problems (3 errors, 1 warning)
  3 files checked
```

### 🔍 Verbose Output

```bash
$ eventcatalog-linter --verbose

services/user-service/index.mdx
  ✖ error version: Invalid semantic version format [version] (@eventcatalog/schema-validation)

✖ 1 problem

domains/sales/index.mdx
  ✖ error Referenced service "order-service" does not exist [services] (@eventcatalog/invalid-reference)

✖ 1 problem

✖ 2 problems (2 errors, 0 warnings)
  2 files checked
```

## 🧪 Validation Examples

### Valid Frontmatter Examples

#### Domain

```yaml
---
id: sales
name: Sales Domain
version: 1.0.0
summary: Handles all sales-related operations
owners:
  - sales-team
services:
  - id: order-service
    version: 2.0.0
  - id: payment-service
entities:
  - id: order
  - id: customer
    version: 1.2.0
---
```

#### Service

```yaml
---
id: user-service
name: User Service
version: 2.1.0
summary: Manages user accounts and authentication
owners:
  - platform-team
  - john-doe
sends:
  - id: user-created
    version: 1.0.0
  - id: user-updated
receives:
  - id: create-user
  - id: update-user
entities:
  - id: user
repository:
  language: TypeScript
  url: https://github.com/company/user-service
---
```

#### Event

```yaml
---
id: user-created
name: User Created
version: 1.0.0
summary: Triggered when a new user account is created
owners:
  - platform-team
sidebar:
  badge: POST
  label: User Events
draft: false
deprecated: false
---
```

#### Flow

```yaml
---
id: user-registration
name: User Registration Flow
version: 1.0.0
summary: Complete user registration process
steps:
  - id: step1
    title: User submits registration form
    actor:
      name: User
    next_step: step2
  - id: step2
    title: Validate user data
    service:
      id: user-service
      version: 2.0.0
    next_step: step3
  - id: step3
    title: Send welcome email
    message:
      id: user-created
      version: 1.0.0
---
```

## 📦 Version Pattern Support

The linter supports flexible version patterns for resource references, making it easy to work with different versioning strategies:

### Supported Version Patterns

#### Exact Versions

```yaml
sends:
  - id: user-created
    version: 1.0.0 # Exact semantic version
```

#### Latest Version

```yaml
sends:
  - id: user-created
    version: latest # Always use the latest available version
```

#### Semver Ranges

```yaml
sends:
  - id: user-created
    version: ^1.0.0 # Compatible with 1.x.x (1.0.0, 1.2.3, but not 2.0.0)
  - id: user-updated
    version: ~1.2.0 # Compatible with 1.2.x (1.2.0, 1.2.5, but not 1.3.0)
```

#### X-Pattern Matching

```yaml
sends:
  - id: user-created
    version: 0.0.x # Matches 0.0.1, 0.0.5, 0.0.12, etc.
  - id: order-placed
    version: 1.x # Matches 1.0.0, 1.5.3, 1.99.0, etc.
```

#### Real-World Example

```yaml
---
id: inventory-service
name: Inventory Service
version: 2.1.0
sends:
  - id: OutOfStock
    version: latest # Always use latest version
  - id: GetInventoryList
    version: 0.0.x # Use any 0.0.x version
  - id: StockUpdated
    version: ^1.0.0 # Use compatible 1.x versions
---
```

### Common Validation Errors

#### ❌ Missing Required Fields

```yaml
---
# Missing 'id' field
name: User Service
version: 1.0.0
---
```

#### ❌ Invalid Semantic Version

```yaml
---
id: user-service
name: User Service
version: v1.0 # Should be 1.0.0
---
```

#### ❌ Invalid Reference

```yaml
---
id: sales-domain
name: Sales Domain
version: 1.0.0
services:
  - id: non-existent-service # Service doesn't exist
---
```

#### ❌ Invalid Email Format

```yaml
---
id: john-doe
name: John Doe
email: invalid-email # Should be john@example.com
---
```

## 🏷️ Error Codes

The linter provides descriptive error codes to help identify and fix issues quickly:

### Schema Validation Errors

- `@eventcatalog/required-field` - Required field is missing
- `@eventcatalog/invalid-type` - Field has wrong data type
- `@eventcatalog/schema-validation` - General schema validation error
- `@eventcatalog/schema` - Schema-related validation error

### Reference Validation Errors

- `@eventcatalog/invalid-reference` - Referenced resource doesn't exist

### Parse Errors

- `@eventcatalog/parse-error` - YAML/frontmatter parsing error

### Example with Error Codes

```bash
services/user-service/index.mdx
  ✖ error name: Required [name] (@eventcatalog/required-field)
  ✖ error version: Invalid semantic version format [version] (@eventcatalog/schema-validation)
  ✖ error Referenced service "missing-service" does not exist [sends] (@eventcatalog/invalid-reference)
```

## ⚠️ Warnings Support

The linter can distinguish between errors (which break functionality) and warnings (which suggest improvements):

- **Errors**: Critical issues that must be fixed
- **Warnings**: Suggestions for better documentation

Use `--fail-on-warning` to treat warnings as errors in CI/CD pipelines:

```bash
# Exit with error code if warnings are found
eventcatalog-linter --fail-on-warning
```

## 🔧 Development

### Setup

```bash
git clone https://github.com/event-catalog/eventcatalog-linter
cd eventcatalog-linter
npm install
```

### Available Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Testing

The linter includes comprehensive tests using Vitest:

- **Schema validation tests** - Ensures all Zod schemas work correctly
- **Reference validation tests** - Tests cross-reference checking
- **File scanning tests** - Tests file discovery and parsing
- **CLI tests** - Tests command-line interface
- **Integration tests** - End-to-end validation scenarios

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test schema-validator.test.ts
```

### Project Structure

```
src/
├── cli/           # Command-line interface
├── schemas/       # Zod validation schemas
├── scanner/       # File system scanning
├── parser/        # Frontmatter parsing
├── validators/    # Validation logic
├── reporters/     # Error reporting
└── types/         # TypeScript definitions

tests/
├── schema-validator.test.ts
├── reference-validator.test.ts
├── scanner.test.ts
└── utils/
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [EventCatalog Documentation](https://eventcatalog.dev)
- 🐛 [Report Issues](https://github.com/event-catalog/eventcatalog-linter/issues)
- 💬 [Discussions](https://github.com/event-catalog/eventcatalog-linter/discussions)

## 🙏 Acknowledgments

- Built for the [EventCatalog](https://eventcatalog.dev) community
- Powered by [Zod](https://zod.dev) for schema validation
- Tested with [Vitest](https://vitest.dev)
