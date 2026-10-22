import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';

const prefix = '/__zenn_canvas/';
const page = await readFile(new URL('./preview.html', import.meta.url));

function failure(code, message) {
  return Object.assign(new Error(message), { code });
}

export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some((key) => key !== 'article') ||
      (input.article !== undefined &&
        (typeof input.article !== 'string' || !/^[a-z0-9_-]+$/.test(input.article)))) {
    throw failure('INVALID_INPUT', 'Use an object with an optional article slug (a-z, 0-9, _ or -).');
  }
}

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

export async function startCli(root, log) {
  const require = createRequire(path.join(root, 'package.json'));
  let bin;
  try {
    const manifestPath = require.resolve('zenn-cli/package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    bin = path.resolve(path.dirname(manifestPath), manifest.bin.zenn);
  } catch (error) {
    throw failure('CLI_UNAVAILABLE', `Cannot load the local Zenn CLI. Run npm install. ${error.message}`);
  }
  // Zenn 0.4.x treats --port 0 as 8000, so reserve an OS-assigned port first.
  const reservation = net.createServer();
  const port = await listen(reservation);
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, [bin, 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stopped = false;
  let health = null;
  let output = '';
  const stop = async () => {
    stopped = true;
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    const actualPort = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(failure('CLI_TIMEOUT', `Zenn CLI did not become ready. ${output}`)), 20000);
      const finish = (callback, value) => {
        clearTimeout(timer);
        callback(value);
      };
      child.on('error', (error) => {
        health = `Zenn CLI failed: ${error.message}`;
        finish(reject, failure('CLI_FAILED', health));
      });
      child.on('exit', (code, signal) => {
        if (!stopped) health = `Zenn CLI exited (${signal || code}). ${output}`;
        finish(reject, failure('CLI_FAILED', health || 'Zenn CLI stopped.'));
      });
      const receive = (chunk) => {
        output = (output + chunk.toString()).slice(-12000);
        const match = output.match(/Preview:\s+http:\/\/(?:127\.0\.0\.1|localhost):(\d+)/);
        if (match) finish(resolve, Number(match[1]));
      };
      child.stdout.on('data', receive);
      child.stderr.on('data', receive);
    });
    const response = await fetch(`http://127.0.0.1:${actualPort}/api/articles`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw failure('CLI_FAILED', `Zenn CLI readiness check returned HTTP ${response.status}.`);
    await response.arrayBuffer();
    await log(`Zenn CLI preview listening on 127.0.0.1:${actualPort}`);
    return { port: actualPort, stop, error: () => health };
  } catch (error) {
    await stop();
    throw error;
  }
}

export async function createPreview(root, { log = async () => {}, launch = startCli } = {}) {
  const cli = await launch(root, log);
  let article = null;
  let revision = 0;
  const sockets = new Set();
  const articles = async () => (await readdir(path.join(root, 'articles'), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^[a-z0-9_-]+\.md$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -3)).sort();
  const state = async () => {
    const available = await articles();
    return { article, revision, articles: available, error: cli.error() };
  };
  const select = async (input) => {
    validateInput(input);
    const available = await articles();
    if (input.article !== undefined && !available.includes(input.article)) {
      throw failure('ARTICLE_NOT_FOUND', `Article not found: ${input.article}`);
    }
    article = input.article ?? null;
    revision += 1;
    return state();
  };
  const refresh = async () => {
    revision += 1;
    return state();
  };
  const send = (response, status, value) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(value));
  };
  let port;
  const validHost = (request) => request.headers.host === `127.0.0.1:${port}`;
  const server = http.createServer(async (request, response) => {
    try {
      if (!validHost(request)) return send(response, 403, { error: 'Invalid host.' });
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      if (url.pathname.startsWith(prefix)) {
        if (request.method === 'GET' && url.pathname === prefix) {
          response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'self'; base-uri 'none'",
          });
          return response.end(page);
        }
        if (request.method === 'GET' && url.pathname === `${prefix}state`) {
          return send(response, 200, await state());
        }
        if (request.method === 'POST' && url.pathname === `${prefix}select`) {
          if (request.headers.origin !== `http://127.0.0.1:${port}` ||
              request.headers['content-type'] !== 'application/json') {
            return send(response, 403, { error: 'Same-origin JSON requests only.' });
          }
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (Buffer.byteLength(body) > 2048) {
              throw failure('INVALID_INPUT', 'Request body is too large.');
            }
          }
          let input;
          try {
            input = JSON.parse(body);
          } catch {
            throw failure('INVALID_INPUT', 'Invalid JSON.');
          }
          return send(response, 200, await select(input));
        }
        return send(response, 404, { error: 'Unknown preview endpoint.' });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return send(response, 405, { error: 'Read-only preview.' });
      }
      if (cli.error()) return send(response, 503, { error: cli.error() });
      const upstream = http.request({
        hostname: '127.0.0.1', port: cli.port, path: request.url,
        method: request.method, headers: { ...request.headers, host: `127.0.0.1:${cli.port}` },
      }, (result) => {
        response.writeHead(result.statusCode, result.headers);
        result.pipe(response);
      });
      upstream.on('error', (error) => {
        if (response.headersSent) response.destroy(error);
        else send(response, 502, { error: `Zenn CLI connection failed: ${error.message}` });
      });
      request.on('aborted', () => upstream.destroy());
      response.on('close', () => upstream.destroy());
      upstream.end();
    } catch (error) {
      await log(`Zenn preview request failed: ${error.message}`);
      if (response.headersSent) response.destroy(error);
      else send(response, ['INVALID_INPUT', 'ARTICLE_NOT_FOUND'].includes(error.code) ? 400 : 500, { error: error.message });
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket, head) => {
    if (!validHost(request) || request.url !== '/' ||
        request.headers.origin !== `http://127.0.0.1:${port}` || cli.error()) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    const upstream = net.connect(cli.port, '127.0.0.1', () => {
      upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
      for (let i = 0; i < request.rawHeaders.length; i += 2) {
        upstream.write(`${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}\r\n`);
      }
      upstream.write('\r\n');
      upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on('error', (error) => socket.destroy(error));
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  try {
    await articles();
    port = await listen(server);
    return {
      url: `http://127.0.0.1:${port}${prefix}`,
      state, select, refresh,
      close: async () => {
        for (const socket of sockets) socket.destroy();
        await Promise.all([
          new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
          cli.stop(),
        ]);
      },
    };
  } catch (error) {
    await cli.stop();
    throw error;
  }
}
