'use client';

import { use } from 'react';
import HandlePage from '../../src/pages/HandlePage';

export default function CatchAllHandle({ params }) {
  const { path } = use(params);
  return <HandlePage path={path} />;
}
