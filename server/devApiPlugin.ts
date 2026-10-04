import type { IncomingMessage } from 'node:http';
import { loadEnv, type Plugin } from 'vite';
import { EMULATOR_HOSTS } from '../src/config/emulator.ts';
import { TRANSLATE_PATH } from '../src/domain/translateApi.ts';

/**
 * Serves the Netlify function on the Vite dev server (`pnpm dev`, `pnpm dev:emulators`),
 * so the AI flow works locally without netlify-cli. Server-only variables
 * (GEMINI_API_KEY, OWNER_UID…) are read from .env.local and only ever reach this
 * Node process, never the client bundle.
 */
export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
      if (env.VITE_USE_EMULATORS === 'true') {
        // firebase-admin then verifies tokens issued by the Auth emulator.
        const { host, port } = EMULATOR_HOSTS.auth;
        process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${host}:${String(port)}`;
      }

      server.middlewares.use(TRANSLATE_PATH, (req, res, next) => {
        void (async () => {
          // Reloaded on each call: edits to the function apply without restarting.
          const module = (await server.ssrLoadModule('/netlify/functions/translate.ts')) as {
            default: (request: Request) => Promise<Response>;
          };
          const response = await module.default(await toRequest(req));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.end(Buffer.from(await response.arrayBuffer()));
        })().catch(next);
      });
    },
  };
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(`http://localhost${TRANSLATE_PATH}`, {
    method: req.method ?? 'GET',
    headers,
    ...(hasBody ? { body: Buffer.concat(chunks) } : {}),
  });
}
