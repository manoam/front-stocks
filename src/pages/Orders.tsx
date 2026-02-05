import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import OrderForm from '../components/forms/OrderForm';
import ReceiveOrderForm from '../components/forms/ReceiveOrderForm';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import type { Order, Supplier, ApiResponse, PaginatedResponse } from '../types';

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [receiveOrderId, setReceiveOrderId] = useState<string | null>(null);
  const toast = useToast();

  // URL params for filters
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const supplierFilter = searchParams.get('supplier') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    if (!('page' in updates)) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  // Fetch orders
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders', page, statusFilter, supplierFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (statusFilter) params.set('status', statusFilter);
      if (supplierFilter) params.set('supplierId', supplierFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get<PaginatedResponse<Order>>(`/orders?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch suppliers for filter
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Supplier[]>>('/suppliers');
      return res.data.data;
    },
  });

  // Filter orders by search (client-side)
  const filteredOrders = ordersData?.data.filter((order) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.product.reference.toLowerCase().includes(searchLower) ||
      order.product.description?.toLowerCase().includes(searchLower) ||
      order.supplier.name.toLowerCase().includes(searchLower) ||
      order.supplierRef?.toLowerCase().includes(searchLower) ||
      order.responsible?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">En cours</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Terminée</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const hasFilters = statusFilter || supplierFilter || startDate || endDate || search;

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const pagination = ordersData?.pagination;

  // Stats
  const pendingCount = filteredOrders?.filter(o => o.status === 'PENDING').length || 0;
  const completedCount = filteredOrders?.filter(o => o.status === 'COMPLETED').length || 0;
  const cancelledCount = filteredOrders?.filter(o => o.status === 'CANCELLED').length || 0;
  const totalQuantityPending = filteredOrders
    ?.filter(o => o.status === 'PENDING')
    .reduce((sum, o) => sum + o.quantity, 0) || 0;

  // Mobile card component
  const OrderCard = ({ order }: { order: Order }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            to={`/products/${order.productId}`}
            className="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {order.product.reference}
          </Link>
          {order.product.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {order.product.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon(order.status)}
          {getStatusBadge(order.status)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Fournisseur:</span>
          <p className="text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
            <Truck className="h-3 w-3 text-gray-400" />
            {order.supplier.name}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Quantité:</span>
          <p className="font-bold text-gray-900 dark:text-gray-100">
            {order.quantity}
            {order.receivedQty && order.receivedQty !== order.quantity && (
              <span className="ml-1 text-xs font-normal text-gray-500">(reçu: {order.receivedQty})</span>
            )}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Date commande:</span>
          <p className="text-gray-900 dark:text-gray-100 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400" />
            {formatDate(order.orderDate)}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Date prévue:</span>
          <p className="text-gray-900 dark:text-gray-100">
            {formatDate(order.expectedDate)}
          </p>
        </div>
        {order.destinationSite && (
          <div className="col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Destination:</span>
            <p className="text-gray-900 dark:text-gray-100">{order.destinationSite.name}</p>
          </div>
        )}
      </div>

      {order.status === 'PENDING' && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReceiveOrderId(order.id)}
            className="w-full"
          >
            <PackageCheck className="mr-1 h-4 w-4" />
            Réceptionner
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl dark:text-gray-100">
            Commandes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestion des commandes fournisseurs
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="sm:hidden">Ajouter</span>
          <span className="hidden sm:inline">Nouvelle commande</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {/* Search */}
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => updateParams({ search: e.target.value })}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            {/* Filters - horizontal scroll on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              <Select
                value={statusFilter}
                onChange={(e) => updateParams({ status: e.target.value })}
                className="min-w-[120px] sm:w-36"
              >
                <option value="">Statut</option>
                <option value="PENDING">En cours</option>
                <option value="COMPLETED">Terminées</option>
                <option value="CANCELLED">Annulées</option>
              </Select>

              <Select
                value={supplierFilter}
                onChange={(e) => updateParams({ supplier: e.target.value })}
                className="min-w-[130px] sm:w-40"
              >
                <option value="">Fournisseur</option>
                {suppliers?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => updateParams({ startDate: e.target.value })}
                className="h-10 min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                title="Date de début"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => updateParams({ endDate: e.target.value })}
                className="h-10 min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                title="Date de fin"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="whitespace-nowrap">
                <Filter className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-yellow-100 p-1.5 md:p-2 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">En cours</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-green-100 p-1.5 md:p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Terminées</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {completedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-red-100 p-1.5 md:p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Annulées</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {cancelledCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-blue-100 p-1.5 md:p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Package className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Qté attente</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalQuantityPending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <span className="ml-2 text-gray-500">Chargement...</span>
          </div>
        ) : filteredOrders?.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Aucune commande trouvée
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders?.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Mobile Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Orders Table */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>Liste des commandes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              Aucune commande trouvée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Fournisseur
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Qté
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Date prévue
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Réf. fournisseur
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders?.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30 ${
                        index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatDate(order.orderDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/products/${order.productId}`}
                          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {order.product.reference}
                        </Link>
                        {order.product.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                            {order.product.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-gray-100">
                            {order.supplier.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {order.quantity}
                        </span>
                        {order.receivedQty && order.receivedQty !== order.quantity && (
                          <span className="ml-1 text-xs text-gray-500">
                            (reçu: {order.receivedQty})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          {getStatusBadge(order.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(order.expectedDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {order.destinationSite?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {order.supplierRef || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {order.status === 'PENDING' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setReceiveOrderId(order.id)}
                          >
                            <PackageCheck className="mr-1 h-4 w-4" />
                            Réceptionner
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Desktop Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouvelle commande"
        size="lg"
      >
        <OrderForm
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
            toast.success('Commande créée', 'La commande a été enregistrée avec succès');
          }}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Receive Order Modal */}
      <Modal
        isOpen={!!receiveOrderId}
        onClose={() => setReceiveOrderId(null)}
        title="Réceptionner la commande"
        size="md"
      >
        {receiveOrderId && (
          <ReceiveOrderForm
            orderId={receiveOrderId}
            onSuccess={() => {
              setReceiveOrderId(null);
              refetch();
              toast.success('Commande réceptionnée', 'La réception a été enregistrée avec succès');
            }}
            onCancel={() => setReceiveOrderId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
