import { createServer, type Server } from 'node:http';
import type { Redis } from 'ioredis';

/**
 * Minimal /health (liveness) + /ready (readiness — Redis reachable)
 * endpoints, same contract as apps/api's HealthController, without pulling
 * in a full web framework for a two-route worker.
 */
export function startHealthServer(port: number, redis: Redis): Server {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (req.url === '/ready') {
      redis
        .ping()
        .then(() => {
          res
            .writeHead(200, { 'content-type': 'application/json' })
            .end(JSON.stringify({ status: 'ok' }));
        })
        .catch((err: unknown) => {
          res
            .writeHead(503, { 'content-type': 'application/json' })
            .end(JSON.stringify({ status: 'error', detail: String(err) }));
        });
      return;
    }
    res.writeHead(404).end();
  });

  server.listen(port);
  return server;
}
