import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Package,
  Truck,
  MapPin,
  Calendar,
  Link,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  ExternalLink,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ProductForm from '../components/forms/ProductForm';
import ProductSupplierForm from '../components/forms/ProductSupplierForm';
import MovementForm from '../components/forms/MovementForm';
import api from '../services/api';
import type { Product, ApiResponse } from '../types';

// Helper to get image URL from API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getImageUrl = (productId: string) => {
  return `${API_URL}/upload/image/${productId}`;
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const getRiskBadge = (risk?: string) => {
    if (!risk) return <Badge>Non défini</Badge>;
    const variants: Record<string, 'danger' | 'warning' | 'success'> = {
      HIGH: 'danger',
      MEDIUM: 'warning',
      LOW: 'success',
    };
    const labels: Record<string, string> = {
      HIGH: 'Fort',
      MEDIUM: 'Moyen',
      LOW: 'Faible',
    };
    return <Badge variant={variants[risk]}>{labels[risk]}</Badge>;
  };

  const getTotalStock = () => {
    if (!data?.stocks) return { total: 0, neuf: 0, occasion: 0 };
    return data.stocks.reduce(
      (acc, s) => ({
        total: acc.total + s.quantityNew + s.quantityUsed,
        neuf: acc.neuf + s.quantityNew,
        occasion: acc.occasion + s.quantityUsed,
      }),
      { total: 0, neuf: 0, occasion: 0 }
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'OUT':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'TRANSFER':
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Produit non trouvé</p>
        <Button variant="secondary" onClick={() => navigate('/products')} className="mt-4">
          Retour aux produits
        </Button>
      </div>
    );
  }

  const stockInfo = getTotalStock();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {data.imageUrl && (
            <div className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <img
                src={getImageUrl(data.id)}
                alt={data.reference}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reference}</h1>
            {data.description && (
              <p className="text-gray-600 dark:text-gray-400">{data.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsMovementModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Mouvement
          </Button>
          <Button variant="secondary" onClick={() => setIsSupplierModalOpen(true)}>
            <Link className="mr-2 h-4 w-4" />
            Fournisseurs
          </Button>
          <Button onClick={() => setIsEditModalOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations principales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Référence</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{data.reference}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantité par unité</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{data.qtyPerUnit}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Risque approvisionnement</dt>
                <dd className="mt-1">{getRiskBadge(data.supplyRisk)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Emplacement</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{data.location || '-'}</dd>
              </div>
              {data.assembly && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Assemblage</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100">
                    {data.assembly.name}
                    {data.assembly.assemblyTypes && data.assembly.assemblyTypes.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({data.assembly.assemblyTypes.map((t) => t.name).join(', ')})
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {data.comment && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Commentaire</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100">{data.comment}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Stock résumé */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">{stockInfo.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total en stock</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stockInfo.neuf}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Neuf</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">{stockInfo.occasion}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Occasion</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fournisseurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fournisseurs ({data.productSuppliers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.productSuppliers?.length ? (
            <p className="text-gray-500 dark:text-gray-400">Aucun fournisseur lié</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Fournisseur</th>
                    <th className="pb-2">Réf. fournisseur</th>
                    <th className="pb-2">Prix HT</th>
                    <th className="pb-2">Délai</th>
                    <th className="pb-2">Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.productSuppliers.map((ps) => (
                    <tr key={ps.id}>
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{ps.supplier.name}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{ps.supplierRef || '-'}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {ps.unitPrice ? `${Number(ps.unitPrice).toFixed(2)} €` : '-'}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{ps.leadTime || '-'}</td>
                      <td className="py-2">
                        {ps.isPrimary && (
                          <Badge variant="warning">Principal</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock par site */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Stock par site
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.stocks?.length ? (
            <p className="text-gray-500 dark:text-gray-400">Aucun stock enregistré</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Site</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Neuf</th>
                    <th className="pb-2 text-right">Occasion</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.stocks.map((stock) => (
                    <tr key={stock.id}>
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{stock.site.name}</td>
                      <td className="py-2">
                        <Badge variant={stock.site.type === 'STORAGE' ? 'success' : 'default'}>
                          {stock.site.type === 'STORAGE' ? 'Stockage' : 'Sortie'}
                        </Badge>
                      </td>
                      <td className="py-2 text-right text-green-600 dark:text-green-400">{stock.quantityNew}</td>
                      <td className="py-2 text-right text-orange-600 dark:text-orange-400">{stock.quantityUsed}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                        {stock.quantityNew + stock.quantityUsed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Derniers mouvements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique des mouvements
          </CardTitle>
          <RouterLink to={`/movements?productId=${id}`}>
            <Button variant="ghost" size="sm">
              Voir tout
              <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </RouterLink>
        </CardHeader>
        <CardContent>
          {!data.movements?.length ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun mouvement enregistré</p>
              <Button variant="secondary" onClick={() => setIsMovementModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un mouvement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Source</th>
                    <th className="pb-2">Destination</th>
                    <th className="pb-2">État</th>
                    <th className="pb-2 text-right">Quantité</th>
                    <th className="pb-2">Opérateur</th>
                    <th className="pb-2">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.movements.map((mvt) => (
                    <tr key={mvt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span>{new Date(mvt.movementDate).toLocaleDateString('fr-FR')}</span>
                          <span className="text-xs">
                            {new Date(mvt.movementDate).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(mvt.type)}
                          <Badge
                            variant={
                              mvt.type === 'IN' ? 'success' : mvt.type === 'OUT' ? 'danger' : 'info'
                            }
                          >
                            {mvt.type === 'IN' ? 'Entrée' : mvt.type === 'OUT' ? 'Sortie' : 'Transfert'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{mvt.sourceSite?.name || '-'}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{mvt.targetSite?.name || '-'}</td>
                      <td className="py-2">
                        <Badge variant={mvt.condition === 'NEW' ? 'success' : 'warning'}>
                          {mvt.condition === 'NEW' ? 'Neuf' : 'Occasion'}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <span className={`font-bold ${
                          mvt.type === 'IN'
                            ? 'text-green-600 dark:text-green-400'
                            : mvt.type === 'OUT'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {mvt.type === 'IN' ? '+' : mvt.type === 'OUT' ? '-' : ''}
                          {mvt.quantity}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{mvt.operator || '-'}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {mvt.comment ? (
                          <span className="truncate max-w-[100px] block" title={mvt.comment}>
                            {mvt.comment}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.movements.length >= 10 && (
                <div className="mt-4 text-center">
                  <RouterLink to={`/movements?productId=${id}`}>
                    <Button variant="ghost" size="sm">
                      Voir tous les mouvements
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </Button>
                  </RouterLink>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le produit"
        size="lg"
      >
        <ProductForm
          product={data}
          onSuccess={() => {
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['product', id] });
          }}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* Supplier Management Modal */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={`Fournisseurs - ${data.reference}`}
        size="lg"
      >
        <ProductSupplierForm
          product={data}
          onClose={() => setIsSupplierModalOpen(false)}
        />
      </Modal>

      {/* Movement Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={`Nouveau mouvement - ${data.reference}`}
        size="lg"
      >
        <MovementForm
          preselectedProductId={id}
          preselectedProduct={data}
          onSuccess={() => {
            setIsMovementModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['product', id] });
          }}
          onCancel={() => setIsMovementModalOpen(false)}
        />
      </Modal>

    </div>
  );
}
