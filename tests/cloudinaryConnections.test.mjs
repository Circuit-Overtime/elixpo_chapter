import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCloudinaryUrl } from '../lib/cloudinaryConnections.js';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '../lib/integrationSecrets.js';

test('Cloudinary environment URLs are parsed without exposing alternate schemes', () => {
  assert.deepEqual(
    parseCloudinaryUrl('cloudinary://12345:s3cr%40t@creator-cloud'),
    { cloudName: 'creator-cloud', apiKey: '12345', apiSecret: 's3cr@t' },
  );
  assert.throws(() => parseCloudinaryUrl('https://12345:secret@creator-cloud'), /cloudinary:\/\//);
  assert.throws(() => parseCloudinaryUrl('cloudinary://creator-cloud'), /API key/);
});

test('integration secrets round-trip through authenticated encryption', async () => {
  const previous = process.env.CLOUDINARY_CONNECTION_ENCRYPTION_KEY;
  process.env.CLOUDINARY_CONNECTION_ENCRYPTION_KEY = 'test-only-connection-key';
  try {
    const encrypted = await encryptIntegrationSecret('creator-secret');
    assert.match(encrypted, /^v1\./);
    assert.equal(encrypted.includes('creator-secret'), false);
    assert.equal(await decryptIntegrationSecret(encrypted), 'creator-secret');
  } finally {
    if (previous === undefined) delete process.env.CLOUDINARY_CONNECTION_ENCRYPTION_KEY;
    else process.env.CLOUDINARY_CONNECTION_ENCRYPTION_KEY = previous;
  }
});
