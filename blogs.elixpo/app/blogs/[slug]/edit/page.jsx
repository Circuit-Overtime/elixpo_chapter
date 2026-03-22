'use client';

import { use } from 'react';
import WritePage from '../../../../src/pages/WritePage';

export default function EditBlog({ params }) {
  const { slug } = use(params);
  return <WritePage slug={slug} />;
}
