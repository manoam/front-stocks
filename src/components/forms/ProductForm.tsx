import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ImagePlus, X, Upload, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import api from '../../services/api';
import type { Product, CreateProductInput, SupplyRisk, ApiResponse, Assembly, AssemblyType, PaginatedResponse } from '../../types';

// API URL for image endpoint
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormDataWithImage extends CreateProductInput {
  imageData?: string | null;
  imageMimeType?: string | null;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [formData, setFormData] = useState<FormDataWithImage>({
    reference: '',
    description: '',
    qtyPerUnit: 1,
    supplyRisk: undefined,
    location: '',
    assemblyId: '',
    assemblyTypeId: '',
    comment: '',
    imageUrl: '',
    imageData: null,
    imageMimeType: null,
  });

  // Track if we have a new image to upload
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [hasExistingImage, setHasExistingImage] = useState(false);

  // Fetch assembly types for filter
  const { data: assemblyTypesData } = useQuery({
    queryKey: ['assembly-types'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AssemblyType>>('/assembly-types?limit=100');
      return res.data;
    },
  });

  // Fetch assemblies for select
  const { data: assembliesData } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Assembly>>('/assemblies?limit=100');
      return res.data;
    },
  });

  // Filter assemblies by selected type
  const filteredAssemblies = formData.assemblyTypeId
    ? assembliesData?.data.filter((assembly) =>
        assembly.assemblyTypes?.some((at: any) =>
          at.assemblyTypeId === formData.assemblyTypeId || at.id === formData.assemblyTypeId
        )
      )
    : assembliesData?.data;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        reference: product.reference,
        description: product.description || '',
        qtyPerUnit: product.qtyPerUnit,
        supplyRisk: product.supplyRisk,
        location: product.location || '',
        assemblyId: product.assemblyId || '',
        assemblyTypeId: product.assemblyTypeId || '',
        comment: product.comment || '',
        imageUrl: product.imageUrl || '',
        imageData: null,
        imageMimeType: null,
      });
      // Check if product has an existing image
      if (product.imageUrl) {
        setHasExistingImage(true);
        setPreviewUrl(`${API_URL}/upload/image/${product.id}?t=${Date.now()}`);
      }
    }
  }, [product]);

  const createMutation = useMutation({
    mutationFn: async (data: FormDataWithImage) => {
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
    mutationFn: async (data: FormDataWithImage) => {
      const res = await api.put<ApiResponse<Product>>(`/products/${product!.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product!.id] });
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

  const handleChange = (field: keyof FormDataWithImage, value: string | number | undefined | null) => {
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

    const data: FormDataWithImage = {
      ...formData,
      qtyPerUnit: formData.qtyPerUnit || 1,
      supplyRisk: formData.supplyRisk || undefined,
      assemblyId: formData.assemblyId || undefined,
      assemblyTypeId: formData.assemblyTypeId || undefined,
    };

    // If we have new image data, include it
    if (formData.imageData) {
      data.imageData = formData.imageData;
      data.imageMimeType = formData.imageMimeType;
      data.imageUrl = '/api/upload/image/'; // Will be updated with product ID
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP' }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Le fichier ne doit pas dépasser 5 Mo' }));
      return;
    }

    setIsUploading(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.image;
      return newErrors;
    });

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data:image/...;base64, prefix
        setFormData(prev => ({
          ...prev,
          imageData: base64,
          imageMimeType: file.type,
          imageUrl: 'pending', // Mark as having an image
        }));
        // Create preview URL
        setPreviewUrl(URL.createObjectURL(file));
        setHasExistingImage(false);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, image: 'Erreur lors de la lecture du fichier' }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, image: 'Erreur lors du traitement de l\'image' }));
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      imageUrl: '',
      imageData: null,
      imageMimeType: null,
    }));
    setPreviewUrl('');
    setHasExistingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasImage = previewUrl || hasExistingImage;

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
            Type d'assemblage
          </label>
          <Select
            value={formData.assemblyTypeId || ''}
            onChange={(e) => {
              handleChange('assemblyTypeId', e.target.value || undefined);
              // Reset assembly if changing type filter
              if (e.target.value && formData.assemblyId) {
                const assembly = assembliesData?.data.find(a => a.id === formData.assemblyId);
                const hasType = assembly?.assemblyTypes?.some((at: any) =>
                  at.assemblyTypeId === e.target.value || at.id === e.target.value
                );
                if (!hasType) {
                  handleChange('assemblyId', undefined);
                }
              }
            }}
          >
            <option value="">Aucun type</option>
            {assemblyTypesData?.data.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Assemblage
          </label>
          <Select
            value={formData.assemblyId || ''}
            onChange={(e) => handleChange('assemblyId', e.target.value || undefined)}
          >
            <option value="">Aucun assemblage</option>
            {filteredAssemblies?.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
              </option>
            ))}
          </Select>
        </div>
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

      {/* Image Upload */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Image du produit
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        {hasImage ? (
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <img
                src={previewUrl}
                alt="Aperçu"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Changer
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <X className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:bg-gray-700"
          >
            {isUploading ? (
              <div className="flex flex-col items-center text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="mt-2 text-sm">Traitement...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                <ImagePlus className="h-8 w-8" />
                <span className="mt-2 text-sm">Cliquez pour ajouter une image</span>
                <span className="text-xs text-gray-400">JPEG, PNG, GIF, WebP (max 5 Mo)</span>
              </div>
            )}
          </button>
        )}
        {errors.image && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.image}</p>
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
