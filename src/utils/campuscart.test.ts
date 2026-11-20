import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppClickToChatUrl,
  calculateBundleTotalFromProducts,
  calculateOrderTotals,
  canTransitionOrderStatus,
  checkSingleRetailerConflict,
  generateWhatsAppOrderMessage,
  isConfiguredWhatsappNumber,
  isValidEntityId,
  sanitizeWhatsappNumber,
  validateCheckoutForm,
} from './commerce';
import {
  calculateUnitEconomics,
  computePilotValidationProgress,
} from './unitEconomics';
import { Order, Product, Store } from '../types/campuscart';

test('calculateOrderTotals computes exact subtotal and adds configurable delivery fee', () => {
  const result = calculateOrderTotals(
    [
      { price: 45, quantity: 2 },
      { price: 110, quantity: 1 },
    ],
    20
  );
  assert.equal(result.productSubtotal, 200);
  assert.equal(result.deliveryFee, 20);
  assert.equal(result.orderTotal, 220);
  assert.equal(result.itemCount, 3);
});

test('calculateOrderTotals returns zero total when cart is empty', () => {
  const result = calculateOrderTotals([], 20);
  assert.equal(result.productSubtotal, 0);
  assert.equal(result.deliveryFee, 0);
  assert.equal(result.orderTotal, 0);
  assert.equal(result.itemCount, 0);
});

test('checkSingleRetailerConflict enforces Version 1 one-store-per-order guardrail', () => {
  const existingCart = [
    {
      productId: 'p1',
      productName: 'A4 Notebook',
      storeId: 'store-stationery',
      storeName: 'Demo Stationery',
      price: 60,
      unitLabel: '1 pc',
      imageUrl: '',
      quantity: 1,
    },
  ];
  assert.equal(checkSingleRetailerConflict(existingCart, 'store-stationery').hasConflict, false);
  const conflict = checkSingleRetailerConflict(existingCart, 'store-kirana');
  assert.equal(conflict.hasConflict, true);
  assert.equal(conflict.existingStoreId, 'store-stationery');
});

test('WhatsApp message formatter matches required structure and URL encodes cleanly', () => {
  const msg = generateWhatsAppOrderMessage({
    orderRef: 'CC-261120-1234',
    storeName: 'Demo Kirana Store',
    customerName: 'Aarav Verma',
    customerMobile: '9876543210',
    hostelOrPg: 'DGU Boys Hostel Block A',
    roomDetails: 'Room 204',
    landmark: 'Main Gate',
    items: [
      { productId: 'p1', productName: 'Instant Noodles (Pack of 4)', quantity: 1, unitPrice: 56, lineTotal: 56 },
      { productId: 'p2', productName: 'Cold Coffee Bottle', quantity: 2, unitPrice: 40, lineTotal: 80 },
    ],
    productSubtotal: 136,
    deliveryFee: 20,
    orderTotal: 156,
    paymentMethod: 'COD',
  });

  assert.match(msg, /Hello CampusCart,/);
  assert.match(msg, /Customer: Aarav Verma/);
  assert.match(msg, /Mobile: 9876543210/);
  assert.match(msg, /Hostel\/PG: DGU Boys Hostel Block A, Room 204, Near Main Gate/);
  assert.match(msg, /1\. Instant Noodles \(Pack of 4\) × 1 = ₹56/);
  assert.match(msg, /2\. Cold Coffee Bottle × 2 = ₹80/);
  assert.match(msg, /Product Subtotal: ₹136/);
  assert.match(msg, /Delivery\/Service Fee: ₹20/);
  assert.match(msg, /Total: ₹156/);
  assert.match(msg, /Please confirm product availability and delivery details\./);

  assert.equal(buildWhatsAppClickToChatUrl('', msg), null);
  assert.equal(isConfiguredWhatsappNumber('12345'), false);
  assert.equal(sanitizeWhatsappNumber('98765-43210'), '919876543210');

  const url = buildWhatsAppClickToChatUrl('9876543210', msg);
  assert.ok(url?.startsWith('https://wa.me/919876543210?text='));
});

test('validateCheckoutForm rejects empty required inputs instead of bypassing validation', () => {
  const invalid = validateCheckoutForm({
    customerName: '',
    customerMobile: '123',
    hostelOrPg: '',
    roomDetails: '',
    landmark: '',
    deliveryInstructions: '',
    paymentMethod: 'COD',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.customerName);
  assert.ok(invalid.errors.customerMobile);
  assert.ok(invalid.errors.hostelOrPg);
  assert.ok(invalid.errors.roomDetails);

  const valid = validateCheckoutForm({
    customerName: 'Tushar Sharma',
    customerMobile: '9876543210',
    hostelOrPg: 'Selaqui Main Road PG Cluster',
    roomDetails: 'Room 12, 2nd Floor',
    landmark: 'Near DGU Gate 2',
    deliveryInstructions: 'Call on arrival',
    paymentMethod: 'UPI',
  });
  assert.equal(valid.valid, true);
});

test('canTransitionOrderStatus locks terminal states for non-admins and restricts student actions', () => {
  assert.equal(canTransitionOrderStatus('Pending Retailer Confirmation', 'Cancelled', 'student'), true);
  assert.equal(canTransitionOrderStatus('Pending Retailer Confirmation', 'Completed', 'student'), false);
  assert.equal(canTransitionOrderStatus('Pending Retailer Confirmation', 'Accepted', 'retailer'), true);
  assert.equal(canTransitionOrderStatus('Pending Retailer Confirmation', 'Draft', 'retailer'), false);
  assert.equal(canTransitionOrderStatus('Completed', 'Pending Retailer Confirmation', 'retailer'), false);
  assert.equal(canTransitionOrderStatus('Completed', 'Cancelled', 'admin'), true);
});

test('calculateBundleTotalFromProducts computes exact sum from real configured products', () => {
  const products: Product[] = [
    {
      id: 'p1',
      storeId: 's1',
      storeName: 'Store 1',
      retailerUid: 'r1',
      name: 'Notebook',
      category: 'Stationery',
      description: 'Ruled A4',
      imageUrl: '',
      price: 65,
      unitLabel: '1 pc',
      isAvailable: true,
      isDemo: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'p2',
      storeId: 's1',
      storeName: 'Store 1',
      retailerUid: 'r1',
      name: 'Gel Pen Pack',
      category: 'Stationery',
      description: '5 pens',
      imageUrl: '',
      price: 50,
      unitLabel: 'Pack of 5',
      isAvailable: true,
      isDemo: true,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const bundle = calculateBundleTotalFromProducts(
    [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ],
    products
  );
  assert.equal(bundle.originalTotal, 180);
  assert.equal(bundle.items.length, 2);
});

test('calculateUnitEconomics matches exact DGU Venture Quest base plan numbers', () => {
  const base = calculateUnitEconomics({
    serviceFee: 20,
    variableCost: 12,
    monthlyFixedCost: 3000,
    monthlyCustomers: 100,
    purchasesPerCustomer: 4,
  });

  assert.equal(base.contributionPerTxn, 8);
  assert.equal(base.contributionMarginPct, 40);
  assert.equal(base.expectedMonthlyTransactions, 400);
  assert.equal(base.expectedMonthlyRevenue, 8000);
  assert.equal(base.expectedMonthlyContribution, 3200);
  assert.equal(base.expectedMonthlySurplus, 200);
  assert.equal(base.breakEvenTransactions, 375);
  assert.equal(base.breakEvenCustomers, 94);
});

test('computePilotValidationProgress computes repeat purchase rate and active retailers accurately', () => {
  const mockOrderBase: Omit<Order, 'id' | 'customerId' | 'orderStatus'> = {
    orderRef: 'CC-1',
    customerName: 'Student',
    customerMobile: '9876543210',
    hostelOrPg: 'DGU Hostel',
    roomDetails: '101',
    storeId: 's1',
    storeName: 'Store 1',
    retailerUid: 'r1',
    items: [{ productId: 'p1', productName: 'Item', quantity: 1, unitPrice: 50, lineTotal: 50 }],
    productSubtotal: 50,
    deliveryFee: 20,
    orderTotal: 70,
    paymentMethod: 'COD',
    paymentStatus: 'Manually Verified',
    whatsappMessage: 'Hello',
    createdAt: '',
    updatedAt: '',
  };

  const orders: Order[] = [
    { ...mockOrderBase, id: 'o1', customerId: 'u1', orderStatus: 'Completed' },
    { ...mockOrderBase, id: 'o2', customerId: 'u1', orderStatus: 'Completed' },
    { ...mockOrderBase, id: 'o3', customerId: 'u2', orderStatus: 'Completed' },
    { ...mockOrderBase, id: 'o4', customerId: 'u3', orderStatus: 'Cancelled' },
  ];

  const stores: Store[] = [
    {
      id: 's1',
      name: 'Demo Kirana',
      ownerName: 'Owner',
      ownerUid: 'r1',
      phone: '',
      whatsappNumber: '',
      address: 'Selaqui',
      serviceAreaIds: ['a1'],
      category: 'Groceries',
      operatingHours: '8am-9pm',
      status: 'active',
      supportsCod: true,
      supportsUpi: false,
      isPharmacyLicensed: false,
      isDemo: true,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const summary = computePilotValidationProgress(orders, stores, [
    {
      id: 'f1',
      customerId: 'u1',
      customerName: 'Student',
      hostelOrPg: 'DGU Hostel',
      willingToPay20: 'yes',
      rating: 5,
      comment: 'Helpful',
      createdAt: '',
    },
    {
      id: 'f2',
      customerId: 'u2',
      customerName: 'Student 2',
      hostelOrPg: 'Selaqui PG',
      willingToPay20: 'no',
      rating: 3,
      comment: 'Fee feels high',
      createdAt: '',
    },
  ]);

  assert.equal(summary.uniquePayingCustomers, 2);
  assert.equal(summary.repeatCustomerCount, 1);
  assert.equal(summary.repeatPurchaseRatePct, 50);
  assert.equal(summary.activeRetailersTotal, 1);
  assert.equal(summary.activeVerifiedRetailers, 0);
  assert.equal(summary.willingToPayYesPct, 50);
});

test('isValidEntityId matches Firestore blueprint ID pattern', () => {
  assert.equal(isValidEntityId('store_selaqui-01'), true);
  assert.equal(isValidEntityId('bad/id/path'), false);
  assert.equal(isValidEntityId(''), false);
});
