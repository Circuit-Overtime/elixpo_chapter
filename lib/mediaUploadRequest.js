export async function readUploadRequest(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    const formData = await request.formData();
    return {
      file: formData.get('file'),
      blogId: formData.get('blogId'),
      orgId: formData.get('orgId'),
      mediaType: formData.get('type') || 'image',
      requestedUploadId: String(formData.get('uploadId') || ''),
      fields: [...formData.keys()],
      transport: 'multipart',
    };
  }

  if (contentType.toLowerCase().startsWith('image/')) {
    const bytes = await request.arrayBuffer();
    return {
      file: {
        type: contentType.split(';', 1)[0].trim().toLowerCase(),
        size: bytes.byteLength,
        arrayBuffer: async () => bytes,
      },
      blogId: request.headers.get('x-lix-blog-id') || '',
      orgId: request.headers.get('x-lix-org-id') || '',
      mediaType: request.headers.get('x-lix-media-type') || 'image',
      requestedUploadId: request.headers.get('x-lix-upload-id') || '',
      fields: [],
      transport: 'raw',
    };
  }

  return { file: null, blogId: '', orgId: '', mediaType: 'image', requestedUploadId: '', fields: [], transport: 'unknown' };
}
