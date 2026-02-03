import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import api from '../../services/api';
import type { Pack, Site, ApiResponse } from '../../types';

interface PackItem {
  id: string;
  productId: string;
  productReference: string;
  productDescription?: string;
  quantity: number;
  condition: 'NEW' | 'USED';
}

interface PackMovementFormData {
  type: 'IN' | 'OUT';
  packId: string;
  packQuantity: number;
  siteId: string;
  movementDate: string;
  operator?: string;
  comment?: string;
  items: PackItem[];
}

interface PackMovementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PackMovementForm({ onSuccess, onCancel }: PackMovementFormProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    control,
  } = useForm<PackMovementFormData>({
    defaultValues: {
      type: 'OUT',
      packQuantity: 1,
      movementDate: new Date().toISOString().split('T')[0],
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const movementType = watch('type');
  const packId = watch('packId');
  const packQuantity = watch('packQuantity');

  // Fetch packs filtered by type
  const { data: packs } = useQuery({
    queryKey: ['packs', movementType],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Pack[]>>(`/packs?type=${movementType}`);
      return res.data.data;
    },
    enabled: !!movementType,
  });

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Site[]>>('/sites');
      return res.data.data;
    },
  });

  // Get selected pack details
  const selectedPack = packs?.find((p) => p.id === packId);

  // Auto-load items when pack changes
  useEffect(() => {
    if (selectedPack && selectedPack.items) {
      // Clear existing items
      while (fields.length > 0) {
        remove(0);
      }
      // Add pack items with quantity multiplied by packQuantity
      selectedPack.items.forEach((item) => {
        append({
          id: item.id,
          productId: item.productId,
          productReference: item.product.reference,
          productDescription: item.product.description,
          quantity: item.quantity * (packQuantity || 1),
          condition: 'NEW',
        });
      });
    }
  }, [selectedPack, packId]);

  // Mutation to create multiple movements
  const createMovementsMutation = useMutation({
    mutationFn: async (data: PackMovementFormData) => {
      // Get the base quantities from the selected pack
      const baseItems = selectedPack?.items || [];

      // Create movements for each item
      const movements = data.items.map((item) => {
        const baseItem = baseItems.find((bi) => bi.productId === item.productId);
        const calculatedQuantity = (baseItem?.quantity || 1) * (data.packQuantity || 1);

        return {
          productId: item.productId,
          type: data.type,
          quantity: calculatedQuantity,
          condition: item.condition,
          movementDate: new Date(data.movementDate).toISOString(),
          operator: data.operator || undefined,
          comment: data.comment ? `[Pack: ${selectedPack?.name}] ${data.comment}` : `[Pack: ${selectedPack?.name}]`,
          // For IN: targetSiteId is the destination
          // For OUT: sourceSiteId is the source
          ...(data.type === 'IN'
            ? { targetSiteId: data.siteId }
            : { sourceSiteId: data.siteId }),
        };
      });

      // Send all movements sequentially
      for (const movement of movements) {
        await api.post('/movements', movement);
      }

      return movements.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      onSuccess();
    },
    onError: (error: any) => {
      setSubmitError(error?.response?.data?.error || 'Erreur lors de la creation des mouvements');
    },
  });

  const onSubmit = (data: PackMovementFormData) => {
    setSubmitError(null);
    if (data.items.length === 0) {
      setSubmitError('Veuillez selectionner un pack avec des articles');
      return;
    }
    createMovementsMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Movement Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type de mouvement <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="IN"
              {...register('type', { required: 'Type de mouvement requis' })}
              onChange={(e) => {
                register('type').onChange(e);
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Entrée (IN)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="OUT"
              {...register('type', { required: 'Type de mouvement requis' })}
              onChange={(e) => {
                register('type').onChange(e);
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Sortie (OUT)</span>
          </label>
        </div>
        {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>}
      </div>

      {/* Pack Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Pack <span className="text-red-500">*</span>
        </label>
        <Select
          {...register('packId', { required: 'Pack requis' })}
          className={errors.packId ? 'border-red-500' : ''}
        >
          <option value="">Sélectionner un pack...</option>
          {packs?.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name} ({pack.items?.length || 0} articles)
            </option>
          ))}
        </Select>
        {errors.packId && <p className="mt-1 text-sm text-red-500">{errors.packId.message}</p>}
      </div>

      {/* Pack Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quantité du pack <span className="text-red-500">*</span>
        </label>
        <Input
          type="number"
          {...register('packQuantity', {
            required: 'Quantité du pack requise',
            min: { value: 1, message: 'Quantité doit être au moins 1' },
            valueAsNumber: true,
          })}
          placeholder="Entrez la quantité du pack"
          className={errors.packQuantity ? 'border-red-500' : ''}
        />
        {errors.packQuantity && (
          <p className="mt-1 text-sm text-red-500">{errors.packQuantity.message}</p>
        )}
      </div>

      {/* Pack Details */}
      {selectedPack && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Détails du pack</h4>
          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>Nom:</strong> {selectedPack.name}
            </p>
            {selectedPack.description && (
              <p>
                <strong>Description:</strong> {selectedPack.description}
              </p>
            )}
            <p>
              <strong>Nombre d'articles:</strong> {selectedPack.items?.length || 0}
            </p>
          </div>
        </div>
      )}

      {/* Articles List */}
      {fields.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Articles <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            {fields.map((field, index) => {
              const baseQuantity = selectedPack?.items?.find((item) => item.productId === field.productId)?.quantity || 0;
              const calculatedQuantity = baseQuantity * (packQuantity || 1);

              return (
                <div key={field.id} className="flex gap-3 items-start bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  {/* Hidden ID */}
                  <input type="hidden" {...register(`items.${index}.id`)} />
                  <input type="hidden" {...register(`items.${index}.productId`)} />
                  <input type="hidden" {...register(`items.${index}.productReference`)} />
                  <input type="hidden" {...register(`items.${index}.productDescription`)} />

                  {/* Product Label */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Produit
                    </label>
                    <div className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-gray-900 dark:text-gray-100">
                      {watch(`items.${index}.productReference`)} 
                      {watch(`items.${index}.productDescription`) && (
                        <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {watch(`items.${index}.productDescription`)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity (calculated, read-only) */}
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantité
                    </label>
                    <div className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-gray-900 dark:text-gray-100 font-medium">
                      {calculatedQuantity}
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mt-1">
                        ({baseQuantity} × {packQuantity})
                      </span>
                    </div>
                    <input type="hidden" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                  </div>

                  {/* Condition */}
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      État
                    </label>
                    <Select
                      {...register(`items.${index}.condition`)}
                      className="w-full"
                    >
                      <option value="NEW">Neuf</option>
                      <option value="USED">Occasion</option>
                    </Select>
                  </div>

                  {/* Delete Button */}
                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                      title="Supprimer cet article"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Site (Source for OUT, Target for IN) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {movementType === 'OUT' ? 'Site source' : 'Site cible'} <span className="text-red-500">*</span>
        </label>
        <Select
          {...register('siteId', { required: movementType === 'OUT' ? 'Site source requis' : 'Site cible requis' })}
          className={errors.siteId ? 'border-red-500' : ''}
        >
          <option value="">Selectionner un site...</option>
          {sites
            ?.filter((site) => site.type === 'STORAGE')
            .map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
        </Select>
        {errors.siteId && <p className="mt-1 text-sm text-red-500">{errors.siteId.message}</p>}
      </div>

      {/* Movement Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Date du mouvement <span className="text-red-500">*</span>
        </label>
        <Input
          type="date"
          {...register('movementDate', { required: 'Date du mouvement requise' })}
          className={errors.movementDate ? 'border-red-500' : ''}
        />
        {errors.movementDate && (
          <p className="mt-1 text-sm text-red-500">{errors.movementDate.message}</p>
        )}
      </div>

      {/* Operator */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Opérateur
        </label>
        <Input
          type="text"
          {...register('operator')}
          placeholder="Nom de l'opérateur (optionnel)"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Commentaire
        </label>
        <textarea
          {...register('comment')}
          placeholder="Ajouter un commentaire (optionnel)"
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>

      {/* Error message */}
      {submitError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {submitError}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={createMovementsMutation.isPending}>
          Annuler
        </Button>
        <Button type="submit" disabled={createMovementsMutation.isPending || fields.length === 0}>
          {createMovementsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creation en cours...
            </>
          ) : (
            `Creer ${fields.length} mouvement${fields.length > 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </form>
  );
}
