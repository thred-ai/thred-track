# Thred SDK

A modern TypeScript SDK for browser tracking and lead enrichment from ChatGPT referrals.

## Features

- **ChatGPT Detection** - Automatic detection of visitors from ChatGPT
- **Browser Fingerprinting** - Privacy-friendly visitor identification
- **Page View Tracking** - Automatic page view analytics
- **Form Tracking** - Automatic form submission tracking
- **Lead Enrichment** - Capture and enrich lead data
- **Zero Dependencies** - Lightweight with no external dependencies
- **Multiple Formats** - UMD, CommonJS, and ES modules
- **TypeScript Support** - Full TypeScript definitions included

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
<script src="https://cdn.thred.dev/thred-track/thred-track.js?browserKey=YOUR_KEY"></script>
```

## Quick Start

### Script Tag

Drop the script onto your page with your browser key. That's it — everything is automatic:

```html
<script src="https://cdn.thred.dev/thred-track.js?browserKey=YOUR_KEY"></script>
```

### Module Import

```typescript
import { ThredSDK } from 'thred-track';

new ThredSDK({ browserKey: 'YOUR_KEY' });
```

No additional setup required. The SDK automatically:

1. Detects ChatGPT referrals via UTM parameters
2. Generates a browser fingerprint
3. Tracks page views for ChatGPT visitors
4. Monitors and captures form submissions based on your API config

## What Happens on Initialization

When the SDK initializes, it follows the same flow as the original script:

1. **Fetches config** from the Thred API using your `browserKey`
2. **Checks eligibility** — tracking only runs if the config says `enabled: true` and the visitor has a ChatGPT session or arrived via ChatGPT UTM
3. **Tracks the page view** automatically for ChatGPT visitors
4. **Sets up form tracking** — either injecting fingerprints into hosted form links, or attaching submit listeners to your form (based on config `type`)

All of this happens without any manual method calls.

## Constructor Options

```typescript
interface ThredOptions {
  browserKey: string;      // Required: Your Thred browser key
  debug?: boolean;         // Optional: Enable debug logging (default: false)
  autoInit?: boolean;      // Optional: Auto-initialize on construction (default: true)
}
```

## Usage Examples

### Basic HTML Page

```html
<form id="form">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <input type="text" name="company">
  <button type="submit">Submit</button>
</form>

<script src="https://unpkg.com/thred-track/dist/thred-track.umd.js?browserKey=YOUR_KEY"></script>
```

The SDK automatically picks up the form and tracks submissions — no extra JavaScript needed.

### React

```typescript
import { useEffect, useRef } from 'react';
import { ThredSDK } from 'thred-track';

function App() {
  const thredRef = useRef<ThredSDK | null>(null);

  useEffect(() => {
    thredRef.current = new ThredSDK({
      browserKey: process.env.REACT_APP_THRED_KEY!,
      debug: process.env.NODE_ENV === 'development',
    });

    return () => thredRef.current?.destroy();
  }, []);

  return <YourApp />;
}
```

### Next.js

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { ThredSDK } from 'thred-track';

export function ThredProvider({ children }: { children: React.ReactNode }) {
  const thredRef = useRef<ThredSDK | null>(null);

  useEffect(() => {
    thredRef.current = new ThredSDK({
      browserKey: process.env.NEXT_PUBLIC_THRED_KEY!,
    });

    return () => thredRef.current?.destroy();
  }, []);

  return <>{children}</>;
}
```

### Delayed Initialization

If you need to control when tracking starts (e.g., after user consent):

```typescript
import { ThredSDK } from 'thred-track';

const thred = new ThredSDK({
  browserKey: 'YOUR_KEY',
  autoInit: false,
});

// Later, when ready:
await thred.init();
```

## Advanced API

These methods are available for advanced use cases but are **not required** for typical usage — the SDK handles everything automatically.

#### `identify(leadData: LeadData): Promise<void>`

Manually identify a user outside of automatic form tracking (e.g., after OAuth or a custom flow):

```typescript
await thred.identify({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Inc',
});
```

#### `destroy(): void`

Clean up the SDK instance and remove event listeners. Use this when unmounting in SPAs:

```typescript
thred.destroy();
```

## Development

### Setup

```bash
npm install
npm run build
npm run dev       # Watch mode
npm test
npm run lint
npm run format
```

### Project Structure

```
thred-track/
├── src/
│   ├── core/              # Core SDK functionality
│   │   ├── api.ts         # API client
│   │   ├── fingerprint.ts # Fingerprint management
│   │   └── tracker.ts     # Event tracking
│   ├── utils/             # Utility functions
│   │   ├── detector.ts    # ChatGPT detection
│   │   └── logger.ts      # Logging utility
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   ├── __tests__/         # Test files
│   └── index.ts           # Main entry point
├── dist/                  # Build output
└── package.json
```

### Building

The SDK builds to multiple formats:

- **UMD** (`dist/thred-track.umd.js`) — For script tags
- **CommonJS** (`dist/index.js`) — For Node.js / bundlers
- **ES Module** (`dist/index.esm.js`) — For modern bundlers
- **TypeScript** (`dist/index.d.ts`) — Type definitions

### Testing

```bash
npm test
npm run test:watch
```

### Local Testing

```bash
npm run serve
```

Then open http://localhost:8080/basic.html?utm_source=chatgpt

## Configuration

The SDK fetches configuration from your Thred API automatically on init:

```json
{
  "enabled": true,
  "type": "custom",
  "formId": "form",
  "emailId": "email",
  "nameId": "name",
  "companyId": "company",
  "hasChatSession": true
}
```

This config controls which form to track, which fields to extract, and whether the visitor has an existing ChatGPT session.

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

## Support

For questions or issues, please open a GitHub issue or contact support@thred.dev.
