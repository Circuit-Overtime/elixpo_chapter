
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { baseOptions } from '@/lib/layout.shared';
import { ReactNode } from 'react';

export default function Layout({ children }: {children: ReactNode}) {
  return (
    <DocsLayout 
     tree={source.pageTree} {...baseOptions()} sidebar={{defaultOpenLevel: 1}} >
      <div className='px-0 md:px-44'>
        {children}
      </div>
    </DocsLayout>
  );
}

