import { X, Menu, CalendarDays, LayoutDashboard, ClipboardList, RefreshCw } from 'lucide-react';

export type Page = 'dashboard' | 'appointments' | 'bookings';

type NavItem = {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'appointments', label: 'Agenda', icon: CalendarDays },
  { id: 'bookings', label: 'Agendamentos', icon: ClipboardList },
];

type SidebarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export default function Sidebar({ currentPage, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#1A1A1A' }}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: '#2e2e2e' }}>
          <img src="/logo_lucas.png" alt="Logo Dr. Lucas Monteiro" className="w-10 h-10 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-normal" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>DR.</span>
            <span className="text-sm font-semibold text-white leading-tight">Lucas Monteiro</span>
            <span className="text-[10px]" style={{ color: '#7a7060' }}>Odontologia</span>
          </div>
          <button onClick={onCloseMobile} className="ml-auto lg:hidden text-stone-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onCloseMobile(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active ? 'text-[#1A1A1A]' : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? { backgroundColor: '#C9A84C' } : {}}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t" style={{ borderColor: '#2e2e2e' }}>
          <p className="text-xs" style={{ color: '#4a4a3a' }}>Painel interno · v2.0</p>
        </div>
      </aside>
    </>
  );
}

type TopbarProps = {
  onMenuClick: () => void;
  title: string;
  onRefresh: () => void;
  refreshing: boolean;
};

export function Topbar({ onMenuClick, title, onRefresh, refreshing }: TopbarProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header
      className="sticky top-0 z-20 border-b h-16 flex items-center justify-between px-4 lg:px-6"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderColor: '#e8e3da' }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-stone-500 hover:text-stone-900">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-stone-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-stone-400 capitalize">{dateStr}</span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all disabled:opacity-60"
          title="Atualizar dados"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>
    </header>
  );
}
