import { useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificacoesModal, useNotifCount } from './NotificacoesModal';

export const AppHeader = ({ onMobileMenuToggle }: { onMobileMenuToggle: () => void }) => {
  const { profile, role } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = useNotifCount();

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-3 md:px-6 gap-2 md:gap-4">
        {/* Hamburger mobile */}
        <button onClick={onMobileMenuToggle} className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <div className="relative flex-1 max-w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou código..."
              className="pl-9 h-8 md:h-9 text-sm bg-muted/50 border-transparent focus:border-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button
            id="btn-notificacoes"
            onClick={() => setNotifOpen(true)}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Abrir notificações"
          >
            <Bell className="w-[18px] h-[18px]" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium truncate max-w-[120px]">{profile?.nome || 'Usuário'}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{role || 'admin'}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <NotificacoesModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
};
