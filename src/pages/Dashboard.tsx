import { useQuery } from '@tanstack/react-query';
import { Package, Users, MapPin, ShoppingCart, AlertTriangle, Euro } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import type { DashboardStats, StockMovement, Order } from '../types';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
      return res.data.data;
    },
  });

  const { data: recentMovements } = useQuery({
    queryKey: ['recent-movements'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: StockMovement[] }>('/dashboard/recent-movements');
      return res.data.data;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Order[] }>('/dashboard/pending-orders');
      return res.data.data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IN: 'Entrée',
      OUT: 'Sortie',
      TRANSFER: 'Transfert',
    };
    return labels[type] || type;
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, 'success' | 'danger' | 'info'> = {
      IN: 'success',
      OUT: 'danger',
      TRANSFER: 'info',
    };
    return variants[type] || 'default';
  };

  if (statsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Produits"
          value={stats?.totalProducts || 0}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Fournisseurs"
          value={stats?.totalSuppliers || 0}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Sites"
          value={stats?.totalSites || 0}
          icon={MapPin}
          color="green"
        />
        <StatsCard
          title="Commandes en cours"
          value={stats?.pendingOrders || 0}
          icon={ShoppingCart}
          color="yellow"
        />
        <StatsCard
          title="Alertes stock"
          value={stats?.highRiskProducts || 0}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Valeur stock"
          value={formatCurrency(stats?.totalStockValue || 0)}
          icon={Euro}
          color="blue"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers mouvements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentMovements?.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={getMovementTypeBadge(movement.type)}>
                      {getMovementTypeLabel(movement.type)}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.product.reference}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {movement.quantity} unités
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(movement.movementDate)}
                  </span>
                </div>
              )) || (
                <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Aucun mouvement récent</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes en attente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pendingOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {order.product.reference}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {order.supplier.name} - {order.quantity} unités
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning">En attente</Badge>
                    {order.expectedDate && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Prévu: {formatDate(order.expectedDate)}
                      </p>
                    )}
                  </div>
                </div>
              )) || (
                <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Aucune commande en attente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
