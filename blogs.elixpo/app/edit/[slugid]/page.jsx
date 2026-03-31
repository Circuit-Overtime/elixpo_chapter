'use client';

import { use } from 'react';
import WritePage from '../../../src/pages/WritePage';

export default function EditBlog({ params }) {
  const { slugid } = use(params);
  return <WritePage slugid={slugid} />;
}
