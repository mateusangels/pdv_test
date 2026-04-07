import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggle = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={handleToggle} />
      <div className={`transition-all duration-200 ${collapsed ? 'ml-[60px]' : 'ml-56'}`}>
        <AppHeader />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
