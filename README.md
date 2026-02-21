# Thred SDK

Automatic browser tracking and lead enrichment for ChatGPT referrals.

## Installation

### Script Tag

```html
<script src="https://cdn.thred.dev/thred-track.js?browserKey=YOUR_KEY"></script>
```

### NPM

```bash
npm install @thred-apps/thred-track
```

```typescript
import { ThredSDK } from '@thred-apps/thred-track';

new ThredSDK({ browserKey: 'YOUR_KEY' });
```

That's it. The SDK automatically:

- Detects ChatGPT referrals
- Fingerprints the visitor
- Tracks page views
- Captures form submissions

No manual method calls needed.

## Framework Examples

### React

```typescript
import { useEffect, useRef } from 'react';
import { ThredSDK } from '@thred-apps/thred-track';

function App() {
  const thredRef = useRef<ThredSDK | null>(null);

  useEffect(() => {
    thredRef.current = new ThredSDK({
      browserKey: process.env.REACT_APP_THRED_KEY!,
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
import { ThredSDK } from '@thred-apps/thred-track';

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

## Privacy & Security

- Only tracks visitors arriving from ChatGPT
- Browser fingerprinting — no cookies required
- No PII collected without explicit user submission
- GDPR and CCPA compliant

## Browser Support

Chrome, Firefox, Safari, Edge (latest versions). Requires ES2015+.

## License

MIT
