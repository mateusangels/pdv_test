import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(prev => !prev)}
      />
      <div className={`transition-all duration-200 ml-0 ${collapsed ? 'md:ml-[60px]' : 'md:ml-56'}`}>
        <AppHeader onMobileMenuToggle={() => setMobileOpen(prev => !prev)} />
        <main className="p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
