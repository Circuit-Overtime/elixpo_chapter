'use client';

import { useState, useEffect } from 'react';

interface AuditEntry {
  id: number;
  user_name: string | null;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?limit=50&offset=${(p - 1) * 50}`);
    const data: any = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-text-primary mb-6">Audit Log</h1>

      <div className="glass-card p-6">
        {loading ? (
          <div className="text-text-disabled text-sm">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Time</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">User</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Action</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Resource</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map((l) => (
                <tr key={l.id} className="border-t border-border-light">
                  <td className="py-2.5 text-xs text-text-muted">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="py-2.5 text-sm">{l.user_name || 'System'}</td>
                  <td className="py-2.5">
                    <code className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {l.action}
                    </code>
                  </td>
                  <td className="py-2.5 text-sm text-text-secondary">
                    {l.resource_type ? `${l.resource_type}:${l.resource_id}` : '-'}
                  </td>
                  <td className="py-2.5 text-xs text-text-muted max-w-[200px] truncate">{l.details || '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-8 text-center text-text-disabled text-sm italic">No audit logs</td></tr>
              )}
            </tbody>
          </table>
        )}

        <div className="flex gap-2 justify-center mt-4">
          {page > 1 && (
            <button onClick={() => setPage(page - 1)} className="btn-glass text-xs">Prev</button>
          )}
          <span className="text-xs text-text-disabled px-3 py-1.5">Page {page}</span>
          {logs.length === 50 && (
            <button onClick={() => setPage(page + 1)} className="btn-glass text-xs">Next</button>
          )}
        </div>
      </div>
    </div>
  );
}
