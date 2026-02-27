import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthContext } from '@/context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/transactions', label: 'Transactions', icon: '📋', exact: false },
  { path: '/upload', label: 'Upload', icon: '⬆️', exact: false },
  { path: '/rules', label: 'My Rules', icon: '⚙️', exact: false },
];

export function Sidebar() {
  const { profile, role, signOut } = useAuthContext();

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <span className="text-lg font-bold text-slate-100">CashMosaic</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Personal Finance</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )
            }
          >
            <span className="text-base">🛡️</span>
            Admin
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-sm font-medium text-indigo-400">
            {(profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-left text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
