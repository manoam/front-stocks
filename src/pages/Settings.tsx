import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Boxes, Tag, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import type { AssemblyType, Assembly, PaginatedResponse } from '../types';

export default function Settings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Assembly Types state (ex: Borne Classik, Borne Spherik)
  const [isAssemblyTypeModalOpen, setIsAssemblyTypeModalOpen] = useState(false);
  const [selectedAssemblyType, setSelectedAssemblyType] = useState<AssemblyType | undefined>();
  const [assemblyTypeName, setAssemblyTypeName] = useState('');
  const [assemblyTypeDescription, setAssemblyTypeDescription] = useState('');
  const [deleteAssemblyTypeConfirm, setDeleteAssemblyTypeConfirm] = useState<AssemblyType | null>(null);

  // Assemblies state (ex: Ossature, Face Avant, Écran)
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | undefined>();
  const [assemblyName, setAssemblyName] = useState('');
  const [assemblyDescription, setAssemblyDescription] = useState('');
  const [assemblyTypeIds, setAssemblyTypeIds] = useState<string[]>([]);
  const [deleteAssemblyConfirm, setDeleteAssemblyConfirm] = useState<Assembly | null>(null);

  // Fetch assembly types
  const { data: assemblyTypesData, isLoading: assemblyTypesLoading } = useQuery({
    queryKey: ['assembly-types'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AssemblyType>>('/assembly-types?limit=100');
      return res.data;
    },
  });

  // Fetch assemblies
  const { data: assembliesData, isLoading: assembliesLoading } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Assembly>>('/assemblies?limit=100');
      return res.data;
    },
  });

  // Assembly Type mutations
  const createAssemblyTypeMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      await api.post('/assembly-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly-types'], refetchType: 'all' });
      handleCloseAssemblyTypeModal();
      toast.success('Type d\'assemblage créé', 'Le type d\'assemblage a été créé avec succès');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de créer le type d\'assemblage');
    },
  });

  const updateAssemblyTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string } }) => {
      await api.put(`/assembly-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly-types'], refetchType: 'all' });
      handleCloseAssemblyTypeModal();
      toast.success('Type d\'assemblage modifié', 'Le type d\'assemblage a été mis à jour');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de modifier le type d\'assemblage');
    },
  });

  const deleteAssemblyTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assembly-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly-types'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['assemblies'], refetchType: 'all' });
      setDeleteAssemblyTypeConfirm(null);
      toast.success('Type d\'assemblage supprimé', 'Le type d\'assemblage a été supprimé');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer le type d\'assemblage');
    },
  });

  // Assembly mutations
  const createAssemblyMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; assemblyTypeIds?: string[] }) => {
      await api.post('/assemblies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['assembly-types'], refetchType: 'all' });
      handleCloseAssemblyModal();
      toast.success('Assemblage créé', 'L\'assemblage a été créé avec succès');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de créer l\'assemblage');
    },
  });

  const updateAssemblyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string; assemblyTypeIds?: string[] } }) => {
      await api.put(`/assemblies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['assembly-types'], refetchType: 'all' });
      handleCloseAssemblyModal();
      toast.success('Assemblage modifié', 'L\'assemblage a été mis à jour');
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
      queryClient.invalidateQueries({ queryKey: ['assemblies'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['assembly-types'], refetchType: 'all' });
      setDeleteAssemblyConfirm(null);
      toast.success('Assemblage supprimé', 'L\'assemblage a été supprimé');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de supprimer l\'assemblage');
    },
  });


  // Assembly Type handlers
  const handleOpenAssemblyTypeModal = (assemblyType?: AssemblyType) => {
    setSelectedAssemblyType(assemblyType);
    setAssemblyTypeName(assemblyType?.name || '');
    setAssemblyTypeDescription(assemblyType?.description || '');
    setIsAssemblyTypeModalOpen(true);
  };

  const handleCloseAssemblyTypeModal = () => {
    setIsAssemblyTypeModalOpen(false);
    setSelectedAssemblyType(undefined);
    setAssemblyTypeName('');
    setAssemblyTypeDescription('');
  };

  const handleSaveAssemblyType = () => {
    const data = {
      name: assemblyTypeName,
      description: assemblyTypeDescription || undefined,
    };

    if (selectedAssemblyType) {
      updateAssemblyTypeMutation.mutate({ id: selectedAssemblyType.id, data });
    } else {
      createAssemblyTypeMutation.mutate(data);
    }
  };

  // Assembly handlers
  const handleOpenAssemblyModal = (assembly?: Assembly) => {
    setSelectedAssembly(assembly);
    setAssemblyName(assembly?.name || '');
    setAssemblyDescription(assembly?.description || '');
    setAssemblyTypeIds(assembly?.assemblyTypes?.map(at => at.id) || []);
    setIsAssemblyModalOpen(true);
  };

  const handleCloseAssemblyModal = () => {
    setIsAssemblyModalOpen(false);
    setSelectedAssembly(undefined);
    setAssemblyName('');
    setAssemblyDescription('');
    setAssemblyTypeIds([]);
  };

  const handleToggleAssemblyType = (typeId: string) => {
    setAssemblyTypeIds(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSaveAssembly = () => {
    const data = {
      name: assemblyName,
      description: assemblyDescription || undefined,
      assemblyTypeIds: assemblyTypeIds.length > 0 ? assemblyTypeIds : undefined,
    };

    if (selectedAssembly) {
      updateAssemblyMutation.mutate({ id: selectedAssembly.id, data });
    } else {
      createAssemblyMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Types d'assemblages (Types de bornes) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Types d'assemblages
          </CardTitle>
          <Button size="sm" onClick={() => handleOpenAssemblyTypeModal()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Les types d'assemblages représentent les familles de bornes (ex: Borne Classik, Borne Spherik). Un assemblage peut appartenir à plusieurs types.
          </p>
          {assemblyTypesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : !assemblyTypesData?.data.length ? (
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
                    <th className="py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Assemblages</th>
                    <th className="py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {assemblyTypesData.data.map((assemblyType) => (
                    <tr key={assemblyType.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                        {assemblyType.name}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {assemblyType.description || '-'}
                      </td>
                      <td className="py-2 text-center text-gray-600 dark:text-gray-400">
                        {assemblyType._count?.assemblies || 0}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAssemblyTypeModal(assemblyType)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAssemblyTypeConfirm(assemblyType)}
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

      {/* Assemblages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Assemblages
          </CardTitle>
          <Button size="sm" onClick={() => handleOpenAssemblyModal()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Les assemblages catégorisent les composants (ex: Ossature, Face Avant, Écran). Chaque assemblage peut être lié à plusieurs types d'assemblages.
          </p>
          {assembliesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : !assembliesData?.data.length ? (
            <p className="text-gray-400 dark:text-gray-500 italic py-4">
              Aucun assemblage créé
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Description</th>
                    <th className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Types d'assemblage</th>
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
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {assembly.assemblyTypes?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {assembly.assemblyTypes.map((type) => (
                              <span
                                key={type.id}
                                className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                              >
                                {type.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-gray-400">Aucun type</span>
                        )}
                      </td>
                      <td className="py-2 text-center text-gray-600 dark:text-gray-400">
                        {assembly._count?.products || 0}
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

      {/* Assembly Type Modal */}
      <Modal
        isOpen={isAssemblyTypeModalOpen}
        onClose={handleCloseAssemblyTypeModal}
        title={selectedAssemblyType ? 'Modifier le type d\'assemblage' : 'Nouveau type d\'assemblage'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={assemblyTypeName}
            onChange={(e) => setAssemblyTypeName(e.target.value)}
            placeholder="ex: Borne Classik"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={assemblyTypeDescription}
              onChange={(e) => setAssemblyTypeDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseAssemblyTypeModal}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveAssemblyType}
              disabled={!assemblyTypeName || createAssemblyTypeMutation.isPending || updateAssemblyTypeMutation.isPending}
            >
              {createAssemblyTypeMutation.isPending || updateAssemblyTypeMutation.isPending
                ? 'Enregistrement...'
                : selectedAssemblyType
                ? 'Modifier'
                : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assembly Modal */}
      <Modal
        isOpen={isAssemblyModalOpen}
        onClose={handleCloseAssemblyModal}
        title={selectedAssembly ? 'Modifier l\'assemblage' : 'Nouvel assemblage'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
            placeholder="ex: Ossature, Face Avant, Écran"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Types d'assemblage associés
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Sélectionnez un ou plusieurs types d'assemblage
            </p>
            {assemblyTypesData?.data.length ? (
              <div className="space-y-2">
                {/* Selected types */}
                {assemblyTypeIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {assemblyTypeIds.map((typeId) => {
                      const type = assemblyTypesData.data.find(t => t.id === typeId);
                      return type ? (
                        <span
                          key={type.id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                        >
                          {type.name}
                          <button
                            type="button"
                            onClick={() => handleToggleAssemblyType(type.id)}
                            className="ml-1 hover:text-primary-600 dark:hover:text-primary-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                {/* Available types to add */}
                <div className="flex flex-wrap gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {assemblyTypesData.data
                    .filter(type => !assemblyTypeIds.includes(type.id))
                    .map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleToggleAssemblyType(type.id)}
                        className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {type.name}
                      </button>
                    ))}
                  {assemblyTypesData.data.filter(type => !assemblyTypeIds.includes(type.id)).length === 0 && (
                    <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Tous les types sont sélectionnés
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                Aucun type d'assemblage disponible. Créez-en d'abord.
              </p>
            )}
          </div>
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

      {/* Delete Assembly Type Confirmation */}
      <Modal
        isOpen={!!deleteAssemblyTypeConfirm}
        onClose={() => setDeleteAssemblyTypeConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir supprimer le type d'assemblage{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteAssemblyTypeConfirm?.name}</span> ?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Les assemblages liés à ce type ne seront plus associés.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setDeleteAssemblyTypeConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteAssemblyTypeConfirm && deleteAssemblyTypeMutation.mutate(deleteAssemblyTypeConfirm.id)}
              disabled={deleteAssemblyTypeMutation.isPending}
            >
              {deleteAssemblyTypeMutation.isPending ? 'Suppression...' : 'Supprimer'}
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
            Les produits associés ne seront plus liés à cet assemblage.
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
    </div>
  );
}
