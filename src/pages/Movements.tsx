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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import MovementForm from '../components/forms/MovementForm';
import PackMovementForm from '../components/forms/PackMovementForm';
import { useToast } from '../components/ui/Toast';
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
      return res.data.data;
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

  const hasFilters = typeFilter || siteFilter || startDate || endDate || search || conditionFilter;

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const pagination = movementsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mouvements de Stock
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Historique des entrées, sorties et transferts
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau mouvement
          </Button>
          <Button variant="secondary" onClick={() => setIsPackMovementModalOpen(true)}>
            <Package className="mr-2 h-4 w-4" />
            Mouvement du pack
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher produit, opérateur..."
                value={search}
                onChange={(e) => updateParams({ search: e.target.value })}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            {/* Type filter */}
            <Select
              value={typeFilter}
              onChange={(e) => updateParams({ type: e.target.value })}
              className="w-40"
            >
              <option value="">Tous les types</option>
              <option value="IN">Entrée</option>
              <option value="OUT">Sortie</option>
              <option value="TRANSFER">Transfert</option>
            </Select>

            {/* Site filter */}
            <Select
              value={siteFilter}
              onChange={(e) => updateParams({ site: e.target.value })}
              className="w-44"
            >
              <option value="">Tous les sites</option>
              {sites?.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>

            {/* Condition filter */}
            <Select
              value={conditionFilter}
              onChange={(e) => updateParams({ condition: e.target.value })}
              className="w-36"
            >
              <option value="">Tout état</option>
              <option value="NEW">Neuf</option>
              <option value="USED">Occasion</option>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => updateParams({ startDate: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                title="Date de début"
              />
              <span className="text-gray-500">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => updateParams({ endDate: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                title="Date de fin"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <Filter className="mr-1 h-4 w-4" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <ArrowDownCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Entrées</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredMovements?.filter(m => m.type === 'IN').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <ArrowUpCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sorties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredMovements?.filter(m => m.type === 'OUT').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transferts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredMovements?.filter(m => m.type === 'TRANSFER').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total mouvements</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pagination?.total || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      État
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Opérateur
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
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
                            {new Date(movement.movementDate).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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

          {/* Pagination */}
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

      {/* Results count */}
      {filteredMovements && filteredMovements.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filteredMovements.length} mouvement(s) sur cette page
        </p>
      )}

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
