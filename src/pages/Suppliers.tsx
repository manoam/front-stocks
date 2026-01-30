import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Mail, Phone, Globe, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import SupplierForm from '../components/forms/SupplierForm';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import type { Supplier, PaginatedResponse } from '../types';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });
      const res = await api.get<PaginatedResponse<Supplier>>(`/suppliers?${params}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteConfirm(null);
      toast.success('Fournisseur supprimé', 'Le fournisseur a été supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer le fournisseur');
    },
  });

  const handleCreate = () => {
    setSelectedSupplier(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSupplier(undefined);
  };

  const handleSuccess = (isEdit: boolean) => {
    handleModalClose();
    toast.success(
      isEdit ? 'Fournisseur modifié' : 'Fournisseur créé',
      isEdit ? 'Le fournisseur a été mis à jour avec succès' : 'Le fournisseur a été créé avec succès'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 w-80 rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              Aucun fournisseur trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Site web
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Produits
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Commandes
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((supplier, index) => (
                    <tr
                      key={supplier.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30 ${
                        index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/suppliers/${supplier.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {supplier.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {supplier.contact || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {supplier.email ? (
                          <a
                            href={`mailto:${supplier.email}`}
                            className="flex items-center gap-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px]">{supplier.email}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {supplier.phone ? (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {supplier.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {supplier.website ? (
                          <a
                            href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]">
                              {supplier.website.replace(/^https?:\/\//, '')}
                            </span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {supplier._count?.productSuppliers || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {supplier._count?.orders || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/suppliers/${supplier.id}`}>
                            <Button variant="ghost" size="sm" title="Voir détails">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(supplier)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(supplier)}
                            title="Supprimer"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
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
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={selectedSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        size="lg"
      >
        <SupplierForm
          supplier={selectedSupplier}
          onSuccess={() => handleSuccess(!!selectedSupplier)}
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
            Êtes-vous sûr de vouloir supprimer le fournisseur{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteConfirm?.name}</span> ?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Cette action est irréversible et supprimera également les liens avec les produits.
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
    </div>
  );
}
