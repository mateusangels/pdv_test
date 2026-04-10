import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, FileText, CreditCard, Settings, User, LogOut, Monitor, Box, Receipt, PanelLeftClose, PanelLeft, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Monitor, label: 'PDV', path: '/pdv' },
  { icon: Receipt, label: 'Vendas', path: '/vendas' },
  { icon: Box, label: 'Produtos', path: '/produtos' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: ShoppingCart, label: 'Fiados', path: '/fiados' },
  { icon: CreditCard, label: 'Pagamentos', path: '/pagamentos' },
  { icon: FileText, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const AppSidebar = ({ collapsed, onToggle, mobileOpen, onMobileToggle }: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}) => {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileToggle} />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-[#0f1729] flex flex-col z-50 transition-all duration-200
          ${mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full w-56'}
          md:translate-x-0 ${collapsed ? 'md:w-[60px]' : 'md:w-56'}
        `}
      >
        {/* Logo + close mobile */}
        <div className={`flex items-center justify-center border-b border-white/5 overflow-hidden ${collapsed ? 'md:px-1' : 'md:px-2'} px-2 py-0 relative`}>
          <img
            src={collapsed && !mobileOpen ? '/LogoS_Branca.png' : '/logo_branca.png'}
            alt="NEXOR"
            className={collapsed && !mobileOpen ? 'w-full max-w-[40px]' : 'w-full scale-150'}
            style={{ display: 'block' }}
          />
          <button onClick={onMobileToggle} className="absolute right-2 top-2 text-white/50 hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isCollapsedDesktop = collapsed && !mobileOpen;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (mobileOpen) onMobileToggle(); }}
                title={isCollapsedDesktop ? item.label : undefined}
                className={`flex items-center rounded-md text-[13px] transition-colors ${isCollapsedDesktop ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'} ${isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <item.icon className="w-[17px] h-[17px] shrink-0" />
                {!isCollapsedDesktop && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/5 px-1.5 py-2 space-y-1">
          <button
            onClick={onToggle}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`hidden md:flex items-center rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors w-full ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2 text-[13px]'}`}
          >
            {collapsed ? <PanelLeft className="w-[17px] h-[17px]" /> : <PanelLeftClose className="w-[17px] h-[17px]" />}
            {!collapsed && <span>Recolher</span>}
          </button>

          <div className={`flex items-center ${collapsed && !mobileOpen ? 'justify-center py-1' : 'gap-2 px-2 py-1'}`}>
            <Link
              to="/perfil"
              onClick={() => { if (mobileOpen) onMobileToggle(); }}
              title={collapsed ? profile?.nome || 'Perfil' : undefined}
              className={`flex items-center text-white/50 hover:text-white/80 transition-colors ${collapsed && !mobileOpen ? '' : 'gap-2 flex-1'}`}
            >
              <User className="w-4 h-4 shrink-0" />
              {(!(collapsed) || mobileOpen) && <span className="truncate text-xs">{profile?.nome || 'Usuário'}</span>}
            </Link>
            {(!(collapsed) || mobileOpen) && (
              <button onClick={signOut} className="text-white/30 hover:text-white/60 transition-colors p-1" title="Sair">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
