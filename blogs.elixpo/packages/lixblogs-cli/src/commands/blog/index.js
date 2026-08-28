import { blocksToMarkdown } from '../../content/markdown.js';
import { BlogApiError } from '../../api/BlogClient.js';
import { metadataFromOptions, resolveMarkdownInput } from './input.js';
import { validateBlogInput } from '../../content/validate.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requireConfirmation } from '../../cli/contract.js';

export async function blogList({ client, options }) {
  return client.list({ status: options.status, limit: options.limit, cursor: options.cursor });
}

export async function blogGet({ client, id }) {
  if (!id) throw new Error('A blog ID is required.');
  const blog = await client.get(id);
  return { ...blog, markdown: blocksToMarkdown(blog.content) };
}

export async function blogCreate({ client, options, stdin }) {
  const source = await resolveMarkdownInput(options, { stdin });
  const input = { ...metadataFromOptions(options), content: source?.blocks || [] };
  validateBlogInput(input);
  if (options['dry-run']) return { dryRun: true, input, markdown: source?.markdown || '' };
  return client.create(input, { idempotencyKey: options['idempotency-key'] });
}

export async function blogEdit({ client, id, options, stdin }) {
  if (!id) throw new Error('A blog ID is required.');
  const current = await client.get(id);
  const source = await resolveMarkdownInput(options, { stdin, initial: blocksToMarkdown(current.content) });
  const input = { ...metadataFromOptions(options), ...(source ? { content: source.blocks } : {}) };
  if (!Object.keys(input).length) throw new Error('No blog changes were provided.');
  validateBlogInput(input);
  if (options['dry-run']) return { dryRun: true, id, etag: current.etag, input, markdown: source?.markdown };
  try {
    return await client.update(id, input, { etag: options.etag || current.etag });
  } catch (error) {
    if (!(error instanceof BlogApiError) || error.code !== 'revision_conflict') throw error;
    const server = await client.get(id);
    const directory = options.conflictDirectory || path.resolve('.lixblogs-conflicts');
    await fs.mkdir(directory, { recursive: true });
    const safeId = id.replace(/[^A-Za-z0-9._-]/g, '_');
    const localPath = path.join(directory, `${safeId}-local.json`);
    const serverPath = path.join(directory, `${safeId}-server.md`);
    await Promise.all([
      fs.writeFile(localPath, JSON.stringify(input, null, 2), { mode: 0o600 }),
      fs.writeFile(serverPath, blocksToMarkdown(server.content), { mode: 0o600 }),
    ]);
    error.details = { ...error.details, localPath, serverPath, serverEtag: server.etag };
    throw error;
  }
}

export async function blogPublish({ client, id, options }) {
  if (!id) throw new Error('A blog ID is required.');
  const current = await client.get(id);
  validateBlogInput(current, { publishing: true });
  if (options['dry-run']) return { dryRun: true, id, from: current.status, to: 'published' };
  requireConfirmation(options, 'Publishing this blog');
  return client.publish(id, { etag: options.etag || current.etag, idempotencyKey: options['idempotency-key'] });
}

export async function blogUnpublish({ client, id, options }) {
  if (!id) throw new Error('A blog ID is required.');
  const current = await client.get(id);
  if (options['dry-run']) return { dryRun: true, id, from: current.status, to: 'draft' };
  requireConfirmation(options, 'Unpublishing this blog');
  return client.unpublish(id, { etag: options.etag || current.etag });
}

export async function blogDelete({ client, id, options }) {
  if (!id) throw new Error('A blog ID is required.');
  if (!options.yes) throw new Error('Deletion requires --yes. Trash is the default; add --permanent for irreversible deletion.');
  const current = await client.get(id);
  if (options['dry-run']) return { dryRun: true, id, permanent: options.permanent };
  return client.delete(id, { etag: options.etag || current.etag, permanent: options.permanent });
}

export async function blogRestore({ client, id, options }) {
  if (!id) throw new Error('A blog ID is required.');
  const current = await client.get(id);
  if (options['dry-run']) return { dryRun: true, id, restoreTo: current.preDeleteStatus || 'draft' };
  requireConfirmation(options, 'Restoring this blog');
  return client.restore(id, { etag: options.etag || current.etag });
}
