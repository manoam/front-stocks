import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  User,
  Package,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import MovementForm from '../components/forms/MovementForm';
import PackMovementForm from '../components/forms/PackMovementForm';
import { useToast } from '../components/ui/Toast';
import Pagination from '../components/ui/Pagination';
import api from '../services/api';
import type { StockMovement, Site, ApiResponse, PaginatedResponse } from '../types';

export default function Movements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPackMovementModalOpen, setIsPackMovementModalOpen] = useState(false);
  const toast = useToast();

  // URL params for filters
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const typeFilter = searchParams.get('type') || '';
  const siteFilter = searchParams.get('site') || '';
  const conditionFilter = searchParams.get('condition') || '';
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
    // Reset to page 1 when filters change (except page itself)
    if (!('page' in updates)) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  // Fetch movements
  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['movements', page, typeFilter, siteFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (typeFilter) params.set('type', typeFilter);
      if (siteFilter) params.set('siteId', siteFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get<PaginatedResponse<StockMovement>>(`/movements?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch sites for filter
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Site[]>>('/sites');
      return res.data?.data;
    },
  });

  // Filter movements by search (client-side)
  const filteredMovements = movementsData?.data.filter((movement) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      movement.product.reference.toLowerCase().includes(searchLower) ||
      movement.product.description?.toLowerCase().includes(searchLower) ||
      movement.operator?.toLowerCase().includes(searchLower) ||
      movement.comment?.toLowerCase().includes(searchLower)
    );
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case 'OUT':
        return <ArrowUpCircle className="h-5 w-5 text-red-500" />;
      case 'TRANSFER':
        return <ArrowLeftRight className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IN':
        return <Badge variant="success">Entrée</Badge>;
      case 'OUT':
        return <Badge variant="danger">Sortie</Badge>;
      case 'TRANSFER':
        return <Badge variant="info">Transfert</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    return condition === 'NEW' ? (
      <Badge variant="success">Neuf</Badge>
    ) : (
      <Badge variant="warning">Occasion</Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasFilters = typeFilter || siteFilter || startDate || endDate || search || conditionFilter;

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const pagination = movementsData?.pagination;

  // Mobile card component
  const MovementCard = ({ movement }: { movement: StockMovement }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {getTypeIcon(movement.type)}
          {getTypeBadge(movement.type)}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatDate(movement.movementDate)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(movement.movementDate)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Link
          to={`/products/${movement.productId}`}
          className="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {movement.product.reference}
        </Link>
        {movement.product.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {movement.product.description}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${
            movement.type === 'IN'
              ? 'text-green-600 dark:text-green-400'
              : movement.type === 'OUT'
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-400'
          }`}>
            {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
            {movement.quantity}
          </span>
          {getConditionBadge(movement.condition)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Source:</span>
          <p className="text-gray-900 dark:text-gray-100">
            {movement.sourceSite?.name || '-'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Destination:</span>
          <p className="text-gray-900 dark:text-gray-100">
            {movement.targetSite?.name || '-'}
          </p>
        </div>
        {movement.operator && (
          <div className="col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Opérateur:</span>
            <p className="text-gray-900 dark:text-gray-100 flex items-center gap-1">
              <User className="h-3 w-3 text-gray-400" />
              {movement.operator}
            </p>
          </div>
        )}
        {movement.comment && (
          <div className="col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Commentaire:</span>
            <p className="text-gray-900 dark:text-gray-100 text-sm">{movement.comment}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl dark:text-gray-100">
            Mouvements de Stock
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Historique des entrées, sorties et transferts
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-1 h-4 w-4" />
            <span className="sm:hidden">Mouvement</span>
            <span className="hidden sm:inline">Nouveau mouvement</span>
          </Button>
          <Button variant="secondary" onClick={() => setIsPackMovementModalOpen(true)} className="flex-1 sm:flex-none">
            <Package className="mr-1 h-4 w-4" />
            <span className="sm:hidden">Pack</span>
            <span className="hidden sm:inline">Mouvement pack</span>
          </Button>
        </div>
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
                value={typeFilter}
                onChange={(e) => updateParams({ type: e.target.value })}
                className="min-w-[110px] sm:w-32"
              >
                <option value="">Type</option>
                <option value="IN">Entrée</option>
                <option value="OUT">Sortie</option>
                <option value="TRANSFER">Transfert</option>
              </Select>

              <Select
                value={siteFilter}
                onChange={(e) => updateParams({ site: e.target.value })}
                className="min-w-[120px] sm:w-36"
              >
                <option value="">Site</option>
                {sites?.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>

              <Select
                value={conditionFilter}
                onChange={(e) => updateParams({ condition: e.target.value })}
                className="min-w-[100px] sm:w-28"
              >
                <option value="">État</option>
                <option value="NEW">Neuf</option>
                <option value="USED">Occasion</option>
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
              <div className="rounded-lg bg-green-100 p-1.5 md:p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <ArrowDownCircle className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Entrées</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredMovements?.filter(m => m.type === 'IN').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-red-100 p-1.5 md:p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <ArrowUpCircle className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Sorties</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredMovements?.filter(m => m.type === 'OUT').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-blue-100 p-1.5 md:p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <ArrowLeftRight className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Transferts</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredMovements?.filter(m => m.type === 'TRANSFER').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-lg bg-purple-100 p-1.5 md:p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Package className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pagination?.total || 0}
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
        ) : filteredMovements?.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Aucun mouvement trouvé
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMovements?.map((movement) => (
              <MovementCard key={movement.id} movement={movement} />
            ))}
          </div>
        )}

        {/* Mobile Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => updateParams({ page: String(p) })}
            totalItems={pagination.total}
            className="pt-4"
          />
        )}
      </div>

      {/* Desktop Movements Table */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
            </div>
          ) : filteredMovements?.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              Aucun mouvement trouvé
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-400px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      État
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Opérateur
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      Commentaire
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements?.map((movement, index) => (
                    <tr
                      key={movement.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30 ${
                        index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(movement.movementDate)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(movement.movementDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(movement.type)}
                          {getTypeBadge(movement.type)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/products/${movement.productId}`}
                          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {movement.product.reference}
                        </Link>
                        {movement.product.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                            {movement.product.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${
                          movement.type === 'IN'
                            ? 'text-green-600 dark:text-green-400'
                            : movement.type === 'OUT'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                          {movement.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getConditionBadge(movement.condition)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {movement.sourceSite?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {movement.targetSite?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {movement.operator ? (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <User className="h-3 w-3" />
                            {movement.operator}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {movement.comment ? (
                          <span
                            className="text-gray-600 dark:text-gray-400 truncate max-w-[150px] block"
                            title={movement.comment}
                          >
                            {movement.comment}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
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
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => updateParams({ page: String(p) })}
                totalItems={pagination.total}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Movement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouveau mouvement de stock"
        size="lg"
      >
        <MovementForm
          onSuccess={() => {
            setIsModalOpen(false);
            toast.success('Mouvement créé', 'Le mouvement de stock a été enregistré avec succès');
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Pack Movement Modal */}
      <Modal
        isOpen={isPackMovementModalOpen}
        onClose={() => setIsPackMovementModalOpen(false)}
        title="Mouvement du pack"
        size="lg"
      >
        <PackMovementForm
          onSuccess={() => {
            setIsPackMovementModalOpen(false);
            toast.success('Mouvement pack créé', 'Le mouvement du pack a été enregistré avec succès');
          }}
          onCancel={() => setIsPackMovementModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
