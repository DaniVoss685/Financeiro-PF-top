import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, Bell, Shield, User } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const location = useLocation();

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User, path: '/settings/profile' },
    { id: 'notifications', name: 'Notificações', icon: Bell, path: '/settings/notifications' },
    { id: 'security', name: 'Segurança', icon: Shield, path: '/settings/security' },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto pb-24 md:pb-10">
      <header>
        <h1 className="text-3xl font-display font-semibold tracking-tight text-gradient-gold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas preferências e dados do sistema</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Side Nav */}
        <aside className="lg:w-64 shrink-0 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          <nav className="flex lg:flex-col gap-1 p-1 bg-muted/20 rounded-2xl border border-border/50">
            {tabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
           <Outlet />
        </div>
      </div>
    </div>
  );
}
