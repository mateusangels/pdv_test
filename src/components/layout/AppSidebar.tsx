import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, FileText, CreditCard, Settings, User, LogOut, Monitor, Box, Receipt, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

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

export const AppSidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#0f1729] flex flex-col z-50 transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-56'}`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-white/5 ${collapsed ? 'justify-center py-3 px-2' : 'gap-3 px-4 py-3'}`}>
        <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
          <img src="/logo.svg" alt="Logo" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-xs font-semibold text-white truncate">Oliver Soft Tech</h1>
            <p className="text-[9px] text-white/40 truncate">Soluções em Sistemas</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-md text-[13px] transition-colors ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'} ${isActive
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <item.icon className="w-[17px] h-[17px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/5 px-1.5 py-2 space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={`flex items-center rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors w-full ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2 text-[13px]'}`}
        >
          {collapsed ? <PanelLeft className="w-[17px] h-[17px]" /> : <PanelLeftClose className="w-[17px] h-[17px]" />}
          {!collapsed && <span>Recolher</span>}
        </button>

        {/* User */}
        <div className={`flex items-center ${collapsed ? 'justify-center py-1' : 'gap-2 px-2 py-1'}`}>
          <Link
            to="/perfil"
            title={collapsed ? profile?.nome || 'Perfil' : undefined}
            className={`flex items-center text-white/50 hover:text-white/80 transition-colors ${collapsed ? '' : 'gap-2 flex-1'}`}
          >
            <User className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate text-xs">{profile?.nome || 'Usuário'}</span>}
          </Link>
          {!collapsed && (
            <button onClick={signOut} className="text-white/30 hover:text-white/60 transition-colors p-1" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
