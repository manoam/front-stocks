import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Link } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ProductForm from '../components/forms/ProductForm';
import ProductSupplierForm from '../components/forms/ProductSupplierForm';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import type { Product, PaginatedResponse } from '../types';

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Lire search et page depuis l'URL
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [supplierModalProduct, setSupplierModalProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
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

  const getTotalStock = (product: Product) => {
    if (!product.stocks) return 0;
    return product.stocks.reduce((sum, s) => sum + s.quantityNew + s.quantityUsed, 0);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-80 rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <Button variant="secondary" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtres
          </Button>
          {(search || page > 1) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="text-gray-500"
            >
              Réinitialiser
            </Button>
          )}
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau produit
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Risque appro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Stock total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Emplacement
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                        <span className="ml-2 text-gray-500">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun produit trouvé
                    </td>
                  </tr>
                ) : (
                  data?.data.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="font-medium text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {product.reference}
                        </button>
                      </td>
                      <td className="max-w-xs truncate px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-400">{product.description || '-'}</span>
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
                        <span className="font-medium text-gray-900 dark:text-gray-100">{getTotalStock(product)}</span>
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

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {data.pagination.page} sur {data.pagination.totalPages} ({data.pagination.total} résultats)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === data.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
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
