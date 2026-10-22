import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createPreview, validateInput } from './preview.mjs';

test('input rejects paths, extra keys and non-objects', () => {
  for (const value of [null, [], 'article', { article: '../secret' }, { article: '' }, { other: true }]) {
    assert.throws(() => validateInput(value), { code: 'INVALID_INPUT' });
  }
  validateInput({});
  validateInput({ article: 'asdf-extras-introduction' });
});

test('preview selection, HTTP proxy, errors, websocket upgrade and cleanup', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zenn-canvas-test-'));
  t.after(() => rm(root, { recursive: true }));
  await mkdir(path.join(root, 'articles'));
  await writeFile(path.join(root, 'articles', 'first.md'), '# First');
  const upstream = http.createServer((request, response) => {
    response.end(`zenn:${request.url}`);
  });
  upstream.on('upgrade', (_request, socket) => {
    socket.end('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  let stopped = false;
  let health = null;
  const preview = await createPreview(root, {
    launch: async () => ({
      port: upstream.address().port,
      error: () => health,
      stop: async () => {
        stopped = true;
        await new Promise((resolve) => upstream.close(resolve));
      },
    }),
  });
  t.after(() => preview.close());
  const origin = new URL(preview.url).origin;
  assert.match(await (await fetch(preview.url)).text(), /Zenn CLI Preview/);
  assert.deepEqual((await preview.state()).articles, ['first']);
  await preview.select({ article: 'first' });
  assert.equal((await preview.state()).article, 'first');
  await assert.rejects(preview.select({ article: 'missing' }), { code: 'ARTICLE_NOT_FOUND' });
  assert.equal((await preview.state()).article, 'first');
  const before = (await preview.state()).revision;
  assert.equal((await preview.refresh()).revision, before + 1);
  assert.equal(await (await fetch(`${origin}/articles/first`)).text(), 'zenn:/articles/first');
  const mutation = (body, extra = {}) => fetch(`${origin}/__zenn_canvas/select`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...extra }, body,
  });
  assert.equal((await mutation('{}', { Origin: 'https://example.com' })).status, 403);
  assert.equal((await mutation('{')).status, 400);
  assert.equal((await mutation('x'.repeat(2049))).status, 400);
  assert.equal((await mutation('{"article":"../secret"}')).status, 400);
  assert.equal((await mutation('{"article":"missing"}')).status, 400);
  assert.equal((await mutation('{}')).status, 200);
  assert.equal((await preview.state()).article, null);
  await new Promise((resolve, reject) => {
    const request = http.request(origin, {
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', Origin: origin },
    });
    request.on('upgrade', (response, socket) => {
      assert.equal(response.statusCode, 101);
      socket.destroy();
      resolve();
    });
    request.on('error', reject);
    request.end();
  });
  health = 'CLI stopped unexpectedly';
  assert.equal((await preview.state()).error, health);
  assert.equal((await fetch(`${origin}/articles`)).status, 503);
  t.after(() => assert.equal(stopped, true));
});
