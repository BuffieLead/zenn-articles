import { fileURLToPath } from 'node:url';
import { createCanvas, CanvasError, joinSession } from '@github/copilot-sdk/extension';
import { createPreview, validateInput } from './preview.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const instances = new Map();
const inputSchema = {
  type: 'object',
  properties: { article: { type: 'string', description: 'Article slug without .md' } },
  additionalProperties: false,
};

async function guarded(handler) {
  try {
    return await handler();
  } catch (error) {
    throw new CanvasError(error.code || 'PREVIEW_ERROR', error.message);
  }
}

async function instance(ctx) {
  const pending = instances.get(ctx.instanceId);
  if (!pending) throw new CanvasError('NOT_OPEN', 'Open the preview canvas first.');
  return pending;
}

const canvas = createCanvas({
  id: 'zenn-articles-cli-preview',
  displayName: 'Zenn CLI Preview',
  description: 'Preview workspace articles with the local Zenn CLI and live reload.',
  inputSchema,
  open: (ctx) => guarded(async () => {
    validateInput(ctx.input);
    if (!instances.has(ctx.instanceId)) {
      const pending = createPreview(root, {
        log: (message) => session.log(message, { level: 'info' }),
      });
      instances.set(ctx.instanceId, pending);
      try {
        await pending;
      } catch (error) {
        instances.delete(ctx.instanceId);
        throw error;
      }
    }
    const preview = await instance(ctx);
    if (ctx.input.article !== undefined) await preview.select(ctx.input);
    await preview.state();
    return { url: preview.url, title: 'Zenn CLI Preview' };
  }),
  actions: [
    {
      name: 'status',
      description: 'Read CLI health, selected article, and available article slugs.',
      handler: (ctx) => guarded(async () => (await instance(ctx)).state()),
    },
    {
      name: 'select-article',
      description: 'Select an article by slug; omit article to show the article index.',
      inputSchema,
      handler: (ctx) => guarded(async () => (await instance(ctx)).select(ctx.input)),
    },
    {
      name: 'refresh',
      description: 'Reload the selected preview without restarting the CLI.',
      handler: (ctx) => guarded(async () => (await instance(ctx)).refresh()),
    },
  ],
  onClose: async (ctx) => {
    const pending = instances.get(ctx.instanceId);
    instances.delete(ctx.instanceId);
    if (pending) await (await pending).close();
  },
});

const session = await joinSession({ canvases: [canvas] });
