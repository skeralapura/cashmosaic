import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: React.ReactNode;
  showTopbar?: boolean;
}

export function AppShell({ children, showTopbar = false }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showTopbar && <Topbar />}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
