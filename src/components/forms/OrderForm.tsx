import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ProductSearch from '../ui/ProductSearch';
import api from '../../services/api';
import type { Product, Supplier, Site, ApiResponse } from '../../types';

interface OrderFormData {
  productId: string;
  supplierId: string;
  quantity: number;
  orderDate: string;
  expectedDate?: string;
  destinationSiteId?: string;
  responsible?: string;
  supplierRef?: string;
  comment?: string;
}

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedProductId?: string;
  preselectedProduct?: Product | null;
}

export default function OrderForm({ onSuccess, onCancel, preselectedProductId, preselectedProduct }: OrderFormProps) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preselectedProduct || null);
  const [productError, setProductError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    defaultValues: {
      productId: preselectedProductId || '',
      supplierId: '',
      quantity: 1,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: '',
      destinationSiteId: '',
      responsible: '',
      supplierRef: '',
      comment: '',
    },
  });

  const supplierId = watch('supplierId');
  const quantity = watch('quantity');
  const orderDate = watch('orderDate');
  const expectedDate = watch('expectedDate');
  const destinationSiteId = watch('destinationSiteId');
  const supplierRef = watch('supplierRef');
  const responsible = watch('responsible');
  const comment = watch('comment');

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Supplier[]>>('/suppliers');
      return res.data?.data;
    },
  });

  // Fetch sites (only STORAGE)
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Site[]>>('/sites');
      return res.data?.data;
    },
  });

  const storageSites = sites?.filter(s => s.type === 'STORAGE') || [];

  // Get suppliers linked to selected product
  const productSuppliers = selectedProduct?.productSuppliers || [];
  const linkedSupplierIds = productSuppliers.map(ps => ps.supplierId);

  const createMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const payload = {
        ...data,
        quantity: Number(data.quantity),
        orderDate: new Date(data.orderDate).toISOString(),
        expectedDate: data.expectedDate ? new Date(data.expectedDate).toISOString() : undefined,
        destinationSiteId: data.destinationSiteId || undefined,
        responsible: data.responsible || undefined,
        supplierRef: data.supplierRef || undefined,
        comment: data.comment || undefined,
      };
      const res = await api.post('/orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      onSuccess();
    },
  });

  const onSubmit = (data: OrderFormData) => {
    if (!selectedProductId) {
      setProductError('Produit requis');
      return;
    }
    if (!data.supplierId) {
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
    if (productId) {
      setProductError(undefined);
    }
  };

  // Get supplier info for the selected supplier
  const selectedSupplier = suppliers?.find(s => s.id === supplierId);
  const productSupplierInfo = productSuppliers.find(ps => ps.supplierId === supplierId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Product */}
      <ProductSearch
        onChange={handleProductChange}
        error={productError}
        initialProduct={preselectedProduct}
      />

      {/* Supplier */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Fournisseur *
        </label>
        <select
          {...register('supplierId', { required: 'Fournisseur requis' })}
          className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-gray-100 ${
            errors.supplierId
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600'
          }`}
        >
          <option value="">
            {selectedProduct
              ? (linkedSupplierIds.length > 0 ? 'Sélectionner un fournisseur' : 'Aucun fournisseur lié')
              : 'Sélectionner d\'abord un produit'}
          </option>
          {/* Show linked suppliers first */}
          {selectedProduct && linkedSupplierIds.length > 0 && (
            <optgroup label="Fournisseurs liés au produit">
              {productSuppliers.map(ps => {
                const supplier = suppliers?.find(s => s.id === ps.supplierId);
                if (!supplier) return null;
                return (
                  <option key={ps.supplierId} value={ps.supplierId}>
                    {supplier.name}
                    {ps.isPrimary && ' (Principal)'}
                    {ps.unitPrice && ` - ${Number(ps.unitPrice).toFixed(2)} €`}
                    {ps.leadTime && ` - Délai: ${ps.leadTime}`}
                  </option>
                );
              })}
            </optgroup>
          )}
          {/* Show other suppliers */}
          {suppliers && suppliers.filter(s => !linkedSupplierIds.includes(s.id)).length > 0 && (
            <optgroup label="Autres fournisseurs">
              {suppliers
                .filter(s => !linkedSupplierIds.includes(s.id))
                .map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
        {errors.supplierId && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.supplierId.message}</p>
        )}
      </div>

      {/* Quantity */}
      <Input
        id="quantity"
        type="number"
        label="Quantité *"
        min={1}
        error={errors.quantity?.message}
        {...register('quantity', { required: 'Quantité requise', min: { value: 1, message: 'Minimum 1' } })}
      />

      {/* Order Date */}
      <Input
        id="orderDate"
        type="date"
        label="Date de commande *"
        error={errors.orderDate?.message}
        {...register('orderDate', { required: 'Date requise' })}
      />

      {/* Expected Date */}
      <Input
        id="expectedDate"
        type="date"
        label="Date de livraison prévue"
        error={errors.expectedDate?.message}
        {...register('expectedDate')}
      />

      {/* Destination Site */}
      <Select
        id="destinationSiteId"
        label="Site de destination"
        error={errors.destinationSiteId?.message}
        {...register('destinationSiteId')}
      >
        <option value="">Sélectionner le site de destination</option>
        {storageSites.map(site => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </Select>

      {/* Supplier Reference */}
      <Input
        id="supplierRef"
        type="text"
        label="Référence fournisseur / N° commande"
        placeholder="Ex: CMD-2024-001"
        error={errors.supplierRef?.message}
        {...register('supplierRef')}
      />

      {/* Responsible */}
      <Input
        id="responsible"
        type="text"
        label="Responsable"
        placeholder="Nom du responsable"
        error={errors.responsible?.message}
        {...register('responsible')}
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
        <p className="font-medium text-gray-900 dark:text-gray-100">Résumé de la commande :</p>
        <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
          {/* Produit */}
          <span className="text-gray-500">Produit :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {selectedProduct ? selectedProduct.reference : <span className="text-gray-400 italic">Non sélectionné</span>}
          </span>

          {/* Fournisseur */}
          <span className="text-gray-500">Fournisseur :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {selectedSupplier ? selectedSupplier.name : <span className="text-gray-400 italic">Non sélectionné</span>}
          </span>

          {/* Quantité */}
          <span className="text-gray-500">Quantité :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{quantity || 0}</span>

          {/* Date commande */}
          <span className="text-gray-500">Date commande :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {orderDate ? new Date(orderDate).toLocaleDateString('fr-FR') : '-'}
          </span>

          {/* Date prévue */}
          <span className="text-gray-500">Date livraison prévue :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {expectedDate ? new Date(expectedDate).toLocaleDateString('fr-FR') : <span className="text-gray-400 italic">Non définie</span>}
          </span>

          {/* Destination */}
          <span className="text-gray-500">Destination :</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {destinationSiteId
              ? storageSites.find(s => s.id === destinationSiteId)?.name
              : <span className="text-gray-400 italic">Non définie</span>}
          </span>

          {/* Réf fournisseur */}
          {supplierRef && (
            <>
              <span className="text-gray-500">Réf. fournisseur :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{supplierRef}</span>
            </>
          )}

          {/* Responsable */}
          {responsible && (
            <>
              <span className="text-gray-500">Responsable :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{responsible}</span>
            </>
          )}

          {/* Prix et total */}
          {productSupplierInfo?.unitPrice && (
            <>
              <span className="text-gray-500">Prix unitaire :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {Number(productSupplierInfo.unitPrice).toFixed(2)} €
              </span>

              {productSupplierInfo.shippingCost && (
                <>
                  <span className="text-gray-500">Frais de livraison :</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {Number(productSupplierInfo.shippingCost).toFixed(2)} €
                  </span>
                </>
              )}

              <span className="text-gray-500 font-medium">Total estimé :</span>
              <span className="font-bold text-primary-600 dark:text-primary-400">
                {(
                  Number(productSupplierInfo.unitPrice) * (quantity || 0) +
                  (productSupplierInfo.shippingCost ? Number(productSupplierInfo.shippingCost) : 0)
                ).toFixed(2)} € HT
              </span>
            </>
          )}

          {/* Délai fournisseur */}
          {productSupplierInfo?.leadTime && (
            <>
              <span className="text-gray-500">Délai fournisseur :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{productSupplierInfo.leadTime}</span>
            </>
          )}

          {/* Commentaire */}
          {comment && (
            <>
              <span className="text-gray-500">Commentaire :</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate" title={comment}>
                {comment.length > 50 ? comment.substring(0, 50) + '...' : comment}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" isLoading={createMutation.isPending}>
          Créer la commande
        </Button>
      </div>
    </form>
  );
}
