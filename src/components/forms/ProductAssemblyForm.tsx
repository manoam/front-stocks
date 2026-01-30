import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToast } from '../ui/Toast';
import api from '../../services/api';
import type { Product, Assembly, ProductAssembly, PaginatedResponse } from '../../types';

interface ProductAssemblyFormProps {
  product: Product;
  onClose: () => void;
}

export default function ProductAssemblyForm({ product, onClose }: ProductAssemblyFormProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedAssemblyId, setSelectedAssemblyId] = useState('');
  const [quantityUsed, setQuantityUsed] = useState(1);

  // Fetch all assemblies
  const { data: assembliesData } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Assembly>>('/assemblies?limit=100');
      return res.data;
    },
  });

  // Add product to assembly
  const addMutation = useMutation({
    mutationFn: async ({ assemblyId, quantityUsed }: { assemblyId: string; quantityUsed: number }) => {
      await api.post(`/assemblies/${assemblyId}/products`, {
        productId: product.id,
        quantityUsed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      setSelectedAssemblyId('');
      setQuantityUsed(1);
      toast.success('Assemblage ajouté', 'Le produit a été lié à l\'assemblage');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible d\'ajouter le produit à l\'assemblage');
    },
  });

  // Remove product from assembly
  const removeMutation = useMutation({
    mutationFn: async (assemblyId: string) => {
      await api.delete(`/assemblies/${assemblyId}/products/${product.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Assemblage retiré', 'Le produit a été retiré de l\'assemblage');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de retirer le produit de l\'assemblage');
    },
  });

  // Update quantity
  const updateMutation = useMutation({
    mutationFn: async ({ assemblyId, quantityUsed }: { assemblyId: string; quantityUsed: number }) => {
      await api.put(`/assemblies/${assemblyId}/products/${product.id}`, { quantityUsed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      toast.success('Quantité mise à jour', 'La quantité a été modifiée');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de mettre à jour la quantité');
    },
  });

  const handleAdd = () => {
    if (!selectedAssemblyId) return;
    addMutation.mutate({ assemblyId: selectedAssemblyId, quantityUsed });
  };

  // Get assemblies that the product is not already in
  const linkedAssemblyIds = product.productAssemblies?.map((pa) => pa.assemblyId) || [];
  const availableAssemblies = assembliesData?.data.filter(
    (a) => !linkedAssemblyIds.includes(a.id)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Current assemblies */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Assemblages actuels
        </h3>
        {!product.productAssemblies?.length ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic">
            Ce produit n'est lié à aucun assemblage
          </p>
        ) : (
          <div className="space-y-2">
            {product.productAssemblies.map((pa: ProductAssembly) => (
              <div
                key={pa.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {pa.assembly?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Qté:</span>
                    <input
                      type="number"
                      min="1"
                      value={pa.quantityUsed}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        updateMutation.mutate({ assemblyId: pa.assemblyId, quantityUsed: newQty });
                      }}
                      className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-center text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMutation.mutate(pa.assemblyId)}
                  disabled={removeMutation.isPending}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add to assembly */}
      {availableAssemblies.length > 0 && (
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Ajouter à un assemblage
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assemblage
              </label>
              <select
                value={selectedAssemblyId}
                onChange={(e) => setSelectedAssemblyId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Sélectionner un assemblage</option>
                {availableAssemblies.map((assembly) => (
                  <option key={assembly.id} value={assembly.id}>
                    {assembly.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <Input
                label="Quantité"
                type="number"
                min={1}
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!selectedAssemblyId || addMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      )}

      {availableAssemblies.length === 0 && assembliesData?.data.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aucun type d'assemblage n'a été créé. Allez dans Paramètres pour en créer.
        </p>
      )}

      <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
