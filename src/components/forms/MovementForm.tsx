import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ProductSearch from '../ui/ProductSearch';
import api from '../../services/api';
import type { Product, Site, ApiResponse, MovementType, ProductCondition } from '../../types';

interface MovementFormData {
  productId: string;
  type: MovementType;
  sourceSiteId?: string;
  targetSiteId?: string;
  quantity: number;
  condition: ProductCondition;
  movementDate: string;
  operator?: string;
  comment?: string;
}

interface MovementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedProductId?: string;
  preselectedProduct?: Product | null;
}

export default function MovementForm({ onSuccess, onCancel, preselectedProductId, preselectedProduct }: MovementFormProps) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || '');
  const [productError, setProductError] = useState<string | undefined>();

  // Sync preselectedProductId changes
  useEffect(() => {
    if (preselectedProductId) {
      setSelectedProductId(preselectedProductId);
    }
  }, [preselectedProductId]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MovementFormData>({
    defaultValues: {
      productId: preselectedProductId || '',
      type: 'IN',
      condition: 'NEW',
      movementDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      sourceSiteId: '',
      targetSiteId: '',
      operator: '',
      comment: '',
    },
  });

  const movementType = watch('type');
  const sourceSiteId = watch('sourceSiteId');
  const targetSiteId = watch('targetSiteId');
  const quantity = watch('quantity');
  const condition = watch('condition');
  const movementDate = watch('movementDate');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preselectedProduct || null);

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Site[]>>('/sites');
      return res.data.data;
    },
  });

  const storageSites = sites?.filter(s => s.type === 'STORAGE') || [];
  const allSites = sites || [];

  const createMutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      const payload = {
        ...data,
        quantity: Number(data.quantity),
        movementDate: new Date(data.movementDate).toISOString(),
        sourceSiteId: data.sourceSiteId || undefined,
        targetSiteId: data.targetSiteId || undefined,
        operator: data.operator || undefined,
        comment: data.comment || undefined,
      };
      const res = await api.post('/movements', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
      onSuccess();
    },
  });

  const onSubmit = (data: MovementFormData) => {
    // Validate product selection
    if (!selectedProductId) {
      setProductError('Produit requis');
      return;
    }
    setProductError(undefined);

    createMutation.mutate({
      ...data,
      productId: selectedProductId,
    });
  };

  const handleProductChange = (productId: string, product: Product | null) => {
    setSelectedProductId(productId);
    setSelectedProduct(product);
    // Reset source site when product changes (for OUT/TRANSFER)
    setValue('sourceSiteId', '');
    if (productId) {
      setProductError(undefined);
    }
  };

  // Reset source site when condition changes (stock availability may differ)
  useEffect(() => {
    if (movementType === 'OUT' || movementType === 'TRANSFER') {
      setValue('sourceSiteId', '');
    }
  }, [condition, setValue, movementType]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'IN': return 'Entrée';
      case 'OUT': return 'Sortie';
      case 'TRANSFER': return 'Transfert';
      default: return type;
    }
  };

  const showSourceSite = movementType === 'OUT' || movementType === 'TRANSFER';
  const showTargetSite = movementType === 'IN' || movementType === 'TRANSFER';

  // Get sites where the selected product has stock
  const productStockSiteIds = selectedProduct?.stocks
    ?.filter(stock => {
      // Filter by condition: check if there's stock for the selected condition
      if (condition === 'NEW') return stock.quantityNew > 0;
      if (condition === 'USED') return stock.quantityUsed > 0;
      return (stock.quantityNew + stock.quantityUsed) > 0;
    })
    .map(stock => stock.siteId) || [];

  // For OUT and TRANSFER movements, only show sites where the product has stock
  const sourceSiteOptions = (movementType === 'OUT' || movementType === 'TRANSFER')
    ? allSites.filter(s => productStockSiteIds.includes(s.id))
    : storageSites;

  // For IN movements, allow only STORAGE sites as target
  // For TRANSFER, filter out the source site
  const targetSiteOptions = storageSites.filter(s => s.id !== sourceSiteId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Product */}
      <ProductSearch
        onChange={handleProductChange}
        error={productError}
        initialProduct={preselectedProduct}
      />

      {/* Type */}
      <Select
        id="type"
        label="Type de mouvement *"
        error={errors.type?.message}
        {...register('type')}
      >
        <option value="IN">Entrée (réception)</option>
        <option value="OUT">Sortie (utilisation)</option>
        <option value="TRANSFER">Transfert (entre sites)</option>
      </Select>

      {/* Condition */}
      <Select
        id="condition"
        label="État du produit *"
        error={errors.condition?.message}
        {...register('condition')}
      >
        <option value="NEW">Neuf</option>
        <option value="USED">Occasion</option>
      </Select>

      {/* Source Site */}
      {showSourceSite && (
        <Select
          id="sourceSiteId"
          label={`Site source ${movementType === 'OUT' || movementType === 'TRANSFER' ? '*' : ''}`}
          error={errors.sourceSiteId?.message}
          {...register('sourceSiteId')}
        >
          <option value="">
            {selectedProduct
              ? (sourceSiteOptions.length > 0
                  ? 'Sélectionner le site source'
                  : `Aucun stock ${condition === 'NEW' ? 'neuf' : 'occasion'} disponible`)
              : 'Sélectionner d\'abord un produit'}
          </option>
          {sourceSiteOptions.map((site) => {
            const stock = selectedProduct?.stocks?.find(s => s.siteId === site.id);
            const availableQty = stock
              ? (condition === 'NEW' ? stock.quantityNew : stock.quantityUsed)
              : 0;
            return (
              <option key={site.id} value={site.id}>
                {site.name} - {availableQty} dispo ({condition === 'NEW' ? 'neuf' : 'occasion'})
              </option>
            );
          })}
        </Select>
      )}

      {/* Target Site */}
      {showTargetSite && (
        <Select
          id="targetSiteId"
          label={`Site cible ${movementType === 'IN' || movementType === 'TRANSFER' ? '*' : ''}`}
          error={errors.targetSiteId?.message}
          {...register('targetSiteId')}
        >
          <option value="">Sélectionner le site cible</option>
          {targetSiteOptions.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
      )}

      {/* Quantity */}
      <Input
        id="quantity"
        type="number"
        label="Quantité *"
        min={1}
        error={errors.quantity?.message}
        {...register('quantity', { required: 'Quantité requise', min: { value: 1, message: 'Minimum 1' } })}
      />

      {/* Date */}
      <Input
        id="movementDate"
        type="date"
        label="Date du mouvement *"
        error={errors.movementDate?.message}
        {...register('movementDate', { required: 'Date requise' })}
      />

      {/* Operator */}
      <Input
        id="operator"
        type="text"
        label="Opérateur"
        placeholder="Nom de l'opérateur"
        error={errors.operator?.message}
        {...register('operator')}
      />

      {/* Comment */}
      <div className="space-y-1">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Commentaire
        </label>
        <textarea
          id="comment"
          rows={3}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Commentaire optionnel..."
          {...register('comment')}
        />
      </div>

      {/* Error message */}
      {createMutation.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {(createMutation.error as any)?.response?.data?.error || 'Erreur lors de la création'}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800 space-y-2">
        <p className="font-medium text-gray-900 dark:text-gray-100">Résumé du mouvement :</p>
        <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
          {/* Product */}
          <span className="text-gray-500">Produit :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {selectedProduct ? selectedProduct.reference : <span className="text-gray-400 italic">Non sélectionné</span>}
          </span>

          {/* Type */}
          <span className="text-gray-500">Type :</span>
          <span className={`font-medium ${
            movementType === 'IN' ? 'text-green-600 dark:text-green-400' :
            movementType === 'OUT' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400'
          }`}>
            {getTypeLabel(movementType)}
          </span>

          {/* Quantity */}
          <span className="text-gray-500">Quantité :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {quantity || 0} {condition === 'NEW' ? '(Neuf)' : '(Occasion)'}
          </span>

          {/* Source Site */}
          {showSourceSite && (
            <>
              <span className="text-gray-500">Site source :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {sourceSiteId ? sites?.find(s => s.id === sourceSiteId)?.name : <span className="text-gray-400 italic">Non sélectionné</span>}
              </span>
            </>
          )}

          {/* Target Site */}
          {showTargetSite && (
            <>
              <span className="text-gray-500">Site cible :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {targetSiteId ? sites?.find(s => s.id === targetSiteId)?.name : <span className="text-gray-400 italic">Non sélectionné</span>}
              </span>
            </>
          )}

          {/* Date */}
          <span className="text-gray-500">Date :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {movementDate ? new Date(movementDate).toLocaleDateString('fr-FR') : '-'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" isLoading={createMutation.isPending}>
          Créer le mouvement
        </Button>
      </div>
    </form>
  );
}
