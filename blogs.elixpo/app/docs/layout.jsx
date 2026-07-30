import AppShell from '../../src/components/AppShell';
import DocsSidebar from '../../src/components/docs/DocsSidebar';
import DocsSearch from '../../src/components/docs/DocsSearch';

export default function DocsLayout({ children }) {
  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-end mb-4">
          <DocsSearch />
        </div>
        <div className="flex gap-8">
          <DocsSidebar />
          <div className="flex-1 min-w-0 flex gap-8">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
