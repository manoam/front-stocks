import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  Boxes,
  FileDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';

interface ImportPreview {
  fileName: string;
  sheets: Record<string, {
    headers: string[];
    rows: number;
    sample: any[];
  }>;
  availableSheets: string[];
}

interface ImportResultData {
  created: number;
  updated?: number;
  errors: string[];
}

interface ImportResult {
  products: ImportResultData;
  suppliers: ImportResultData;
  productSuppliers: ImportResultData;
  sites: ImportResultData;
  stocks: ImportResultData;
  movements: ImportResultData;
  orders: ImportResultData;
}

// Helper functions (outside component for better performance)
const getTotalErrors = (result: ImportResult) => {
  return (
    result.products.errors.length +
    result.suppliers.errors.length +
    result.productSuppliers.errors.length +
    result.sites.errors.length +
    result.stocks.errors.length +
    result.movements.errors.length +
    result.orders.errors.length
  );
};

const getTotalCreated = (result: ImportResult) => {
  return (
    result.products.created +
    result.suppliers.created +
    result.productSuppliers.created +
    result.sites.created +
    result.stocks.created +
    result.movements.created +
    result.orders.created
  );
};

const getTotalUpdated = (result: ImportResult) => {
  return (
    (result.products.updated || 0) +
    (result.suppliers.updated || 0) +
    (result.productSuppliers.updated || 0) +
    (result.stocks.updated || 0)
  );
};

export default function ImportExport() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data as ImportPreview;
    },
    onSuccess: (data) => {
      setPreview(data);
      setImportResult(null);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      const totalCreated = getTotalCreated(data);
      const totalErrors = getTotalErrors(data);
      if (totalErrors > 0) {
        toast.warning('Import terminé avec avertissements', `${totalCreated} éléments importés, ${totalErrors} erreurs`);
      } else {
        toast.success('Import réussi', `${totalCreated} éléments ont été importés`);
      }
    },
    onError: () => {
      toast.error('Erreur d\'import', 'Impossible de traiter le fichier');
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setPreview(null);
    setImportResult(null);
    previewMutation.mutate(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = async () => {
    const response = await api.get('/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExport = async (endpoint: string, filename: string, format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const response = await api.get(`/export/${endpoint}?format=${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export réussi', `Fichier ${filename}.${format} téléchargé`);
    } catch {
      toast.error('Erreur d\'export', 'Impossible de générer le fichier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import / Export</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Importez vos données depuis Excel ou exportez vos données actuelles
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Glissez-déposez votre fichier Excel ici
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                ou
              </p>
              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                  Parcourir les fichiers
                </span>
              </label>
              <p className="text-xs text-gray-400 mt-4">
                Formats supportés: .xlsx, .xls, .csv (max 10 Mo)
              </p>
            </div>

            {/* Selected file */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} Ko
                    </p>
                  </div>
                </div>
                {previewMutation.isPending && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                )}
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Aperçu du fichier</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {preview.availableSheets.map(sheetName => {
                    const sheet = preview.sheets[sheetName];
                    if (!sheet) return null;
                    return (
                      <div key={sheetName} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {sheetName}
                          </span>
                          <Badge variant="default">{sheet.rows} lignes</Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          Colonnes: {sheet.headers.slice(0, 5).join(', ')}
                          {sheet.headers.length > 5 && ` +${sheet.headers.length - 5}`}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={handleImport}
                  isLoading={importMutation.isPending}
                  className="w-full"
                >
                  Lancer l'import
                </Button>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="space-y-3">
                <div className={`p-4 rounded-lg ${
                  getTotalErrors(importResult) > 0
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : 'bg-green-50 dark:bg-green-900/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getTotalErrors(importResult) > 0 ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Import terminé
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-green-600 dark:text-green-400">
                      {getTotalCreated(importResult)} créé(s)
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                      {getTotalUpdated(importResult)} mis à jour
                    </div>
                    <div className="text-red-600 dark:text-red-400">
                      {getTotalErrors(importResult)} erreur(s)
                    </div>
                  </div>
                </div>

                {/* Detailed results */}
                <div className="space-y-2 text-sm">
                  <ResultRow label="Produits" data={importResult.products} />
                  <ResultRow label="Fournisseurs" data={importResult.suppliers} />
                  <ResultRow label="Relations Prod-Fourn" data={importResult.productSuppliers} />
                  <ResultRow label="Sites" data={importResult.sites} />
                  <ResultRow label="Stocks" data={importResult.stocks} />
                  <ResultRow label="Mouvements" data={importResult.movements} />
                  <ResultRow label="Commandes" data={importResult.orders} />
                </div>
              </div>
            )}

            {/* Error */}
            {(previewMutation.error || importMutation.error) && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                {(previewMutation.error as any)?.response?.data?.error ||
                  (importMutation.error as any)?.response?.data?.error ||
                  'Erreur lors du traitement du fichier'}
              </div>
            )}

            {/* Download template */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                <FileDown className="h-4 w-4 mr-2" />
                Télécharger le modèle Excel
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Structure compatible avec le fichier Excel original (SYNTHESE, REF FOURNISSEURS, MVT CLASSIK, COMMANDES CLASSIK)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export All */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">
                Export complet
              </h4>
              <p className="text-sm text-primary-700 dark:text-primary-300 mb-3">
                Exportez toutes les données (produits, stocks, mouvements, commandes) dans un fichier Excel multi-feuilles compatible avec l'import
              </p>
              <Button onClick={() => handleExport('all', `export_complet_${new Date().toISOString().split('T')[0]}`)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exporter tout (Excel)
              </Button>
            </div>

            {/* Individual exports */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Exports individuels</h4>

              <ExportCard
                icon={Package}
                title="Produits (Synthèse)"
                description="Produits avec stocks et infos fournisseurs"
                onExportXlsx={() => handleExport('products', 'produits', 'xlsx')}
                onExportCsv={() => handleExport('products', 'produits', 'csv')}
              />

              <ExportCard
                icon={Boxes}
                title="Matrice Stock"
                description="Stock par produit et par site"
                onExportXlsx={() => handleExport('stock-matrix', 'matrice_stock', 'xlsx')}
                onExportCsv={() => handleExport('stock-matrix', 'matrice_stock', 'csv')}
              />

              <ExportCard
                icon={ArrowRightLeft}
                title="Mouvements"
                description="Historique des mouvements de stock"
                onExportXlsx={() => handleExport('movements', 'mouvements', 'xlsx')}
                onExportCsv={() => handleExport('movements', 'mouvements', 'csv')}
              />

              <ExportCard
                icon={ShoppingCart}
                title="Commandes"
                description="Liste des commandes fournisseurs"
                onExportXlsx={() => handleExport('orders', 'commandes', 'xlsx')}
                onExportCsv={() => handleExport('orders', 'commandes', 'csv')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper components
function ResultRow({ label, data }: { label: string; data: ImportResultData }) {
  const hasUpdated = 'updated' in data && data.updated !== undefined;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-green-600 dark:text-green-400">+{data.created}</span>
        {hasUpdated && <span className="text-blue-600 dark:text-blue-400">~{data.updated}</span>}
        {data.errors.length > 0 && (
          <span className="text-red-600 dark:text-red-400" title={data.errors.join('\n')}>!{data.errors.length}</span>
        )}
      </div>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  title,
  description,
  onExportXlsx,
  onExportCsv,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onExportXlsx: () => void;
  onExportCsv: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExportXlsx}>
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          CSV
        </Button>
      </div>
    </div>
  );
}
