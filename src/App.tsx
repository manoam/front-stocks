import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Stocks from './pages/Stocks';
import Movements from './pages/Movements';
import Orders from './pages/Orders';
import Suppliers from './pages/Suppliers';
import Sites from './pages/Sites';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import ProductDetail from './pages/ProductDetail';
import SupplierDetail from './pages/SupplierDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="stocks" element={<Stocks />} />
              <Route path="movements" element={<Movements />} />
              <Route path="orders" element={<Orders />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="suppliers/:id" element={<SupplierDetail />} />
              <Route path="sites" element={<Sites />} />
              <Route path="import-export" element={<ImportExport />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
