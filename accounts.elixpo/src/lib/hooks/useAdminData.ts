'use client';

import { useState, useEffect } from 'react';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalApps: number;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  lastUpdated: string;
  topApps: Array<{
    id: string;
    name: string;
    requests: number;
    users: number;
    errorRate: number;
  }>;
  requestTrend: Array<{
    date: string;
    requests: number;
    errors: number;
  }>;
  recentUsers?: Array<{
    id: string;
    email: string;
    is_admin: number;
    is_active: number;
    created_at: string;
    email_verified: number;
  }>;
  recentApps?: Array<{
    id: string;
    client_id: string;
    client_name: string;
    owner_id: string;
    created_at: string;
  }>;
}

export function useDashboardStats(timeRange: string = '7d') {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/dashboard/stats?range=${timeRange}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  return { stats, loading, error };
}

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  emailVerified: boolean;
  appsCount: number;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useUsers(page: number = 1, search: string = '') {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const responseData = await response.json();
        setData(responseData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, search]);

  return { data, loading, error };
}

export interface App {
  id: string;
  name: string;
  owner: { id: string; email: string };
  status: 'active' | 'suspended';
  createdAt: string;
  requests: number;
  users: number;
  lastUsed: string;
  requestCount: number;
}

export interface AppsResponse {
  apps: App[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useApps(page: number = 1, search: string = '') {
  const [data, setData] = useState<AppsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/apps?page=${page}&search=${encodeURIComponent(search)}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch apps');
        }

        const responseData = await response.json();
        setData(responseData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [page, search]);

  return { data, loading, error };
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface LogsResponse {
  logs: AdminLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useAdminLogs(page: number = 1, search: string = '') {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/logs?page=${page}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }

        const responseData = await response.json();
        const filtered = search
          ? {
              ...responseData,
              logs: (responseData.logs || []).filter((l: AdminLog) =>
                l.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
                l.action.toLowerCase().includes(search.toLowerCase()) ||
                l.resourceType?.toLowerCase().includes(search.toLowerCase())
              ),
            }
          : responseData;
        setData(filtered);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page, search]);

  return { data, loading, error };
}
