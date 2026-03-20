'use client';

import { useState, useEffect } from 'react';

interface UserRecord {
  id: number;
  elixpo_id: string;
  email: string;
  display_name: string;
  role: string;
  tier: string;
  is_active: number;
  url_count: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data: any = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateUser = async (id: number, field: string, value: string | boolean) => {
    const body: any = {};
    body[field] = value;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (data.error) alert(data.error);
    else fetchUsers();
  };

  if (loading) return <div className="text-text-disabled">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-text-primary mb-6">User Management</h1>

      <div className="glass-card p-6">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Name</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Email</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Tier</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Role</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">URLs</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Status</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Joined</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border-light">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-lime-dim border border-lime-border flex items-center justify-center text-xs font-semibold text-lime-main">
                      {u.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm">{u.display_name}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-text-secondary">{u.email}</td>
                <td className="py-3">
                  <select
                    value={u.tier}
                    onChange={(e) => updateUser(u.id, 'tier', e.target.value)}
                    className="input-field text-xs py-1 px-2 w-auto"
                  >
                    {['free', 'pro', 'business', 'enterprise'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, 'role', e.target.value)}
                    className="input-field text-xs py-1 px-2 w-auto"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="py-3 text-sm">{u.url_count}</td>
                <td className="py-3">
                  <span className={`badge ${u.is_active ? 'bg-[rgba(34,197,94,0.1)] text-[#4ade80] border border-[rgba(34,197,94,0.3)]' : 'bg-[rgba(239,68,68,0.1)] text-[#f87171] border border-[rgba(239,68,68,0.3)]'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-3 text-xs text-text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-3">
                  {u.is_active ? (
                    <button onClick={() => updateUser(u.id, 'is_active', false)} className="btn-danger text-xs">Disable</button>
                  ) : (
                    <button onClick={() => updateUser(u.id, 'is_active', true)} className="btn-glass text-xs">Enable</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
