import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, FileText, CreditCard, Settings, User, Package, LogOut, Plus, Monitor, Box, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Monitor, label: 'PDV', path: '/pdv' },
  { icon: Receipt, label: 'Vendas', path: '/vendas' },
  { icon: Box, label: 'Produtos', path: '/produtos' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: ShoppingCart, label: 'Fiados', path: '/fiados' },
  { icon: CreditCard, label: 'Pagamentos', path: '/pagamentos' },
  { icon: FileText, label: 'Relatórios', path: '/relatorios' },
  { icon: Package, label: 'Assinatura', path: '/assinatura' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 gradient-primary flex flex-col z-50">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground">Super Mercado Pereira</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Gestão de Fiados</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2">
        <Link to="/fiados/novo">
          <Button className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground gap-2 rounded-lg">
            <Plus className="w-4 h-4" />
            Novo Fiado
          </Button>
        </Link>
        <div className="flex items-center gap-2 p-2">
          <Link to="/perfil" className="flex items-center gap-2 flex-1 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors text-sm">
            <User className="w-4 h-4" />
            <span className="truncate text-xs">{profile?.nome || 'Usuário'}</span>
          </Link>
          <button onClick={signOut} className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
