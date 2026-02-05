import { useQuery } from '@tanstack/react-query';
import { Package, Users, MapPin, ShoppingCart, AlertTriangle, Euro, TrendingUp, Boxes, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import StatsCard from '../components/dashboard/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import type {
  DashboardStats,
  StockMovement,
  Order,
  LowStockAlert,
  MovementsByDay,
  StockBySite,
  OrdersByMonth,
} from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  const { data: lowStockAlerts } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LowStockAlert[] }>('/dashboard/low-stock-alerts?threshold=5');
      return res.data.data;
    },
  });

  const { data: movementsByDay } = useQuery({
    queryKey: ['movements-by-day'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: MovementsByDay[] }>('/dashboard/movements-by-day?days=14');
      return res.data.data;
    },
  });

  const { data: stockBySite } = useQuery({
    queryKey: ['stock-by-site'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: StockBySite[] }>('/dashboard/stock-by-site');
      return res.data.data;
    },
  });

  const { data: ordersByMonth } = useQuery({
    queryKey: ['orders-by-month'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: OrdersByMonth[] }>('/dashboard/orders-by-month?months=6');
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

  // Préparer les données pour le pie chart stock neuf/occasion
  const stockConditionData = [
    { name: 'Neuf', value: stats?.totalStockNew || 0 },
    { name: 'Occasion', value: stats?.totalStockUsed || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid - Row 1: Main KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatsCard
          title="Produits"
          value={stats?.totalProducts || 0}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Stock total"
          value={stats?.totalItems || 0}
          subtitle={`${stats?.totalStockNew || 0} neuf / ${stats?.totalStockUsed || 0} occasion`}
          icon={Boxes}
          color="green"
        />
        <StatsCard
          title="Unités possibles"
          value={stats?.totalPossibleUnits || 0}
          subtitle="Stock / Qté par unité"
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard
          title="Valeur stock"
          value={formatCurrency(stats?.totalStockValue || 0)}
          icon={Euro}
          color="blue"
        />
        <StatsCard
          title="Alertes stock"
          value={stats?.highRiskProducts || 0}
          subtitle="Produits à risque"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Stats Grid - Row 2: Orders & Sites */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Commandes en cours"
          value={stats?.pendingOrders || 0}
          icon={ShoppingCart}
          color="yellow"
        />
        <StatsCard
          title="Reçues ce mois"
          value={stats?.completedOrdersThisMonth || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Fournisseurs"
          value={stats?.totalSuppliers || 0}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Sites de stockage"
          value={stats?.totalSites || 0}
          icon={MapPin}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mouvements par jour */}
        <Card>
          <CardHeader>
            <CardTitle>Mouvements (14 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={movementsByDay || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  labelFormatter={(value) => new Date(value as string).toLocaleDateString('fr-FR')}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="IN" name="Entrées" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="OUT" name="Sorties" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="TRANSFER" name="Transferts" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock par site */}
        <Card>
          <CardHeader>
            <CardTitle>Stock par site</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockBySite || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                  }}
                />
                <Legend />
                <Bar dataKey="totalNew" name="Neuf" fill="#10b981" stackId="stack" />
                <Bar dataKey="totalUsed" name="Occasion" fill="#f59e0b" stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Commandes par mois */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Commandes (6 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ordersByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                  }}
                />
                <Legend />
                <Bar dataKey="completed" name="Terminées" fill="#10b981" />
                <Bar dataKey="pending" name="En cours" fill="#f59e0b" />
                <Bar dataKey="cancelled" name="Annulées" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition stock neuf/occasion */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition du stock</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stockConditionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {stockConditionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid - Tables */}
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

      {/* Low Stock Alerts */}
      {lowStockAlerts && lowStockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertes stock bas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Cards */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700 lg:hidden">
              {lowStockAlerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{alert.reference}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{alert.assembly || '-'}</p>
                    </div>
                    <Badge variant={alert.supplyRisk === 'HIGH' ? 'danger' : alert.supplyRisk === 'MEDIUM' ? 'warning' : 'success'}>
                      {alert.supplyRisk || 'LOW'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className={`font-medium ${alert.total === 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      Stock: {alert.total} ({alert.totalNew}N / {alert.totalUsed}O)
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Unités: {alert.possibleUnits}
                    </span>
                  </div>
                  {(alert.primarySupplier || alert.leadTime) && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {alert.primarySupplier && <span>{alert.primarySupplier}</span>}
                      {alert.primarySupplier && alert.leadTime && <span> • </span>}
                      {alert.leadTime && <span>Délai: {alert.leadTime}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Référence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Unités possibles</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Risque</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Fournisseur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Délai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {lowStockAlerts.slice(0, 10).map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {alert.reference}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {alert.assembly || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${alert.total === 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {alert.total}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({alert.totalNew}N / {alert.totalUsed}O)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-gray-100">
                        {alert.possibleUnits}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={alert.supplyRisk === 'HIGH' ? 'danger' : alert.supplyRisk === 'MEDIUM' ? 'warning' : 'success'}>
                          {alert.supplyRisk || 'LOW'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {alert.primarySupplier || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {alert.leadTime || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
