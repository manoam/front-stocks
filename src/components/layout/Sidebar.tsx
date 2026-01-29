import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  Users,
  MapPin,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  ChevronRight,
  Database,
  Boxes,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  iconBgDark: string;
  children?: { name: string; href: string; icon?: React.ElementType; iconColor?: string }[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
    iconBgDark: 'dark:bg-blue-900/30',
  },
  {
    name: 'Catalogue',
    icon: Database,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-100',
    iconBgDark: 'dark:bg-violet-900/30',
    children: [
      { name: 'Produits', href: '/products', icon: Package, iconColor: 'text-violet-500' },
      { name: 'Fournisseurs', href: '/suppliers', icon: Users, iconColor: 'text-pink-500' },
      { name: 'Sites', href: '/sites', icon: MapPin, iconColor: 'text-rose-500' },
    ],
  },
  {
    name: 'Inventaire',
    icon: Boxes,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-100',
    iconBgDark: 'dark:bg-emerald-900/30',
    children: [
      { name: 'Stocks', href: '/stocks', icon: Warehouse, iconColor: 'text-emerald-500' },
      { name: 'Mouvements', href: '/movements', icon: ArrowLeftRight, iconColor: 'text-teal-500' },
    ],
  },
  {
    name: 'Commandes',
    href: '/orders',
    icon: ShoppingCart,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100',
    iconBgDark: 'dark:bg-orange-900/30',
  },
  {
    name: 'Import/Export',
    href: '/import-export',
    icon: FileSpreadsheet,
    iconColor: 'text-cyan-500',
    iconBg: 'bg-cyan-100',
    iconBgDark: 'dark:bg-cyan-900/30',
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Catalogue', 'Inventaire']);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const isChildActive = (children?: { name: string; href: string }[]) => {
    if (!children) return false;
    return children.some((child) => location.pathname === child.href);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-md">
          <Warehouse className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Stock Manager</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Gestion de stock</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            // Item avec enfants (groupe)
            if (item.children) {
              const isExpanded = expandedGroups.includes(item.name);
              const hasActiveChild = isChildActive(item.children);

              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      hasActiveChild
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg} ${item.iconBgDark}`}>
                        <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                      </div>
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Enfants */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                              isActive
                                ? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                            }`
                          }
                        >
                          {child.icon && (
                            <child.icon className={`h-4 w-4 ${child.iconColor || 'text-gray-400'}`} />
                          )}
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // Item simple
            return (
              <NavLink
                key={item.name}
                to={item.href!}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`
                }
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg} ${item.iconBgDark}`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-amber-500" />
            )}
          </div>
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
            }`
          }
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
            <Settings className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </div>
          Paramètres
        </NavLink>

        {/* User info */}
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            AD
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Admin</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">admin@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
