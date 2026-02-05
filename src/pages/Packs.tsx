import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, PackageOpen, ArrowDownCircle, ArrowUpCircle, Search, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import ProductSearch from '../components/ui/ProductSearch';
import api from '../services/api';
import type { Pack, PackType, Product, ApiResponse } from '../types';

export default function Packs() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | undefined>();
  const [packName, setPackName] = useState('');
  const [packType, setPackType] = useState<PackType>('OUT');
  const [packDescription, setPackDescription] = useState('');
  const [packItems, setPackItems] = useState<{ key: string; productId: string; product: { id: string; reference: string; description?: string } | null; quantity: number }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Pack | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch packs
  const { data: packsData, isLoading } = useQuery({
    queryKey: ['packs'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Pack[]>>('/packs');
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: PackType; description?: string; items: { productId: string; quantity: number }[] }) => {
      await api.post('/packs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'], refetchType: 'all' });
      handleCloseModal();
      toast.success('Pack cree', 'Le pack a ete cree avec succes');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de creer le pack');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; type?: PackType; description?: string; items?: { productId: string; quantity: number }[] } }) => {
      await api.put(`/packs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'], refetchType: 'all' });
      handleCloseModal();
      toast.success('Pack modifie', 'Le pack a ete mis a jour');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de modifier le pack');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/packs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'], refetchType: 'all' });
      setDeleteConfirm(null);
      toast.success('Pack supprime', 'Le pack a ete supprime');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer le pack');
    },
  });

  // Handlers
  const handleOpenModal = (pack?: Pack) => {
    setSelectedPack(pack);
    setPackName(pack?.name || '');
    setPackType(pack?.type || 'OUT');
    setPackDescription(pack?.description || '');
    setPackItems(pack?.items?.map((item, idx) => ({
      key: `existing-${item.id}-${idx}`,
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
    })) || []);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPack(undefined);
    setPackName('');
    setPackType('OUT');
    setPackDescription('');
    setPackItems([]);
  };

  const handleAddItem = () => {
    setPackItems(prev => [...prev, { key: `new-${Date.now()}-${Math.random()}`, productId: '', product: null, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setPackItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemProductChange = (index: number, productId: string, product: Product | null) => {
    setPackItems(prev => prev.map((item, i) =>
      i === index
        ? {
            ...item,
            productId,
            product: product ? { id: product.id, reference: product.reference, description: product.description } : null
          }
        : item
    ));
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    setPackItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity } : item
    ));
  };

  const handleSave = () => {
    const validItems = packItems.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Erreur', 'Ajoutez au moins un produit au pack');
      return;
    }

    const data = {
      name: packName,
      type: packType,
      description: packDescription || undefined,
      items: validItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
    };

    if (selectedPack) {
      updateMutation.mutate({ id: selectedPack.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter packs
  const filteredPacks = packsData?.data?.filter(pack =>
    pack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pack.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Packs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Groupes de produits pour entrees/sorties rapides
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau pack
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un pack..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Packs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5" />
            Liste des packs
            {packsData?.data && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {filteredPacks.length} pack{filteredPacks.length > 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredPacks.length === 0 ? (
            <div className="py-8 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Aucun pack trouve' : 'Aucun pack cree'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => handleOpenModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Creer un pack
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 lg:hidden">
                {filteredPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${
                          pack.type === 'IN'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{pack.name}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            pack.type === 'IN'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            {pack.type === 'IN' ? (
                              <><ArrowDownCircle className="h-3 w-3" /> Entrée</>
                            ) : (
                              <><ArrowUpCircle className="h-3 w-3" /> Sortie</>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(pack)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(pack)}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {pack.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {pack.description}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {pack.items?.length || pack._count?.items || 0} produit{(pack.items?.length || 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                      <th className="py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Description</th>
                      <th className="py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Produits</th>
                      <th className="py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredPacks.map((pack) => (
                      <tr key={pack.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {pack.name}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            pack.type === 'IN'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}>
                            {pack.type === 'IN' ? (
                              <><ArrowDownCircle className="h-3.5 w-3.5" /> Entree</>
                            ) : (
                              <><ArrowUpCircle className="h-3.5 w-3.5" /> Sortie</>
                            )}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {pack.description || '-'}
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            {pack.items?.length || pack._count?.items || 0} produit{(pack.items?.length || 0) > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(pack)}
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(pack)}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedPack ? 'Modifier le pack' : 'Nouveau pack'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom du pack"
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            placeholder="ex: Tete Spherik, Kit Ecran"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="packType"
                  value="OUT"
                  checked={packType === 'OUT'}
                  onChange={() => setPackType('OUT')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                  Sortie
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="packType"
                  value="IN"
                  checked={packType === 'IN'}
                  onChange={() => setPackType('IN')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <ArrowDownCircle className="h-4 w-4 text-green-500" />
                  Entree
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={2}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Produits
              </label>
              <Button size="sm" variant="secondary" onClick={handleAddItem}>
                <Plus className="mr-1 h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>

            {packItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                Aucun produit ajouté. Cliquez sur "Ajouter" pour commencer.
              </p>
            ) : (
              <div className="space-y-3">
                {packItems.map((item, index) => (
                  <div key={item.key} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex-1">
                      <ProductSearch
                        label=""
                        onChange={(productId, product) => handleItemProductChange(index, productId, product)}
                        initialProduct={item.product as Product | null}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-24">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                          placeholder="Qté"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!packName || packItems.length === 0 || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Enregistrement...'
                : selectedPack
                ? 'Modifier'
                : 'Creer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Etes-vous sur de vouloir supprimer le pack{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteConfirm?.name}</span> ?
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
