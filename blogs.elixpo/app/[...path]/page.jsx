export const runtime = 'edge';

import CatchAllClient from './client';

export default function CatchAllHandle({ params }) {
  return <CatchAllClient params={params} />;
}
