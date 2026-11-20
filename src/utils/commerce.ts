import {
  BundleItem,
  CartItem,
  CheckoutFormInput,
  OrderItem,
  OrderStatus,
  Product,
  TERMINAL_ORDER_STATUSES,
  UserRole,
} from '../types/campuscart';

export const ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidEntityId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export interface OrderTotals {
  productSubtotal: number;
  deliveryFee: number;
  orderTotal: number;
  itemCount: number;
}

export function calculateOrderTotals(
  items: Array<{ price?: number; unitPrice?: number; quantity: number }>,
  deliveryFee: number
): OrderTotals {
  const safeFee = Number.isFinite(deliveryFee) && deliveryFee >= 0 ? Math.round(deliveryFee) : 0;
  let productSubtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const unit = item.price ?? item.unitPrice ?? 0;
    const qty = Math.max(0, Math.floor(item.quantity));
    if (unit > 0 && qty > 0) {
      productSubtotal += unit * qty;
      itemCount += qty;
    }
  }

  const roundedSubtotal = Math.round(productSubtotal * 100) / 100;
  const orderTotal = itemCount > 0 ? Math.round((roundedSubtotal + safeFee) * 100) / 100 : 0;

  return {
    productSubtotal: roundedSubtotal,
    deliveryFee: itemCount > 0 ? safeFee : 0,
    orderTotal,
    itemCount,
  };
}

export function calculateBundleTotalFromProducts(
  selections: Array<{ productId: string; quantity: number }>,
  products: Product[]
): { items: BundleItem[]; originalTotal: number } {
  const map = new Map(products.map((p) => [p.id, p]));
  const items: BundleItem[] = [];
  let originalTotal = 0;

  for (const sel of selections) {
    const prod = map.get(sel.productId);
    const qty = Math.max(1, Math.floor(sel.quantity));
    if (prod) {
      items.push({
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice: prod.price,
      });
      originalTotal += prod.price * qty;
    }
  }

  return {
    items,
    originalTotal: Math.round(originalTotal * 100) / 100,
  };
}

export function checkSingleRetailerConflict(
  cartItems: CartItem[],
  candidateStoreId: string
): { hasConflict: boolean; existingStoreName: string | null; existingStoreId: string | null } {
  if (cartItems.length === 0) {
    return { hasConflict: false, existingStoreName: null, existingStoreId: null };
  }
  const currentStoreId = cartItems[0].storeId;
  if (currentStoreId !== candidateStoreId) {
    return {
      hasConflict: true,
      existingStoreId: currentStoreId,
      existingStoreName: cartItems[0].storeName,
    };
  }
  return { hasConflict: false, existingStoreName: null, existingStoreId: null };
}

export function sanitizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function isConfiguredWhatsappNumber(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export interface WhatsAppMessagePayload {
  orderRef?: string;
  storeName: string;
  customerName: string;
  customerMobile: string;
  hostelOrPg: string;
  roomDetails: string;
  landmark?: string;
  deliveryInstructions?: string;
  items: OrderItem[];
  productSubtotal: number;
  deliveryFee: number;
  orderTotal: number;
  paymentMethod: 'COD' | 'UPI';
}

export function generateWhatsAppOrderMessage(payload: WhatsAppMessagePayload): string {
  const addressParts = [
    payload.hostelOrPg.trim(),
    payload.roomDetails.trim(),
    payload.landmark?.trim() ? `Near ${payload.landmark.trim()}` : '',
  ].filter(Boolean);

  const itemLines = payload.items.map(
    (item, index) => `${index + 1}. ${item.productName} × ${item.quantity} = ₹${item.lineTotal}`
  );

  const lines = [
    'Hello CampusCart,',
    '',
    'I would like to place the following order.',
    ...(payload.orderRef ? [`Order Ref: ${payload.orderRef}`] : []),
    `Store: ${payload.storeName}`,
    '',
    `Customer: ${payload.customerName.trim()}`,
    `Mobile: ${payload.customerMobile.trim()}`,
    `Hostel/PG: ${addressParts.join(', ')}`,
    ...(payload.deliveryInstructions?.trim()
      ? [`Instructions: ${payload.deliveryInstructions.trim()}`]
      : []),
    `Preferred Payment: ${payload.paymentMethod === 'UPI' ? 'UPI (Manual Coordination)' : 'Cash on Delivery'}`,
    '',
    'Items:',
    '',
    ...itemLines,
    '',
    `Product Subtotal: ₹${payload.productSubtotal}`,
    `Delivery/Service Fee: ₹${payload.deliveryFee}`,
    `Total: ₹${payload.orderTotal}`,
    '',
    'Please confirm product availability and delivery details.',
    '',
    'Thank you.',
  ];

  return lines.join('\n');
}

export function buildWhatsAppClickToChatUrl(
  rawWhatsappNumber: string | undefined | null,
  message: string
): string | null {
  if (!isConfiguredWhatsappNumber(rawWhatsappNumber)) {
    return null;
  }
  const normalized = sanitizeWhatsappNumber(rawWhatsappNumber!);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export interface CheckoutValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CheckoutFormInput, string>>;
}

export function validateCheckoutForm(input: CheckoutFormInput): CheckoutValidationResult {
  const errors: Partial<Record<keyof CheckoutFormInput, string>> = {};

  const name = input.customerName.trim();
  if (name.length < 2) {
    errors.customerName = 'Please enter your full name (at least 2 characters).';
  } else if (name.length > 100) {
    errors.customerName = 'Name must be 100 characters or fewer.';
  }

  const digits = input.customerMobile.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 12) {
    errors.customerMobile = 'Enter a valid 10-digit Indian mobile number.';
  }

  const hostel = input.hostelOrPg.trim();
  if (hostel.length < 2) {
    errors.hostelOrPg = 'Select or enter your hostel or PG name in Selaqui / DGU.';
  } else if (hostel.length > 120) {
    errors.hostelOrPg = 'Hostel/PG name must be 120 characters or fewer.';
  }

  const room = input.roomDetails.trim();
  if (room.length < 1) {
    errors.roomDetails = 'Enter your room number, floor, or gate drop details.';
  } else if (room.length > 120) {
    errors.roomDetails = 'Room details must be 120 characters or fewer.';
  }

  if (input.landmark.trim().length > 140) {
    errors.landmark = 'Landmark must be 140 characters or fewer.';
  }

  if (input.deliveryInstructions.trim().length > 240) {
    errors.deliveryInstructions = 'Delivery instructions must be 240 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  role: UserRole
): boolean {
  if (currentStatus === nextStatus) return true;
  if (role === 'admin') return true;

  if (TERMINAL_ORDER_STATUSES.includes(currentStatus)) {
    return false;
  }

  if (role === 'student') {
    return (
      (currentStatus === 'Draft' || currentStatus === 'Pending Retailer Confirmation') &&
      nextStatus === 'Cancelled'
    );
  }

  if (role === 'retailer') {
    if (nextStatus === 'Draft') return false;
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      Draft: ['Pending Retailer Confirmation', 'Cancelled'],
      'Pending Retailer Confirmation': ['Accepted', 'Rejected', 'Confirmed', 'Cancelled'],
      Accepted: ['Confirmed', 'Out for Delivery', 'Completed', 'Cancelled'],
      Confirmed: ['Out for Delivery', 'Completed', 'Cancelled'],
      'Out for Delivery': ['Completed', 'Cancelled'],
      Rejected: [],
      Completed: [],
      Cancelled: [],
    };
    return allowedTransitions[currentStatus].includes(nextStatus);
  }

  return false;
}

export function generateOrderReference(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `CC-${yy}${mm}${dd}-${suffix}`;
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}
