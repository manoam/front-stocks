import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, MapPin, Filter, ArrowUpDown, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import api from '../services/api';
import type { Stock, Site, Product, ApiResponse, Assembly, PaginatedResponse, ProductAssembly } from '../types';

interface ProductWithAssemblies extends Product {
  productAssemblies?: ProductAssembly[];
}

interface StockWithDetails extends Stock {
  product: ProductWithAssemblies;
  site: Site;
}

interface MatrixRow {
  product: ProductWithAssemblies;
  stocks: Map<string, { quantityNew: number; quantityUsed: number }>;
  totalNew: number;
  totalUsed: number;
  total: number;
}

type SortField = 'reference' | 'totalNew' | 'totalUsed' | 'total';
type SortOrder = 'asc' | 'desc';

export default function Stocks() {
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedAssembly, setSelectedAssembly] = useState('');
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [sortField, setSortField] = useState<SortField>('reference');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Fetch stocks
  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<StockWithDetails[]>>('/stocks');
      return res.data.data;
    },
  });

  // Fetch sites for filter and matrix columns
  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Site[]>>('/sites');
      return res.data.data;
    },
  });

  // Fetch assemblies for filter
  const { data: assembliesData } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Assembly>>('/assemblies?limit=100');
      return res.data.data;
    },
  });

  // Storage sites only (for matrix columns)
  const storageSites = useMemo(() =>
    sites?.filter(s => s.type === 'STORAGE' && s.isActive) || [],
    [sites]
  );

  // Build matrix data
  const matrixData = useMemo(() => {
    if (!stocksData) return [];

    const productMap = new Map<string, MatrixRow>();

    stocksData.forEach((stock) => {
      if (!productMap.has(stock.productId)) {
        productMap.set(stock.productId, {
          product: stock.product,
          stocks: new Map(),
          totalNew: 0,
          totalUsed: 0,
          total: 0,
        });
      }

      const row = productMap.get(stock.productId)!;
      row.stocks.set(stock.siteId, {
        quantityNew: stock.quantityNew,
        quantityUsed: stock.quantityUsed,
      });
      row.totalNew += stock.quantityNew;
      row.totalUsed += stock.quantityUsed;
      row.total += stock.quantityNew + stock.quantityUsed;
    });

    return Array.from(productMap.values());
  }, [stocksData]);

  // Filter and sort
  const filteredData = useMemo(() => {
    let result = matrixData;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.product.reference.toLowerCase().includes(searchLower) ||
          row.product.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by site (show only products with stock in selected site)
    if (selectedSite) {
      result = result.filter((row) => {
        const siteStock = row.stocks.get(selectedSite);
        return siteStock && (siteStock.quantityNew > 0 || siteStock.quantityUsed > 0);
      });
    }

    // Filter by assembly (show only products in selected assembly)
    if (selectedAssembly) {
      result = result.filter((row) => {
        return row.product.productAssemblies?.some(
          (pa) => pa.assemblyId === selectedAssembly
        );
      });
    }

    // Filter zero stock products
    if (!showZeroStock) {
      result = result.filter((row) => row.total > 0);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'reference':
          comparison = a.product.reference.localeCompare(b.product.reference);
          break;
        case 'totalNew':
          comparison = a.totalNew - b.totalNew;
          break;
        case 'totalUsed':
          comparison = a.totalUsed - b.totalUsed;
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [matrixData, search, selectedSite, selectedAssembly, showZeroStock, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return (
      <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
    );
  };

  // Calculate site totals
  const siteTotals = useMemo(() => {
    const totals = new Map<string, { totalNew: number; totalUsed: number }>();
    storageSites.forEach((site) => totals.set(site.id, { totalNew: 0, totalUsed: 0 }));

    filteredData.forEach((row) => {
      row.stocks.forEach((stock, siteId) => {
        const current = totals.get(siteId);
        if (current) {
          current.totalNew += stock.quantityNew;
          current.totalUsed += stock.quantityUsed;
        }
      });
    });

    return totals;
  }, [filteredData, storageSites]);

  const grandTotal = useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        totalNew: acc.totalNew + row.totalNew,
        totalUsed: acc.totalUsed + row.totalUsed,
        total: acc.total + row.total,
      }),
      { totalNew: 0, totalUsed: 0, total: 0 }
    );
  }, [filteredData]);

  const renderStockCell = (quantityNew: number, quantityUsed: number) => {
    const total = quantityNew + quantityUsed;
    if (total === 0) {
      return <span className="text-gray-300 dark:text-gray-600">-</span>;
    }

    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
        {(quantityNew > 0 || quantityUsed > 0) && (
          <div className="flex gap-1 text-xs">
            {quantityNew > 0 && (
              <span className="text-green-600 dark:text-green-400" title="Neuf">
                {quantityNew}N
              </span>
            )}
            {quantityUsed > 0 && (
              <span className="text-orange-600 dark:text-orange-400" title="Occasion">
                {quantityUsed}O
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Gestion des Stocks
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vue matricielle des stocks par produit et par site
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <Select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-48"
              placeholder="Tous les sites"
            >
              <option value="">Tous les sites</option>
              {storageSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedAssembly}
              onChange={(e) => setSelectedAssembly(e.target.value)}
              className="w-48"
              placeholder="Tous les assemblages"
            >
              <option value="">Tous les assemblages</option>
              {assembliesData?.map((assembly) => (
                <option key={assembly.id} value={assembly.id}>
                  {assembly.name}
                </option>
              ))}
            </Select>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={showZeroStock}
                onChange={(e) => setShowZeroStock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
              />
              Afficher stocks à zéro
            </label>

            {(search || selectedSite || selectedAssembly || showZeroStock) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedSite('');
                  setSelectedAssembly('');
                  setShowZeroStock(false);
                }}
              >
                <Filter className="mr-1 h-4 w-4" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Produits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock neuf</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {grandTotal.totalNew}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock occasion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {grandTotal.totalUsed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sites actifs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {storageSites.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matrice des stocks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stocksLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              Aucun produit trouvé
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-400px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <th className="sticky left-0 z-30 bg-gray-50 px-4 py-3 text-left dark:bg-gray-800">
                      <button
                        onClick={() => handleSort('reference')}
                        className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      >
                        Produit
                        {getSortIcon('reference')}
                      </button>
                    </th>
                    {storageSites.map((site) => (
                      <th
                        key={site.id}
                        className="bg-gray-50 px-3 py-3 text-center font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <div className="flex flex-col items-center">
                          <span>{site.name}</span>
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {(siteTotals.get(site.id)?.totalNew || 0) +
                              (siteTotals.get(site.id)?.totalUsed || 0)}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="bg-gray-50 px-3 py-3 text-center dark:bg-gray-800">
                      <button
                        onClick={() => handleSort('totalNew')}
                        className="flex items-center gap-1 font-semibold text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        Neuf
                        {getSortIcon('totalNew')}
                      </button>
                    </th>
                    <th className="bg-gray-50 px-3 py-3 text-center dark:bg-gray-800">
                      <button
                        onClick={() => handleSort('totalUsed')}
                        className="flex items-center gap-1 font-semibold text-orange-700 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                      >
                        Occasion
                        {getSortIcon('totalUsed')}
                      </button>
                    </th>
                    <th className="bg-gray-50 px-3 py-3 text-center dark:bg-gray-800">
                      <button
                        onClick={() => handleSort('total')}
                        className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      >
                        Total
                        {getSortIcon('total')}
                      </button>
                    </th>
                    <th className="bg-gray-50 px-3 py-3 text-center font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr
                      key={row.product.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30 ${
                        index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {row.product.reference}
                          </span>
                          {row.product.description && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {row.product.description}
                            </span>
                          )}
                          {row.product.supplyRisk && (
                            <Badge
                              variant={
                                row.product.supplyRisk === 'HIGH'
                                  ? 'danger'
                                  : row.product.supplyRisk === 'MEDIUM'
                                  ? 'warning'
                                  : 'success'
                              }
                              className="mt-1 w-fit"
                            >
                              {row.product.supplyRisk === 'HIGH'
                                ? 'Risque fort'
                                : row.product.supplyRisk === 'MEDIUM'
                                ? 'Risque moyen'
                                : 'Risque faible'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      {storageSites.map((site) => {
                        const siteStock = row.stocks.get(site.id);
                        return (
                          <td key={site.id} className="px-3 py-3 text-center">
                            {renderStockCell(
                              siteStock?.quantityNew || 0,
                              siteStock?.quantityUsed || 0
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-medium text-green-600 dark:text-green-400">
                        {row.totalNew}
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-orange-600 dark:text-orange-400">
                        {row.totalUsed}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                        {row.total}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Link to={`/products/${row.product.id}`}>
                          <Button variant="ghost" size="sm" title="Voir le produit">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold dark:border-gray-600 dark:bg-gray-800">
                    <td className="sticky left-0 z-10 bg-gray-100 px-4 py-3 dark:bg-gray-800">
                      Total
                    </td>
                    {storageSites.map((site) => {
                      const siteTotal = siteTotals.get(site.id);
                      return (
                        <td key={site.id} className="px-3 py-3 text-center">
                          {renderStockCell(
                            siteTotal?.totalNew || 0,
                            siteTotal?.totalUsed || 0
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center text-green-600 dark:text-green-400">
                      {grandTotal.totalNew}
                    </td>
                    <td className="px-3 py-3 text-center text-orange-600 dark:text-orange-400">
                      {grandTotal.totalUsed}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-900 dark:text-gray-100">
                      {grandTotal.total}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      {filteredData.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filteredData.length} produit(s) affiché(s)
        </p>
      )}
    </div>
  );
}
