// Enums
export type SupplyRisk = 'HIGH' | 'MEDIUM' | 'LOW';
export type MovementType = 'IN' | 'OUT' | 'TRANSFER';
export type ProductCondition = 'NEW' | 'USED';
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type SiteType = 'STORAGE' | 'EXIT';

// Base interfaces
export interface ProductGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  comment?: string;
  createdAt: string;
  _count?: {
    productSuppliers: number;
    orders: number;
  };
}

export interface Site {
  id: string;
  name: string;
  type: SiteType;
  address?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    stocks: number;
  };
}

export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  supplier: Supplier;
  supplierRef?: string;
  unitPrice?: number;
  leadTime?: string;
  productUrl?: string;
  shippingCost?: number;
  isPrimary: boolean;
  priceUpdatedAt?: string;
}

export interface Stock {
  id: string;
  productId: string;
  siteId: string;
  site: Site;
  quantityNew: number;
  quantityUsed: number;
  updatedAt: string;
}

export interface Product {
  id: string;
  reference: string;
  description?: string;
  qtyPerUnit: number;
  supplyRisk?: SupplyRisk;
  location?: string;
  groupId?: string;
  group?: ProductGroup;
  comment?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  productSuppliers?: ProductSupplier[];
  stocks?: Stock[];
  movements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  productId: string;
  product: Product;
  type: MovementType;
  sourceSiteId?: string;
  sourceSite?: Site;
  targetSiteId?: string;
  targetSite?: Site;
  quantity: number;
  condition: ProductCondition;
  movementDate: string;
  operator?: string;
  comment?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  productId: string;
  product: Product;
  supplierId: string;
  supplier: Supplier;
  quantity: number;
  status: OrderStatus;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  receivedQty?: number;
  destinationSiteId?: string;
  destinationSite?: Site;
  responsible?: string;
  supplierRef?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Dashboard types
export interface DashboardStats {
  totalProducts: number;
  totalSuppliers: number;
  totalSites: number;
  pendingOrders: number;
  completedOrdersThisMonth: number;
  totalItems: number;
  totalStockNew: number;
  totalStockUsed: number;
  totalStockValue: number;
  highRiskProducts: number;
  totalPossibleUnits: number;
}

export interface LowStockAlert {
  id: string;
  reference: string;
  description?: string;
  group?: string;
  qtyPerUnit: number;
  supplyRisk?: SupplyRisk;
  totalNew: number;
  totalUsed: number;
  total: number;
  possibleUnits: number;
  primarySupplier?: string;
  leadTime?: string;
}

export interface MovementsByDay {
  date: string;
  IN: number;
  OUT: number;
  TRANSFER: number;
}

export interface StockBySite {
  name: string;
  totalNew: number;
  totalUsed: number;
  productCount: number;
}

export interface TopProductStock {
  reference: string;
  group: string;
  totalNew: number;
  totalUsed: number;
  total: number;
}

export interface OrdersByMonth {
  month: string;
  pending: number;
  completed: number;
  cancelled: number;
  totalQty: number;
}

// Form types
export interface CreateProductInput {
  reference: string;
  description?: string;
  qtyPerUnit?: number;
  supplyRisk?: SupplyRisk;
  location?: string;
  groupId?: string;
  comment?: string;
  imageUrl?: string;
}

export interface CreateMovementInput {
  productId: string;
  type: MovementType;
  sourceSiteId?: string;
  targetSiteId?: string;
  quantity: number;
  condition: ProductCondition;
  movementDate: string;
  operator?: string;
  comment?: string;
}

export interface CreateOrderInput {
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

export interface ReceiveOrderInput {
  receivedDate: string;
  receivedQty: number;
  condition?: ProductCondition;
  comment?: string;
}
