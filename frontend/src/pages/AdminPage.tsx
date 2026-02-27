import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AppShell } from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useCategoryRules, useDeleteRule } from '@/hooks/useCategoryRules';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfile, UploadLog } from '@/lib/types';
import { formatDate } from '@/lib/formatters';
import { clsx } from 'clsx';

// ── Users Tab ──────────────────────────────────────────────

function UsersTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase.from('user_profiles').select('*').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'user' | 'admin' }) => {
      const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      showToast({ type: 'success', title: 'Role updated' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{users.length} users</p>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-1.5">
          + Create User
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700 bg-slate-800/50">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-700/30 table-row-hover">
                  <td className="px-4 py-3 text-slate-200">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{u.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.role === 'admin' ? '#6366F1' : '#64748B'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateRole.mutate({ id: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {u.role === 'admin' ? 'Demote' : 'Promote to Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const { register, handleSubmit, reset } = useForm<{
    email: string; password: string; fullName: string;
  }>();

  const create = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      // In production, this should call an Edge Function with service-role key.
      // For now, using admin API if available.
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name: fullName },
        email_confirm: true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showToast({ type: 'success', title: 'User created successfully' });
      reset();
      onClose();
    },
    onError: (err: Error) => {
      showToast({ type: 'error', title: 'Failed to create user', message: err.message });
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New User"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit(d => create.mutate(d))}
            disabled={create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Creating...' : 'Create User'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input {...register('fullName')} className="input" placeholder="Jane Smith" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input {...register('email', { required: true })} type="email" className="input" placeholder="jane@example.com" />
        </div>
        <div>
          <label className="label">Password *</label>
          <input {...register('password', { required: true, minLength: 6 })} type="password" className="input" placeholder="Min 6 characters" />
        </div>
      </div>
    </Modal>
  );
}

// ── Upload Logs Tab ────────────────────────────────────────

function UploadLogsTab() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin_upload_logs'],
    queryFn: async (): Promise<UploadLog[]> => {
      const { data, error } = await supabase
        .from('upload_logs')
        .select('*, account:accounts(name), user:user_profiles(email)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as UploadLog[];
    },
  });

  const statusColors = { success: '#22C55E', error: '#EF4444', partial: '#F59E0B' };

  return isLoading ? (
    <div className="flex justify-center py-8"><Spinner /></div>
  ) : (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-700 bg-slate-800/50">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Account</th>
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium text-center">Imported</th>
            <th className="px-4 py-3 font-medium text-center">Excluded</th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-slate-700/30 table-row-hover">
              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(log.created_at)}</td>
              <td className="px-4 py-3 text-slate-300 text-xs">{log.user?.email ?? '—'}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{log.account?.name ?? '—'}</td>
              <td className="px-4 py-3 text-slate-300 text-xs max-w-xs truncate" title={log.filename}>{log.filename}</td>
              <td className="px-4 py-3 text-center text-green-400">{log.rows_imported}</td>
              <td className="px-4 py-3 text-center text-slate-500">{log.rows_excluded}</td>
              <td className="px-4 py-3 text-center">
                <Badge color={statusColors[log.status]}>{log.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && (
        <p className="px-4 py-8 text-slate-500 text-sm text-center">No upload history yet.</p>
      )}
    </div>
  );
}

// ── Global Rules Tab ───────────────────────────────────────

function GlobalRulesTab() {
  const { data, isLoading } = useCategoryRules();
  const { data: categories = [] } = useCategories();
  const deleteRule = useDeleteRule();
  const { showToast } = useToast();
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newCategoryId) return;
    try {
      // Admin creates global rules by passing user_id = null
      const { error } = await supabase.from('category_rules').insert({
        user_id: null,
        category_id: newCategoryId,
        keyword: newKeyword.trim().toUpperCase(),
        priority: 0,
      });
      if (error) throw error;
      showToast({ type: 'success', title: 'Global rule created' });
      setNewKeyword('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="card p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">Global Keyword</label>
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value.toUpperCase())}
            className="input font-mono"
            placeholder="NEW MERCHANT"
            required
          />
        </div>
        <div className="w-48">
          <label className="label">Category</label>
          <select value={newCategoryId} onChange={e => setNewCategoryId(e.target.value)} className="input" required>
            <option value="">Select...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary flex-shrink-0">+ Add Global Rule</button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-slate-700/30">
            {(data?.globalRules ?? []).map(rule => {
              const cat = categoryMap[rule.category_id];
              return (
                <div key={rule.id} className="flex items-center gap-3 px-5 py-2.5 table-row-hover">
                  {cat && (
                    <span className="badge text-xs" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                      {cat.icon} {cat.name}
                    </span>
                  )}
                  <code className="text-sm text-slate-200 font-mono flex-1">{rule.keyword}</code>
                  <button
                    onClick={() => deleteRule.mutateAsync(rule.id).then(() => showToast({ type: 'success', title: 'Deleted' }))}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────

type AdminTab = 'users' | 'logs' | 'global_rules';

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users');

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'logs', label: 'Upload Logs', icon: '📋' },
    { id: 'global_rules', label: 'Global Rules', icon: '🌐' },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="page-header">Admin Panel</h1>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'logs' && <UploadLogsTab />}
        {tab === 'global_rules' && <GlobalRulesTab />}
      </div>
    </AppShell>
  );
}
