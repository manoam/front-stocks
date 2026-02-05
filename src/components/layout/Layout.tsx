import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Produits',
  '/stocks': 'Stocks',
  '/movements': 'Mouvements',
  '/orders': 'Commandes',
  '/suppliers': 'Fournisseurs',
  '/sites': 'Sites',
  '/packs': 'Packs',
  '/import-export': 'Import / Export',
  '/settings': 'Paramètres',
};

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = pageTitles[location.pathname] || 'Stock Manager';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
