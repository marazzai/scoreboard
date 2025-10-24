import http from 'http';
import { parse, type UrlWithParsedQuery } from 'url';
import next from 'next';

// Minimal Next custom server — single clean implementation. Keeps socket.io optional.
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true) as UrlWithParsedQuery;
    return handle(req, res, parsedUrl);
  });

  // Try to load socket.io dynamically; keep typings permissive here since the module may be absent
  type SocketMiddleware = (socket: unknown, next: (err?: unknown) => void) => void | Promise<void>;
  type SocketServerLike = {
    use?: (fn: SocketMiddleware) => void;
    on?: (ev: string, cb: (socket: unknown) => void) => void;
  } | null;

  let io: SocketServerLike = null;
  try {
    const mod = await import('socket.io').catch(() => null);
    const ServerCtor = (mod as unknown as Record<string, unknown>)?.Server ?? (mod as unknown as Record<string, unknown>)?.default ?? null;
    if (typeof ServerCtor === 'function') {
      io = new (ServerCtor as unknown as new (srv: http.Server, opts?: unknown) => SocketServerLike)(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
    }
  } catch {
    io = null;
  }

  if (io) {
    // expose globally for compatibility
    try {
      (globalThis as unknown as { __io?: SocketServerLike }).__io = io;
    } catch {
      // ignore attach errors
    }

    // No auth: skip attaching next-auth to socket.io

    // Basic connection handler
    try {
      if (io && typeof io.on === 'function') {
        io.on('connection', (socket: unknown) => {
          const sock = socket as { on?: (ev: string, cb: (...args: unknown[]) => void) => void; join?: (r: string) => void };
          if (typeof sock.on === 'function') {
            sock.on('join', (...args: unknown[]) => {
              const room = String(args[0] ?? '');
              if (typeof sock.join === 'function') sock.join(room);
            });
              // forward scoreboard commands to displays
              sock.on('scoreboard:cmd', (...args: unknown[]) => {
                try {
                  const ioServer = io as unknown as { to?: (room: string) => { emit: (ev: string, payload?: unknown) => void } };
                  const payload = args[0];
                  // broadcast to displays room
                  ioServer.to?.('displays').emit('scoreboard:cmd', payload);
                } catch {
                  // ignore
                }
              });
          }
        });
      }
    } catch {
      // ignore
    }
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, () => console.log(`> Ready on http://localhost:${port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
