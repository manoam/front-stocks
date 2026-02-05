import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Eye, Link, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ProductForm from '../components/forms/ProductForm';
import ProductSupplierForm from '../components/forms/ProductSupplierForm';
import { useToast } from '../components/ui/Toast';
import Pagination from '../components/ui/Pagination';
import api from '../services/api';
import type { Product, PaginatedResponse, Assembly, AssemblyType } from '../types';

// Helper to get full image URL
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api$/, '');
const DEFAULT_PRODUCT_IMAGE = '/default-product.svg';

const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Lire search et page depuis l'URL
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const assemblyTypeId = searchParams.get('assemblyTypeId') || '';
  const assemblyId = searchParams.get('assemblyId') || '';

  const setSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset assemblyId if assemblyTypeId changes
    if (key === 'assemblyTypeId') {
      params.delete('assemblyId');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Fetch assembly types
  const { data: assemblyTypesData } = useQuery({
    queryKey: ['assembly-types'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AssemblyType>>('/assembly-types?limit=100');
      return res.data;
    },
  });

  // Fetch assemblies
  const { data: assembliesData } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Assembly>>('/assemblies?limit=100');
      return res.data;
    },
  });

  // Filter assemblies by selected type
  const filteredAssemblies = assemblyTypeId
    ? assembliesData?.data.filter((assembly) =>
        assembly.assemblyTypes?.some((at: any) =>
          at.assemblyTypeId === assemblyTypeId || at.id === assemblyTypeId
        )
      )
    : assembliesData?.data;

  const hasActiveFilters = search || assemblyTypeId || assemblyId || page > 1;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [supplierModalProduct, setSupplierModalProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, assemblyTypeId, assemblyId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(assemblyTypeId && { assemblyTypeId }),
        ...(assemblyId && { assemblyId }),
      });
      const res = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      setDeleteConfirm(null);
      toast.success('Produit supprimé', 'Le produit a été supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer le produit');
    },
  });

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const variants: Record<string, 'danger' | 'warning' | 'success'> = {
      HIGH: 'danger',
      MEDIUM: 'warning',
      LOW: 'success',
    };
    const labels: Record<string, string> = {
      HIGH: 'Fort',
      MEDIUM: 'Moyen',
      LOW: 'Faible',
    };
    return <Badge variant={variants[risk]}>{labels[risk]}</Badge>;
  };

  const handleCreate = () => {
    setSelectedProduct(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(undefined);
  };

  const handleSuccess = (isEdit: boolean) => {
    handleModalClose();
    toast.success(
      isEdit ? 'Produit modifié' : 'Produit créé',
      isEdit ? 'Le produit a été mis à jour avec succès' : 'Le produit a été créé avec succès'
    );
  };

  // Mobile card component
  const ProductCard = ({ product }: { product: Product }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
          <img
            src={getFullImageUrl(product.imageUrl)}
            alt={product.reference}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate(`/products/${product.id}`)}
            className="font-medium text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400 dark:hover:text-primary-300 text-left truncate block w-full"
          >
            {product.description || product.reference}
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {product.reference}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {getRiskBadge(product.supplyRisk)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Assemblage:</span>
          <p className="text-gray-900 dark:text-gray-100 truncate">
            {product.assembly?.name || product.assemblyType?.name || '-'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Fournisseur:</span>
          <p className="text-gray-900 dark:text-gray-100 truncate">
            {product.productSuppliers?.[0]?.supplier.name || '-'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-3 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/products/${product.id}`)}
          title="Voir"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSupplierModalProduct(product)}
          title="Gérer fournisseurs"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(product)}
          title="Modifier"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteConfirm(product)}
          title="Supprimer"
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with inline filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap flex-1">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-52 rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* Filters - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <Select
              value={assemblyTypeId}
              onChange={(e) => setFilter('assemblyTypeId', e.target.value)}
              className="h-9 min-w-[140px] sm:w-44"
            >
              <option value="">Type</option>
              {assemblyTypesData?.data.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <Select
              value={assemblyId}
              onChange={(e) => setFilter('assemblyId', e.target.value)}
              className="h-9 min-w-[140px] sm:w-44"
            >
              <option value="">Assemblage</option>
              {filteredAssemblies?.map((assembly) => (
                <option key={assembly.id} value={assembly.id}>
                  {assembly.name}
                </option>
              ))}
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 whitespace-nowrap"
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </Button>
            )}
          </div>
        </div>

        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="sm:hidden">Ajouter</span>
          <span className="hidden sm:inline">Nouveau produit</span>
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <span className="ml-2 text-gray-500">Chargement...</span>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Aucun produit trouvé
          </div>
        ) : (
          <div className="space-y-3">
            {data?.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Mobile Pagination */}
        {data && (
          <Pagination
            currentPage={page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.total}
            onPageChange={setPage}
            className="pt-4"
          />
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    Assemblage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    Risque appro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    Emplacement
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                        <span className="ml-2 text-gray-500">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun produit trouvé
                    </td>
                  </tr>
                ) : (
                  data?.data.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                            <img
                              src={getFullImageUrl(product.imageUrl)}
                              alt={product.reference}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <button
                              onClick={() => navigate(`/products/${product.id}`)}
                              className="font-medium text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400 dark:hover:text-primary-300 text-left"
                            >
                              {product.description || product.reference}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {product.reference}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-600 dark:text-gray-400">
                            {product.assembly?.name || (product.assemblyType ? '' : '-')}
                          </span>
                          {product.assemblyType && (
                            <span className="text-xs text-primary-500 dark:text-primary-400">
                              {product.assemblyType.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-400">
                          {product.productSuppliers?.[0]?.supplier.name || '-'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getRiskBadge(product.supplyRisk)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-400">{product.location || '-'}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/products/${product.id}`)}
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSupplierModalProduct(product)}
                            title="Gérer fournisseurs"
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(product)}
                            title="Supprimer"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop Pagination */}
          {data && (
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.total}
              onPageChange={setPage}
              className="border-t border-gray-200 px-6 py-3 dark:border-gray-700"
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={selectedProduct ? 'Modifier le produit' : 'Nouveau produit'}
        size="lg"
      >
        <ProductForm
          product={selectedProduct}
          onSuccess={() => handleSuccess(!!selectedProduct)}
          onCancel={handleModalClose}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir supprimer le produit{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteConfirm?.reference}</span> ?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Cette action est irréversible et supprimera également les stocks et mouvements associés.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Supplier Management Modal */}
      <Modal
        isOpen={!!supplierModalProduct}
        onClose={() => setSupplierModalProduct(null)}
        title={`Fournisseurs - ${supplierModalProduct?.reference}`}
        size="lg"
      >
        {supplierModalProduct && (
          <ProductSupplierForm
            product={supplierModalProduct}
            onClose={() => setSupplierModalProduct(null)}
          />
        )}
      </Modal>
    </div>
  );
}
