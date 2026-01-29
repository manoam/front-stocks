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
  '/import-export': 'Import / Export',
  '/settings': 'Paramètres',
};

export default function Layout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Stock Manager';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />

        <main className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
