import { z } from 'zod';

// The app runs under a strict CSP without 'unsafe-eval': skip Zod's `new Function`
// probe, which browsers report as a CSP violation even though Zod catches it.
// Imported first in main.tsx, before any schema is used.
z.config({ jitless: true });
