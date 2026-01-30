import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Boxes, FolderTree } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import type { Assembly, ProductGroup, PaginatedResponse, ApiResponse } from '../types';

export default function Settings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Assemblies state
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | undefined>();
  const [assemblyName, setAssemblyName] = useState('');
  const [assemblyDescription, setAssemblyDescription] = useState('');
  const [deleteAssemblyConfirm, setDeleteAssemblyConfirm] = useState<Assembly | null>(null);

  // Groups state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | undefined>();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<ProductGroup | null>(null);

  // Fetch assemblies
  const { data: assembliesData, isLoading: assembliesLoading } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Assembly>>('/assemblies?limit=100');
      return res.data;
    },
  });

  // Fetch groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['product-groups'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProductGroup[]>>('/products/groups');
      return res.data;
    },
  });

  // Assembly mutations
  const createAssemblyMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      await api.post('/assemblies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      handleCloseAssemblyModal();
      toast.success('Assemblage créé', 'Le type d\'assemblage a été créé avec succès');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de créer l\'assemblage');
    },
  });

  const updateAssemblyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string } }) => {
      await api.put(`/assemblies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      handleCloseAssemblyModal();
      toast.success('Assemblage modifié', 'Le type d\'assemblage a été mis à jour');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de modifier l\'assemblage');
    },
  });

  const deleteAssemblyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assemblies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      setDeleteAssemblyConfirm(null);
      toast.success('Assemblage supprimé', 'Le type d\'assemblage a été supprimé');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer l\'assemblage');
    },
  });

  // Group mutations
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      await api.post('/products/groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] });
      handleCloseGroupModal();
      toast.success('Groupe créé', 'Le groupe de produits a été créé avec succès');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de créer le groupe');
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string } }) => {
      await api.put(`/products/groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] });
      handleCloseGroupModal();
      toast.success('Groupe modifié', 'Le groupe de produits a été mis à jour');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de modifier le groupe');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] });
      setDeleteGroupConfirm(null);
      toast.success('Groupe supprimé', 'Le groupe de produits a été supprimé');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer le groupe');
    },
  });

  // Assembly handlers
  const handleOpenAssemblyModal = (assembly?: Assembly) => {
    setSelectedAssembly(assembly);
    setAssemblyName(assembly?.name || '');
    setAssemblyDescription(assembly?.description || '');
    setIsAssemblyModalOpen(true);
  };

  const handleCloseAssemblyModal = () => {
    setIsAssemblyModalOpen(false);
    setSelectedAssembly(undefined);
    setAssemblyName('');
    setAssemblyDescription('');
  };

  const handleSaveAssembly = () => {
    const data = {
      name: assemblyName,
      description: assemblyDescription || undefined,
    };

    if (selectedAssembly) {
      updateAssemblyMutation.mutate({ id: selectedAssembly.id, data });
    } else {
      createAssemblyMutation.mutate(data);
    }
  };

  // Group handlers
  const handleOpenGroupModal = (group?: ProductGroup) => {
    setSelectedGroup(group);
    setGroupName(group?.name || '');
    setGroupDescription(group?.description || '');
    setIsGroupModalOpen(true);
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
    setSelectedGroup(undefined);
    setGroupName('');
    setGroupDescription('');
  };

  const handleSaveGroup = () => {
    const data = {
      name: groupName,
      description: groupDescription || undefined,
    };

    if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assemblages (Types de bornes) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Types d'assemblage (Bornes)
          </CardTitle>
          <Button size="sm" onClick={() => handleOpenAssemblyModal()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Les types d'assemblage permettent de regrouper les produits par type de borne (ex: Borne Classik, Borne Spherik, etc.)
          </p>
          {assembliesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : !assembliesData?.data.length ? (
            <p className="text-gray-400 dark:text-gray-500 italic py-4">
              Aucun type d'assemblage créé
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Description</th>
                    <th className="py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Produits</th>
                    <th className="py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {assembliesData.data.map((assembly) => (
                    <tr key={assembly.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                        {assembly.name}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {assembly.description || '-'}
                      </td>
                      <td className="py-2 text-center text-gray-600 dark:text-gray-400">
                        {assembly._count?.productAssemblies || 0}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAssemblyModal(assembly)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAssemblyConfirm(assembly)}
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

      {/* Groupes de produits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Groupes de produits
          </CardTitle>
          <Button size="sm" onClick={() => handleOpenGroupModal()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Les groupes permettent de catégoriser les produits (ex: Visserie, Électronique, etc.)
          </p>
          {groupsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : !groupsData?.data.length ? (
            <p className="text-gray-400 dark:text-gray-500 italic py-4">
              Aucun groupe de produits créé
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Description</th>
                    <th className="py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {groupsData.data.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                        {group.name}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {group.description || '-'}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenGroupModal(group)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteGroupConfirm(group)}
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

      {/* Assembly Modal */}
      <Modal
        isOpen={isAssemblyModalOpen}
        onClose={handleCloseAssemblyModal}
        title={selectedAssembly ? 'Modifier l\'assemblage' : 'Nouveau type d\'assemblage'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
            placeholder="ex: Borne Classik"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={assemblyDescription}
              onChange={(e) => setAssemblyDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseAssemblyModal}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveAssembly}
              disabled={!assemblyName || createAssemblyMutation.isPending || updateAssemblyMutation.isPending}
            >
              {createAssemblyMutation.isPending || updateAssemblyMutation.isPending
                ? 'Enregistrement...'
                : selectedAssembly
                ? 'Modifier'
                : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={handleCloseGroupModal}
        title={selectedGroup ? 'Modifier le groupe' : 'Nouveau groupe de produits'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="ex: Visserie"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseGroupModal}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={!groupName || createGroupMutation.isPending || updateGroupMutation.isPending}
            >
              {createGroupMutation.isPending || updateGroupMutation.isPending
                ? 'Enregistrement...'
                : selectedGroup
                ? 'Modifier'
                : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Assembly Confirmation */}
      <Modal
        isOpen={!!deleteAssemblyConfirm}
        onClose={() => setDeleteAssemblyConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir supprimer l'assemblage{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteAssemblyConfirm?.name}</span> ?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Cette action est irréversible et supprimera les liens avec les produits.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setDeleteAssemblyConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteAssemblyConfirm && deleteAssemblyMutation.mutate(deleteAssemblyConfirm.id)}
              disabled={deleteAssemblyMutation.isPending}
            >
              {deleteAssemblyMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Confirmation */}
      <Modal
        isOpen={!!deleteGroupConfirm}
        onClose={() => setDeleteGroupConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir supprimer le groupe{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteGroupConfirm?.name}</span> ?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Cette action est irréversible. Les produits associés ne seront plus dans ce groupe.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setDeleteGroupConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteGroupConfirm && deleteGroupMutation.mutate(deleteGroupConfirm.id)}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
