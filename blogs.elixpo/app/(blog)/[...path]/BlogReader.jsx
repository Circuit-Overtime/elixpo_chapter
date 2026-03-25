'use client';

import { use } from 'react';

export default function BlogReader({ params }) {
  const { path } = use(params);

  if (!path || path.length === 0) {
    return <div>Not found</div>;
  }

  const first = path[0];
  const isHandle = first.startsWith('@');

  let handle = null;
  let collection = null;
  let slug = null;
  let slugid = null;

  if (isHandle) {
    handle = first.slice(1);
    if (path.length === 2) {
      slug = path[1];
    } else if (path.length === 3) {
      collection = path[1];
      slug = path[2];
    }
  } else if (path.length === 1) {
    slugid = first;
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#888] text-sm">
          {isHandle && (
            <>
              <span className="text-[#9b7bf7]">@{handle}</span>
              {collection && <span> / {collection}</span>}
              {slug && <span> / {slug}</span>}
            </>
          )}
          {slugid && (
            <span>Short link: <span className="text-[#9b7bf7]">{slugid}</span></span>
          )}
        </p>
        <p className="text-[#555] text-xs mt-2">Blog reader coming soon</p>
      </div>
    </div>
  );
}
