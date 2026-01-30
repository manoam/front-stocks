import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import api from '../../services/api';
import type { Product, CreateProductInput, SupplyRisk, ApiResponse } from '../../types';

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [formData, setFormData] = useState<CreateProductInput>({
    reference: '',
    description: '',
    qtyPerUnit: 1,
    supplyRisk: undefined,
    location: '',
    comment: '',
    imageUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        reference: product.reference,
        description: product.description || '',
        qtyPerUnit: product.qtyPerUnit,
        supplyRisk: product.supplyRisk,
        location: product.location || '',
        comment: product.comment || '',
        imageUrl: product.imageUrl || '',
      });
    }
  }, [product]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.post<ApiResponse<Product>>('/products', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onSuccess();
    },
    onError: (error: any) => {
      if (error.response?.data?.details) {
        const fieldErrors: Record<string, string> = {};
        error.response.data.details.forEach((e: { field: string; message: string }) => {
          fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.put<ApiResponse<Product>>(`/products/${product!.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onSuccess();
    },
    onError: (error: any) => {
      if (error.response?.data?.details) {
        const fieldErrors: Record<string, string> = {};
        error.response.data.details.forEach((e: { field: string; message: string }) => {
          fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
      }
    },
  });

  const handleChange = (field: keyof CreateProductInput, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reference.trim()) {
      newErrors.reference = 'La référence est requise';
    } else if (formData.reference.length > 50) {
      newErrors.reference = 'La référence ne doit pas dépasser 50 caractères';
    }

    if (formData.qtyPerUnit && formData.qtyPerUnit < 1) {
      newErrors.qtyPerUnit = 'La quantité doit être au moins 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      ...formData,
      qtyPerUnit: formData.qtyPerUnit || 1,
      supplyRisk: formData.supplyRisk || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Référence <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.reference}
            onChange={(e) => handleChange('reference', e.target.value)}
            placeholder="Ex: ABC123"
            disabled={isEditing}
            className={errors.reference ? 'border-red-500' : ''}
          />
          {errors.reference && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.reference}</p>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Quantité par unité
          </label>
          <Input
            type="number"
            min={1}
            value={formData.qtyPerUnit || ''}
            onChange={(e) => handleChange('qtyPerUnit', parseInt(e.target.value) || 1)}
            placeholder="1"
          />
          {errors.qtyPerUnit && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.qtyPerUnit}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <Input
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Description du produit"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Risque approvisionnement
          </label>
          <Select
            value={formData.supplyRisk || ''}
            onChange={(e) => handleChange('supplyRisk', e.target.value as SupplyRisk || undefined)}
          >
            <option value="">Non défini</option>
            <option value="LOW">Faible</option>
            <option value="MEDIUM">Moyen</option>
            <option value="HIGH">Fort</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Emplacement
          </label>
          <Input
            value={formData.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Ex: A1-B2"
          />
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Image du produit (URL)
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={formData.imageUrl || ''}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://exemple.com/image.jpg"
            />
          </div>
          {formData.imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleChange('imageUrl', '')}
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {formData.imageUrl && (
          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <img
                src={formData.imageUrl}
                alt="Aperçu"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <ImagePlus className="h-6 w-6" />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Aperçu de l'image</span>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Commentaire
        </label>
        <textarea
          value={formData.comment || ''}
          onChange={(e) => handleChange('comment', e.target.value)}
          placeholder="Notes ou commentaires..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
