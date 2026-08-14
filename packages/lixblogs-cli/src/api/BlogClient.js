import { randomUUID } from 'node:crypto';

export class BlogApiError extends Error {
  constructor(code, message, { status, requestId, details } = {}) {
    super(message);
    this.name = 'BlogApiError';
    this.code = code || 'api_error';
    this.status = status || 0;
    this.requestId = requestId || null;
    this.details = details || null;
  }
}

async function parseResponse(response) {
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok || payload?.error) {
    throw new BlogApiError(
      payload?.error?.code || `http_${response.status}`,
      payload?.error?.message || `LixBlogs returned HTTP ${response.status}.`,
      {
        status: response.status,
        requestId: payload?.error?.requestId || response.headers.get('x-request-id'),
        details: payload?.error?.details,
      },
    );
  }
  return { payload, etag: response.headers.get('etag') };
}

export class BlogClient {
  constructor(authenticatedClient, { sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) } = {}) {
    this.http = authenticatedClient;
    this.sleep = sleep;
  }

  async request(path, options = {}) {
    const requestOptions = {
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...options.headers,
      },
    };
    const method = requestOptions.method || 'GET';
    const retryable = method === 'GET' || Boolean(requestOptions.headers['idempotency-key']);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.http.request(path, requestOptions);
        if (retryable && attempt === 0 && (response.status === 429 || response.status >= 500)) {
          const seconds = Math.min(2, Number.parseInt(response.headers.get('retry-after') || '1', 10) || 1);
          await this.sleep(seconds * 1000);
          continue;
        }
        return parseResponse(response);
      } catch (error) {
        if (!retryable || attempt > 0 || error instanceof BlogApiError) throw error;
        await this.sleep(250);
      }
    }
    throw new BlogApiError('request_failed', 'The LixBlogs request failed after retrying.');
  }

  async requireScopes(scopes) {
    if (typeof this.http.requireScopes === 'function') await this.http.requireScopes(scopes);
  }

  async list({ status = 'all', limit = 20, cursor } = {}) {
    await this.requireScopes(['lixblogs:blog:read']);
    const query = new URLSearchParams({ status, limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    return (await this.request(`/api/v1/blogs?${query}`)).payload;
  }

  async get(id) {
    await this.requireScopes(['lixblogs:blog:read']);
    const result = await this.request(`/api/v1/blogs/${encodeURIComponent(id)}`);
    return { ...result.payload.data, etag: result.etag || result.payload.data.etag };
  }

  async create(input, { idempotencyKey = randomUUID() } = {}) {
    await this.requireScopes(['lixblogs:blog:write']);
    return (await this.request('/api/v1/blogs', {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify(input),
    })).payload.data;
  }

  async update(id, input, { etag }) {
    await this.requireScopes(['lixblogs:blog:write']);
    return (await this.request(`/api/v1/blogs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'if-match': etag },
      body: JSON.stringify(input),
    })).payload.data;
  }

  async publish(id, { etag, idempotencyKey = randomUUID() }) {
    await this.requireScopes(['lixblogs:blog:publish']);
    return (await this.request(`/api/v1/blogs/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      headers: { 'if-match': etag, 'idempotency-key': idempotencyKey },
    })).payload.data;
  }

  async unpublish(id, { etag }) {
    await this.requireScopes(['lixblogs:blog:publish']);
    return (await this.request(`/api/v1/blogs/${encodeURIComponent(id)}/unpublish`, {
      method: 'POST', headers: { 'if-match': etag },
    })).payload.data;
  }

  async delete(id, { etag, permanent = false }) {
    await this.requireScopes([
      'lixblogs:blog:delete',
      ...(permanent ? ['lixblogs:blog:delete:permanent'] : []),
    ]);
    return (await this.request(`/api/v1/blogs/${encodeURIComponent(id)}${permanent ? '?permanent=true' : ''}`, {
      method: 'DELETE',
      headers: {
        'if-match': etag,
        ...(permanent ? { 'x-confirm-permanent-delete': id } : {}),
      },
    })).payload.data;
  }

  async restore(id, { etag }) {
    await this.requireScopes(['lixblogs:blog:delete']);
    return (await this.request(`/api/v1/blogs/${encodeURIComponent(id)}/restore`, {
      method: 'POST', headers: { 'if-match': etag },
    })).payload.data;
  }
}
