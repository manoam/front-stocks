import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, FileSpreadsheet, Package, Users, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import api from '../services/api';
import type { Product, Supplier, Site, Stock, ApiResponse, PaginatedResponse } from '../types';

type ExportType = 'products' | 'suppliers' | 'sites' | 'stocks';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export default function ImportExport() {
  const queryClient = useQueryClient();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'products' | 'stocks'>('products');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState<ExportType | null>(null);

  // Fetch data for exports (limit=10000 requires server restart after schema update)
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'export'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Product>>('/products?limit=10000');
      return res.data.data;
    },
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', 'export'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Supplier>>('/suppliers?limit=10000');
      return res.data.data;
    },
  });

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites-export'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Site[]>>('/sites');
      return res.data.data;
    },
  });

  const { data: stocks, isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks-export'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Stock[]>>('/stocks');
      return res.data.data;
    },
  });

  const isLoadingData = productsLoading || suppliersLoading || sitesLoading || stocksLoading;

  // CSV generation helper
  const generateCSV = (headers: string[], rows: string[][]): string => {
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\n');
    return '\uFEFF' + csvContent; // BOM for Excel UTF-8
  };

  // Download helper
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export functions
  const exportProducts = () => {
    if (!products) return;
    setIsExporting('products');

    const headers = ['Référence', 'Description', 'Qté/Unité', 'Risque Appro', 'Emplacement', 'Fournisseur Principal', 'Commentaire'];
    const rows = products.map(p => [
      p.reference,
      p.description || '',
      p.qtyPerUnit.toString(),
      p.supplyRisk || '',
      p.location || '',
      p.productSuppliers?.find(ps => ps.isPrimary)?.supplier.name || '',
      p.comment || ''
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `produits_${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(null);
  };

  const exportSuppliers = () => {
    if (!suppliers) return;
    setIsExporting('suppliers');

    const headers = ['Nom', 'Contact', 'Email', 'Téléphone', 'Site Web', 'Adresse', 'Commentaire'];
    const rows = suppliers.map(s => [
      s.name,
      s.contact || '',
      s.email || '',
      s.phone || '',
      s.website || '',
      s.address || '',
      s.comment || ''
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `fournisseurs_${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(null);
  };

  const exportSites = () => {
    if (!sites) return;
    setIsExporting('sites');

    const headers = ['Nom', 'Type', 'Adresse', 'Actif'];
    const rows = sites.map(s => [
      s.name,
      s.type === 'STORAGE' ? 'Stockage' : 'Sortie',
      s.address || '',
      s.isActive ? 'Oui' : 'Non'
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `sites_${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(null);
  };

  const exportStocks = () => {
    if (!stocks || !products || !sites) return;
    setIsExporting('stocks');

    const headers = ['Référence Produit', 'Description', 'Site', 'Type Site', 'Quantité Neuf', 'Quantité Occasion', 'Total'];
    const rows: string[][] = [];

    // Group by product
    products.forEach(product => {
      const productStocks = stocks.filter(s => s.productId === product.id);
      if (productStocks.length > 0) {
        productStocks.forEach(stock => {
          rows.push([
            product.reference,
            product.description || '',
            stock.site?.name || '',
            stock.site?.type === 'STORAGE' ? 'Stockage' : 'Sortie',
            stock.quantityNew.toString(),
            stock.quantityUsed.toString(),
            (stock.quantityNew + stock.quantityUsed).toString()
          ]);
        });
      }
    });

    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `stocks_${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(null);
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await api.post<ApiResponse<ImportResult>>('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
    onError: (error: any) => {
      setImportResult({
        success: false,
        imported: 0,
        errors: [error.response?.data?.message || 'Erreur lors de l\'import']
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (importFile) {
      importMutation.mutate({ file: importFile, type: importType });
    }
  };

  const exportItems = [
    {
      type: 'products' as ExportType,
      title: 'Produits',
      description: 'Exporter la liste des produits avec leurs informations',
      icon: Package,
      count: products?.length || 0,
      action: exportProducts,
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30'
    },
    {
      type: 'suppliers' as ExportType,
      title: 'Fournisseurs',
      description: 'Exporter la liste des fournisseurs',
      icon: Users,
      count: suppliers?.length || 0,
      action: exportSuppliers,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      type: 'sites' as ExportType,
      title: 'Sites',
      description: 'Exporter la liste des sites de stockage',
      icon: MapPin,
      count: sites?.length || 0,
      action: exportSites,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      type: 'stocks' as ExportType,
      title: 'Stocks',
      description: 'Exporter l\'état actuel des stocks par site',
      icon: FileSpreadsheet,
      count: stocks?.length || 0,
      action: exportStocks,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter des données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Téléchargez vos données au format CSV (compatible Excel).
          </p>
          {isLoadingData && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              Chargement des données...
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {exportItems.map((item) => (
              <div
                key={item.type}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${item.bgColor}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{item.count} enregistrement(s)</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={item.action}
                  disabled={isExporting === item.type || item.count === 0}
                >
                  {isExporting === item.type ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      Export...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importer des données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Importez des données depuis un fichier CSV. Le fichier doit respecter le format d'export.
          </p>

          <div className="space-y-4">
            {/* Import type selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type de données
              </label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as 'products' | 'stocks')}
                className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="products">Produits</option>
                <option value="stocks">Stocks</option>
              </select>
            </div>

            {/* File input */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fichier CSV
              </label>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 transition-colors hover:border-primary-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-gray-800">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {importFile ? importFile.name : 'Choisir un fichier...'}
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {importFile && (
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Import...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importer
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Import result */}
            {importResult && (
              <div className={`rounded-lg p-4 ${importResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className={`font-medium ${importResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                      {importResult.success
                        ? `Import réussi : ${importResult.imported} enregistrement(s) importé(s)`
                        : 'Erreur lors de l\'import'}
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-sm text-red-600 dark:text-red-400">
                        {importResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Help text */}
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Format attendu
              </h4>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• Fichier CSV avec séparateur point-virgule (;)</li>
                <li>• Première ligne : en-têtes de colonnes</li>
                <li>• Encodage UTF-8 recommandé</li>
                <li>• Utilisez l'export pour obtenir un modèle</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
