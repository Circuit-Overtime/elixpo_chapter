'use client';

import { use } from 'react';
import HandlePage from '../../src/views/HandlePage';

export default function CatchAllClient({ params }) {
  const { path } = use(params);
  return <HandlePage path={path} />;
}
