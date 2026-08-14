import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Briefcase,
  LayoutDashboard,
  LogOut,
  Menu,
  Tags,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { api, clearToken } from '../lib/api';
import { Button, Money } from './ui';

const TABS = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Giao dịch', icon: ArrowLeftRight },
  { to: '/debts', label: 'Nợ', icon: Wallet },
  { to: '/people', label: 'Người', icon: Users },
  { to: '/projects', label: 'Công việc', icon: Briefcase },
  { to: '/categories', label: 'Danh mục', icon: Tags },
];

export function Layout({
  children,
  onLoggedOut,
}: {
  children: React.ReactNode;
  onLoggedOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const current = TABS.find((t) => (t.end ? pathname === t.to : pathname.startsWith(t.to)));

  // Số dư luôn hiện trên đầu — con số quan trọng nhất, không phải bấm vào đâu để xem.
  const balance = useQuery({
    queryKey: ['overview', ''],
    queryFn: async () =>
      (await api.get<{ cash: { balance: number } }>('/reports/overview')).data,
  });

  const logout = () => {
    clearToken();
    onLoggedOut();
  };

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-0.5">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-soft text-brand-ink'
                : 'text-muted hover:bg-canvas hover:text-ink'
            }`
          }
        >
          <t.icon size={17} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      {/* Cột trái cố định trên màn rộng */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface p-3 lg:flex">
        <Brand />
        <div className="mt-4 flex-1">{nav()}</div>
        <Button variant="ghost" className="justify-start" onClick={logout}>
          <LogOut size={16} /> Đăng xuất
        </Button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <h1 className="hidden text-base font-semibold lg:block">
              {current?.label ?? 'Sổ thu chi'}
            </h1>

            <div className="ml-auto flex items-center gap-2 rounded-lg bg-canvas px-3 py-1.5">
              <span className="text-[11px] font-medium text-muted">Số dư</span>
              <span className="text-sm font-semibold">
                {balance.data ? (
                  <Money value={balance.data.cash.balance} />
                ) : (
                  <span className="text-faint">…</span>
                )}
                <span className="ml-0.5 text-xs font-normal text-faint">đ</span>
              </span>
            </div>
          </div>

          {menuOpen && (
            <div className="border-t border-line p-3 lg:hidden">
              {nav(() => setMenuOpen(false))}
              <Button variant="ghost" className="mt-1 w-full justify-start" onClick={logout}>
                <LogOut size={16} /> Đăng xuất
              </Button>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-[1400px] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
        <Wallet size={17} />
      </span>
      {!compact && <span className="font-semibold">Sổ thu chi</span>}
    </div>
  );
}
