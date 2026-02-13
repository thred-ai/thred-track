# Thred SDK

A modern TypeScript SDK for browser tracking and lead enrichment from ChatGPT referrals.

## Features

- 🎯 **ChatGPT Detection** - Automatic detection of visitors from ChatGPT
- 🔒 **Browser Fingerprinting** - Privacy-friendly visitor identification
- 📊 **Page View Tracking** - Anonymous page view analytics
- 📝 **Form Tracking** - Automatic form submission tracking
- 💼 **Lead Enrichment** - Capture and enrich lead data
- 🚀 **Zero Dependencies** - Lightweight with no external dependencies
- 📦 **Multiple Formats** - UMD, CommonJS, and ES modules
- 🔧 **TypeScript Support** - Full TypeScript definitions included

## Installation

### NPM

```bash
npm install thred-track
```

### Yarn

```bash
yarn add thred-track
```

### CDN (Script Tag)

```html
<script src="https://unpkg.com/thred-track/dist/thred-track.umd.js?browserKey=YOUR_KEY"></script>
```

## Quick Start

### Auto-Initialize (Script Tag)

Add the script with your browser key, and it will auto-initialize:

```html
<script src="./dist/thred-track.umd.js?browserKey=751fe47a-d4f5-496a-ba9c-fb298c281e8a"></script>
```

The SDK will automatically:
- Detect ChatGPT referrals
- Generate browser fingerprint
- Track page views
- Monitor form submissions

### Manual Initialization (Module)

```typescript
import { ThredSDK } from 'thred-track';

const thred = new ThredSDK({
  browserKey: 'your-browser-key',
  debug: true,
  autoInit: false, // Control initialization
});

// Initialize manually
await thred.init();
```

## API Reference

### Constructor Options

```typescript
interface ThredOptions {
  browserKey: string;      // Required: Your Thred browser key
  baseUrl?: string;        // Optional: API base URL (default: https://api.thred.dev/v1)
  debug?: boolean;         // Optional: Enable debug logging (default: false)
  autoInit?: boolean;      // Optional: Auto-initialize on construction (default: true)
}
```

### Methods

#### `init(): Promise<void>`

Initialize the SDK manually (only needed if `autoInit: false`).

```typescript
await thred.init();
```

#### `trackPageView(): Promise<void>`

Manually track a page view event.

```typescript
await thred.trackPageView();
```

#### `identify(leadData: LeadData): Promise<void>`

Identify a user and enrich lead data.

```typescript
await thred.identify({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Inc',
});
```

#### `trackFormSubmit(formData: FormData): Promise<void>`

Manually track a form submission.

```typescript
const form = document.getElementById('myForm');
const formData = new FormData(form);
await thred.trackFormSubmit(formData);
```

#### `getFingerprint(): string | null`

Get the current browser fingerprint (synchronous).

```typescript
const fingerprint = thred.getFingerprint();
```

#### `isFromChatGPT(): boolean`

Check if the visitor came from ChatGPT.

```typescript
if (thred.isFromChatGPT()) {
  console.log('Visitor from ChatGPT!');
}
```

#### `destroy(): void`

Clean up the SDK instance and remove event listeners.

```typescript
thred.destroy();
```

## Usage Examples

### Basic Form Tracking

```html
<form id="form">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <input type="text" name="company">
  <button type="submit">Submit</button>
</form>

<script src="./dist/thred-track.umd.js?browserKey=YOUR_KEY"></script>
```

### Programmatic Tracking

```typescript
import { ThredSDK } from 'thred-track';

const thred = new ThredSDK({
  browserKey: 'your-key',
  debug: true,
});

// Track custom events
await thred.trackPageView();

// Identify users manually
document.querySelector('#signup-btn').addEventListener('click', async () => {
  await thred.identify({
    name: userName,
    email: userEmail,
    company: userCompany,
  });
});
```

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { ThredSDK } from 'thred-track';

function App() {
  const [thred] = useState(() => new ThredSDK({
    browserKey: process.env.REACT_APP_THRED_KEY,
    debug: process.env.NODE_ENV === 'development',
  }));

  useEffect(() => {
    return () => thred.destroy();
  }, [thred]);

  const handleSubmit = async (formData) => {
    await thred.identify({
      name: formData.name,
      email: formData.email,
      company: formData.company,
    });
  };

  return <YourApp onSubmit={handleSubmit} />;
}
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run in watch mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
thred-track/
├── src/
│   ├── core/           # Core SDK functionality
│   │   ├── api.ts      # API client
│   │   ├── fingerprint.ts  # Fingerprint management
│   │   └── tracker.ts  # Event tracking
│   ├── utils/          # Utility functions
│   │   ├── detector.ts # ChatGPT detection
│   │   └── logger.ts   # Logging utility
│   ├── types/          # TypeScript definitions
│   │   └── index.ts
│   ├── __tests__/      # Test files
│   └── index.ts        # Main entry point
├── examples/           # Usage examples
├── dist/               # Build output
├── thred-track.js           # Original implementation (reference)
└── package.json
```

### Building

The SDK builds to multiple formats:

- **UMD** (`dist/thred-track.umd.js`) - For script tags
- **CommonJS** (`dist/index.js`) - For Node.js
- **ES Module** (`dist/index.esm.js`) - For bundlers
- **TypeScript** (`dist/index.d.ts`) - Type definitions

### Testing

Run the test suite:

```bash
npm test

# Watch mode
npm run test:watch
```

### Local Testing

Serve examples locally:

```bash
npm run serve
```

Then open http://localhost:8080/basic.html?utm_source=chatgpt

## Configuration

The SDK fetches configuration from your Thred API:

```json
{
  "enabled": true,
  "formId": "form",
  "emailId": "email",
  "nameId": "name",
  "companyId": "company",
  "fromChat": true
}
```

## Privacy & Security

- Only tracks visitors from ChatGPT (opt-in by source)
- Uses browser fingerprinting (no cookies required)
- All tracking controlled by API configuration
- No PII collected without explicit user submission
- Compliant with privacy regulations (GDPR, CCPA)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

Requires ES2015+ support.

## API Endpoints

- **Config**: `GET /v1/config?browserKey={key}`
- **Page View**: `POST /v1/events/page-view?browserKey={key}`
- **Enrich**: `POST /v1/customers/enrich?browserKey={key}`

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  ThredOptions,
  ThredConfig,
  LeadData,
  PageViewPayload,
  EnrichPayload,
} from 'thred-track';
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For questions or issues, please open a GitHub issue or contact support@thred.dev.
