import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import api from '../../services/api';
import type { Order, ApiResponse } from '../../types';

interface ReceiveOrderFormData {
  receivedDate: string;
  receivedQty: number;
  condition: 'NEW' | 'USED';
  comment?: string;
}

interface ReceiveOrderFormProps {
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReceiveOrderForm({ orderId, onSuccess, onCancel }: ReceiveOrderFormProps) {
  const queryClient = useQueryClient();

  // Fetch order details
  const { data: order, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReceiveOrderFormData>({
    defaultValues: {
      receivedDate: new Date().toISOString().split('T')[0],
      receivedQty: order?.quantity || 1,
      condition: 'NEW',
      comment: '',
    },
  });

  const receivedQty = watch('receivedQty');
  const condition = watch('condition');

  const receiveMutation = useMutation({
    mutationFn: async (data: ReceiveOrderFormData) => {
      const payload = {
        ...data,
        receivedQty: Number(data.receivedQty),
        receivedDate: new Date(data.receivedDate).toISOString(),
        comment: data.comment || undefined,
      };
      const res = await api.post(`/orders/${orderId}/receive`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
      onSuccess();
    },
  });

  const onSubmit = (data: ReceiveOrderFormData) => {
    receiveMutation.mutate(data);
  };

  if (isLoadingOrder) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-8 text-center text-red-600 dark:text-red-400">
        Commande introuvable
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Order Info */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Détails de la commande</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-blue-700 dark:text-blue-300">Produit :</span>
          <span className="font-medium text-blue-900 dark:text-blue-100">{order.product.reference}</span>

          <span className="text-blue-700 dark:text-blue-300">Fournisseur :</span>
          <span className="font-medium text-blue-900 dark:text-blue-100">{order.supplier.name}</span>

          <span className="text-blue-700 dark:text-blue-300">Quantité commandée :</span>
          <span className="font-medium text-blue-900 dark:text-blue-100">{order.quantity}</span>

          <span className="text-blue-700 dark:text-blue-300">Destination :</span>
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {order.destinationSite?.name || 'Non définie'}
          </span>

          {order.supplierRef && (
            <>
              <span className="text-blue-700 dark:text-blue-300">Réf. fournisseur :</span>
              <span className="font-medium text-blue-900 dark:text-blue-100">{order.supplierRef}</span>
            </>
          )}
        </div>
      </div>

      {/* Received Date */}
      <Input
        id="receivedDate"
        type="date"
        label="Date de réception *"
        error={errors.receivedDate?.message}
        {...register('receivedDate', { required: 'Date requise' })}
      />

      {/* Received Quantity */}
      <Input
        id="receivedQty"
        type="number"
        label="Quantité reçue *"
        min={1}
        error={errors.receivedQty?.message}
        {...register('receivedQty', {
          required: 'Quantité requise',
          min: { value: 1, message: 'Minimum 1' },
        })}
      />

      {receivedQty && Number(receivedQty) !== order.quantity && (
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          <strong>Attention :</strong> La quantité reçue ({receivedQty}) diffère de la quantité commandée ({order.quantity}).
        </div>
      )}

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

      {/* Comment */}
      <div className="space-y-1">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Commentaire
        </label>
        <textarea
          id="comment"
          rows={2}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Commentaire optionnel..."
          {...register('comment')}
        />
      </div>

      {/* Error message */}
      {receiveMutation.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {(receiveMutation.error as any)?.response?.data?.error || 'Erreur lors de la réception'}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg bg-green-50 p-4 text-sm dark:bg-green-900/20">
        <p className="font-medium text-green-900 dark:text-green-100 mb-2">Cette action va :</p>
        <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300">
          <li>Marquer la commande comme <strong>terminée</strong></li>
          <li>
            Créer un mouvement d'<strong>entrée</strong> de {receivedQty || order.quantity} unité(s)
            {condition === 'NEW' ? ' (neuf)' : ' (occasion)'}
            vers <strong>{order.destinationSite?.name || 'le site de destination'}</strong>
          </li>
          <li>Mettre à jour le <strong>stock</strong> en conséquence</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" isLoading={receiveMutation.isPending}>
          Confirmer la réception
        </Button>
      </div>
    </form>
  );
}
