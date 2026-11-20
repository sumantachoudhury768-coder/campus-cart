export type UserRole = 'student' | 'retailer' | 'admin';

export type ProductCategory =
  | 'Groceries'
  | 'Snacks'
  | 'Beverages'
  | 'Stationery'
  | 'Personal Care'
  | 'Other Essentials'
  | 'Medicines';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Groceries',
  'Snacks',
  'Beverages',
  'Stationery',
  'Personal Care',
  'Other Essentials',
  'Medicines',
];

export type BundleCategory =
  | 'Hostel Essentials'
  | 'Study Essentials'
  | 'Late-Night Snacks'
  | 'Personal Care'
  | 'Monthly Essentials';

export const BUNDLE_CATEGORIES: BundleCategory[] = [
  'Hostel Essentials',
  'Study Essentials',
  'Late-Night Snacks',
  'Personal Care',
  'Monthly Essentials',
];

export type OrderStatus =
  | 'Draft'
  | 'Pending Retailer Confirmation'
  | 'Accepted'
  | 'Rejected'
  | 'Confirmed'
  | 'Out for Delivery'
  | 'Completed'
  | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'Draft',
  'Pending Retailer Confirmation',
  'Accepted',
  'Rejected',
  'Confirmed',
  'Out for Delivery',
  'Completed',
  'Cancelled',
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  'Completed',
  'Cancelled',
  'Rejected',
];

export type PaymentMethod = 'COD' | 'UPI';
export type PaymentStatus = 'Unverified' | 'Manually Verified' | 'Not Applicable';

export type StoreStatus = 'pending' | 'active' | 'suspended';

export interface UserPrivateProfile {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  hostelOrPg?: string;
  roomNumber?: string;
  landmark?: string;
  updatedAt: string;
}

export interface PlatformConfig {
  deliveryFee: number;
  pilotFeeDisclaimer: string;
  fallbackWhatsappNumber: string;
  enableCod: boolean;
  enableUpi: boolean;
  pilotRegionName: string;
  pilotBannerText: string;
  variableCostPerTxn: number;
  monthlyFixedCost: number;
  baseMonthlyCustomers: number;
  basePurchasesPerCustomer: number;
  updatedAt: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  clusterType: 'hostel' | 'pg' | 'campus';
  locality: string;
  city: string;
  isActive: boolean;
  deliveryEstimateNote?: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  name: string;
  ownerName: string;
  ownerUid: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  serviceAreaIds: string[];
  category: string;
  operatingHours: string;
  status: StoreStatus;
  deliveryNote?: string;
  supportsCod: boolean;
  supportsUpi: boolean;
  verifiedUpiId?: string;
  isPharmacyLicensed: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  retailerUid: string;
  name: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  price: number;
  unitLabel: string;
  isAvailable: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Bundle {
  id: string;
  name: string;
  category: BundleCategory;
  description: string;
  storeId: string;
  storeName: string;
  imageUrl: string;
  items: BundleItem[];
  originalTotal: number;
  promotionalPrice: number;
  hasPromotionalPrice: boolean;
  isActive: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  price: number;
  unitLabel: string;
  imageUrl: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderRef: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  hostelOrPg: string;
  roomDetails: string;
  landmark?: string;
  deliveryInstructions?: string;
  storeId: string;
  storeName: string;
  retailerUid: string;
  items: OrderItem[];
  productSubtotal: number;
  deliveryFee: number;
  orderTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  whatsappMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  customerId: string;
  customerName: string;
  hostelOrPg: string;
  orderRef?: string;
  willingToPay20: 'yes' | 'maybe' | 'no';
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CheckoutFormInput {
  customerName: string;
  customerMobile: string;
  hostelOrPg: string;
  roomDetails: string;
  landmark: string;
  deliveryInstructions: string;
  paymentMethod: PaymentMethod;
}

export type AppView =
  | 'home'
  | 'catalogue'
  | 'bundles'
  | 'checkout'
  | 'orders'
  | 'retailer'
  | 'admin';
