/* Minimal Socket server (TypeScript) — development helper. */
import http from 'http';
import { Server } from 'socket.io';
// auth removed: socket connections no longer require NextAuth token

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('socket server');
});

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});


type HandshakeLike = { headers?: Record<string, unknown> } | undefined;
type SocketLike = { handshake?: HandshakeLike; data?: Record<string, unknown>; on?: (ev: string, cb: (...args: unknown[]) => void) => void; join?: (r: string) => void; id?: string };

// no-op auth middleware for sockets; all connections are treated as anonymous/public
io.use((socket: SocketLike, next) => {
  socket.data = socket.data ?? {};
  socket.data.user = null;
  return next();
});

io.on('connection', (socket: SocketLike) => {
  console.log('socket connected', socket.id, 'user=', (socket.data as unknown as Record<string, unknown>)?.['user'] ?? 'anon');
  socket.on?.('join', (...args: unknown[]) => {
    const room = String(args[0] ?? '');
    socket.join?.(room);
  });
  socket.on?.('disconnect', () => { });
});

// expose globally for scheduler compatibility
(global as unknown as { __io?: unknown }).__io = io;

const port = Number(process.env.SOCKET_PORT || 3002);
server.listen(port, () => console.log('Socket server listening on', port));
