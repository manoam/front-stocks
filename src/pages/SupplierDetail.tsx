import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Package,
  ShoppingCart,
  MessageSquare,
  Save,
  X,
  ExternalLink,
  Calendar,
  Clock,
  User,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import SupplierForm from '../components/forms/SupplierForm';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import type { Supplier, Order, ProductSupplier, ApiResponse } from '../types';

interface SupplierWithRelations extends Supplier {
  productSuppliers: (ProductSupplier & {
    product: {
      id: string;
      reference: string;
      description?: string;
      group?: { name: string };
    };
  })[];
  orders: Order[];
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SupplierWithRelations>>(`/suppliers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      await api.put(`/suppliers/${id}`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      setIsEditingComment(false);
      toast.success('Commentaire mis à jour', 'Le commentaire a été enregistré');
    },
    onError: () => {
      toast.error('Erreur', 'Impossible de mettre à jour le commentaire');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'success' | 'danger'> = {
      PENDING: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      COMPLETED: 'Reçue',
      CANCELLED: 'Annulée',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const startEditComment = () => {
    setCommentValue(data?.comment || '');
    setIsEditingComment(true);
  };

  const cancelEditComment = () => {
    setIsEditingComment(false);
    setCommentValue('');
  };

  const saveComment = () => {
    updateCommentMutation.mutate(commentValue);
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
        <p className="text-red-600 dark:text-red-400">Fournisseur non trouvé</p>
        <Button variant="secondary" onClick={() => navigate('/suppliers')} className="mt-4">
          Retour aux fournisseurs
        </Button>
      </div>
    );
  }

  const totalOrders = data.orders?.length || 0;
  const pendingOrders = data.orders?.filter((o) => o.status === 'PENDING').length || 0;
  const completedOrders = data.orders?.filter((o) => o.status === 'COMPLETED').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.name}</h1>
            {data.contact && (
              <p className="text-gray-600 dark:text-gray-400">Contact: {data.contact}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)}>
          <Edit2 className="mr-2 h-4 w-4" />
          Modifier
        </Button>
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
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{data.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{data.contact || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1">
                  {data.email ? (
                    <a
                      href={`mailto:${data.email}`}
                      className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <Mail className="h-4 w-4" />
                      {data.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Téléphone</dt>
                <dd className="mt-1">
                  {data.phone ? (
                    <a
                      href={`tel:${data.phone}`}
                      className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <Phone className="h-4 w-4" />
                      {data.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Site web</dt>
                <dd className="mt-1">
                  {data.website ? (
                    <a
                      href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <Globe className="h-4 w-4" />
                      {data.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</dt>
                <dd className="mt-1">
                  {data.address ? (
                    <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {data.address}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Résumé commandes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">{totalOrders}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total commandes</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{pendingOrders}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En attente</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{completedOrders}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reçues</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes / Commentaires */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes / Commentaires
          </CardTitle>
          {!isEditingComment && (
            <Button variant="ghost" size="sm" onClick={startEditComment}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingComment ? (
            <div className="space-y-3">
              <textarea
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                placeholder="Ajouter des notes ou commentaires sur ce fournisseur..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={cancelEditComment}>
                  <X className="mr-1 h-4 w-4" />
                  Annuler
                </Button>
                <Button size="sm" onClick={saveComment} disabled={updateCommentMutation.isPending}>
                  <Save className="mr-1 h-4 w-4" />
                  {updateCommentMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          ) : data.comment ? (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.comment}</p>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic">
              Aucune note. Cliquez sur l'icône pour en ajouter.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Produits associés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produits associés ({data.productSuppliers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.productSuppliers?.length ? (
            <p className="text-gray-500 dark:text-gray-400">Aucun produit associé à ce fournisseur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Référence</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Groupe</th>
                    <th className="pb-2">Réf. fournisseur</th>
                    <th className="pb-2 text-right">Prix HT</th>
                    <th className="pb-2">Délai</th>
                    <th className="pb-2">Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.productSuppliers.map((ps) => (
                    <tr key={ps.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2">
                        <RouterLink
                          to={`/products/${ps.product.id}`}
                          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {ps.product.reference}
                        </RouterLink>
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {ps.product.description || '-'}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {ps.product.group?.name || '-'}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{ps.supplierRef || '-'}</td>
                      <td className="py-2 text-right text-gray-900 dark:text-gray-100">
                        {ps.unitPrice ? `${Number(ps.unitPrice).toFixed(2)} €` : '-'}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{ps.leadTime || '-'}</td>
                      <td className="py-2">
                        {ps.isPrimary && <Badge variant="warning">Principal</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des commandes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique des commandes
          </CardTitle>
          <RouterLink to={`/orders?supplierId=${id}`}>
            <Button variant="ghost" size="sm">
              Voir tout
              <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </RouterLink>
        </CardHeader>
        <CardContent>
          {!data.orders?.length ? (
            <p className="text-gray-500 dark:text-gray-400">Aucune commande passée auprès de ce fournisseur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Produit</th>
                    <th className="pb-2 text-right">Quantité</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2">Date prévue</th>
                    <th className="pb-2">Destination</th>
                    <th className="pb-2">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="py-2">
                        <RouterLink
                          to={`/products/${order.productId}`}
                          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {order.product?.reference || order.productId}
                        </RouterLink>
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                        {order.quantity}
                        {order.status === 'COMPLETED' && order.receivedQty !== undefined && order.receivedQty !== order.quantity && (
                          <span className="ml-1 text-xs text-gray-400">
                            (reçu: {order.receivedQty})
                          </span>
                        )}
                      </td>
                      <td className="py-2">{getStatusBadge(order.status)}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {order.expectedDate ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(order.expectedDate).toLocaleDateString('fr-FR')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {order.destinationSite?.name || '-'}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {order.responsible ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {order.responsible}
                          </div>
                        ) : (
                          '-'
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

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le fournisseur"
        size="lg"
      >
        <SupplierForm
          supplier={data}
          onSuccess={() => {
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['supplier', id] });
            toast.success('Fournisseur modifié', 'Les informations ont été mises à jour');
          }}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
