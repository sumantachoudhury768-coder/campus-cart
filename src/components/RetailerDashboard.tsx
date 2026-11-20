import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Lock,
  Package,
  Plus,
  Store as StoreIcon,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { ASSET_IMAGES } from '../data/seedData';
import {
  OrderStatus,
  PRODUCT_CATEGORIES,
  Product,
  ProductCategory,
  TERMINAL_ORDER_STATUSES,
} from '../types/campuscart';
import { canTransitionOrderStatus, formatInr } from '../utils/commerce';

const IMAGE_PRESETS: Record<ProductCategory, string> = {
  Groceries: ASSET_IMAGES.groceries,
  Snacks: ASSET_IMAGES.snacks,
  Beverages: ASSET_IMAGES.snacks,
  Stationery: ASSET_IMAGES.stationery,
  'Personal Care': ASSET_IMAGES.personalCare,
  'Other Essentials': ASSET_IMAGES.bundle,
  Medicines: ASSET_IMAGES.personalCare,
};

export const RetailerDashboard: React.FC = () => {
  const {
    activeRole,
    isCloudMode,
    firebaseUser,
    ownedStoreIds,
    stores,
    products,
    orders,
    setDemoPreviewRole,
    setIsAccountModalOpen,
    saveProduct,
    toggleProductAvailability,
    deleteProduct,
    updateOrderStatus,
    saveStore,
  } = useCampusCart();

  const canAccess = activeRole === 'retailer' || activeRole === 'admin';

  const accessibleStores = useMemo(() => {
    if (activeRole === 'admin') return stores;
    if (firebaseUser) {
      return stores.filter((s) => ownedStoreIds.includes(s.id));
    }
    return stores;
  }, [activeRole, firebaseUser, ownedStoreIds, stores]);

  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    accessibleStores[0]?.id ?? stores[0]?.id ?? ''
  );
  const [tab, setTab] = useState<'orders' | 'products' | 'profile'>('orders');

  const currentStore =
    accessibleStores.find((s) => s.id === selectedStoreId) ?? accessibleStores[0] ?? null;

  // Product editor state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Groceries' as ProductCategory,
    description: '',
    price: '',
    unitLabel: '',
    isAvailable: true,
  });
  const [productFormError, setProductFormError] = useState('');

  // Store profile form state synced when switching store
  const [storeForm, setStoreForm] = useState({
    whatsappNumber: currentStore?.whatsappNumber ?? '',
    phone: currentStore?.phone ?? '',
    operatingHours: currentStore?.operatingHours ?? '',
    deliveryNote: currentStore?.deliveryNote ?? '',
    supportsCod: currentStore?.supportsCod ?? true,
    supportsUpi: currentStore?.supportsUpi ?? false,
    verifiedUpiId: currentStore?.verifiedUpiId ?? '',
  });

  useEffect(() => {
    if (!currentStore) return;
    setStoreForm({
      whatsappNumber: currentStore.whatsappNumber,
      phone: currentStore.phone,
      operatingHours: currentStore.operatingHours,
      deliveryNote: currentStore.deliveryNote ?? '',
      supportsCod: currentStore.supportsCod,
      supportsUpi: currentStore.supportsUpi,
      verifiedUpiId: currentStore.verifiedUpiId ?? '',
    });
  }, [currentStore]);

  const handleSelectStore = (id: string) => {
    setSelectedStoreId(id);
  };

  if (!canAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <Lock className="w-8 h-8 text-violet-800 mx-auto" />
          <h1 className="text-xl font-bold text-slate-950">
            Local Retailer Partner Portal (Restricted Access)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Retailer onboarding is controlled by the CampusCart Administrator. Sign in with an
            authorized partner Google account, or enter local capstone preview mode to test retailer
            workflows in this browser.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
            >
              Sign In with Google
            </button>
            {!isCloudMode && (
              <button
                type="button"
                onClick={() => setDemoPreviewRole('retailer')}
                className="px-5 py-2.5 text-sm font-semibold text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg"
              >
                Enter Local Retailer Preview
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14 text-center space-y-3">
        <StoreIcon className="w-8 h-8 text-slate-400 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">No store assigned to your account</h1>
        <p className="text-sm text-slate-600">
          Ask the CampusCart Administrator to link your account UID to an onboarded Selaqui store.
        </p>
      </div>
    );
  }

  const storeProducts = products.filter((p) => p.storeId === currentStore.id);
  const storeOrders = orders.filter((o) => o.storeId === currentStore.id);
  const pendingOrdersCount = storeOrders.filter(
    (o) => o.orderStatus === 'Pending Retailer Confirmation'
  ).length;

  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProductForm({
      name: p.name,
      category: p.category,
      description: p.description,
      price: String(p.price),
      unitLabel: p.unitLabel,
      isAvailable: p.isAvailable,
    });
    setProductFormError('');
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      category: 'Groceries',
      description: '',
      price: '',
      unitLabel: '',
      isAvailable: true,
    });
    setProductFormError('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(productForm.price);
    if (productForm.name.trim().length < 2) {
      setProductFormError('Product name must be at least 2 characters.');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setProductFormError('Enter a valid product price greater than ₹0.');
      return;
    }
    if (productForm.category === 'Medicines' && !currentStore.isPharmacyLicensed) {
      setProductFormError(
        'Medicines can only be listed by a verified licensed pharmacy approved by the administrator.'
      );
      return;
    }
    setProductFormError('');

    const isNew = !editingProductId;
    const productId = editingProductId ?? `prod_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    await saveProduct(
      {
        id: productId,
        storeId: currentStore.id,
        storeName: currentStore.name,
        retailerUid: currentStore.ownerUid,
        name: productForm.name.trim().slice(0, 120),
        category: productForm.category,
        description: (productForm.description.trim() || `${productForm.name.trim()} from ${currentStore.name}`).slice(0, 400),
        imageUrl: IMAGE_PRESETS[productForm.category] || ASSET_IMAGES.groceries,
        price: Math.round(numericPrice * 100) / 100,
        unitLabel: (productForm.unitLabel.trim() || '1 Unit').slice(0, 40),
        isAvailable: productForm.isAvailable,
        isDemo: currentStore.isDemo,
      },
      isNew
    );

    resetProductForm();
  };

  const handleSaveStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStore(
      {
        ...currentStore,
        whatsappNumber: storeForm.whatsappNumber.trim().slice(0, 20),
        phone: storeForm.phone.trim().slice(0, 20),
        operatingHours: storeForm.operatingHours.trim().slice(0, 80) || currentStore.operatingHours,
        deliveryNote: storeForm.deliveryNote.trim().slice(0, 200),
        supportsCod: storeForm.supportsCod,
        supportsUpi: storeForm.supportsUpi,
        verifiedUpiId: storeForm.verifiedUpiId.trim().slice(0, 100),
      },
      false
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-800">
            Local Retailer Partner Portal {!isCloudMode ? '· Local Browser Preview' : ''}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight mt-0.5">
            {currentStore.name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {currentStore.address} · Hours: {currentStore.operatingHours}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {accessibleStores.length > 1 && (
            <div>
              <label htmlFor="retailer-store-select" className="sr-only">
                Select store
              </label>
              <select
                id="retailer-store-select"
                value={currentStore.id}
                onChange={(e) => handleSelectStore(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                {accessibleStores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg">
            {(
              [
                { id: 'orders', label: `Orders (${storeOrders.length})`, icon: ClipboardList },
                { id: 'products', label: `Products (${storeProducts.length})`, icon: Package },
                { id: 'profile', label: 'Store Profile', icon: StoreIcon },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  tab === item.id
                    ? 'bg-white text-violet-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Confirmation</p>
          <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">{pendingOrdersCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Store Orders</p>
          <p className="text-2xl font-bold text-slate-950 tabular-nums mt-1">{storeOrders.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Available Products</p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {storeProducts.filter((p) => p.isAvailable).length} / {storeProducts.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">WhatsApp Number</p>
          <p className="text-sm font-semibold text-slate-900 mt-2 truncate font-mono">
            {currentStore.whatsappNumber || 'Not configured yet'}
          </p>
        </div>
      </div>

      {/* TAB 1: INCOMING ORDERS */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {storeOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
              <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">No incoming orders yet</h2>
              <p className="text-sm text-slate-600">
                When students submit WhatsApp orders for {currentStore.name}, they appear here for
                manual acceptance, fulfilment status updates, and payment verification.
              </p>
            </div>
          ) : (
            storeOrders.map((order) => {
              const isTerminal = TERMINAL_ORDER_STATUSES.includes(order.orderStatus);
              return (
                <article
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {order.orderRef} · {new Date(order.createdAt).toLocaleString('en-IN')}
                      </p>
                      <h3 className="text-base font-bold text-slate-950 mt-0.5">
                        {order.customerName} · {order.customerMobile}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Delivery: {order.hostelOrPg}, {order.roomDetails}
                        {order.landmark ? ` (Near ${order.landmark})` : ''}
                        {order.deliveryInstructions ? ` · Note: ${order.deliveryInstructions}` : ''}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-lg font-bold text-slate-950 tabular-nums">
                        {formatInr(order.orderTotal)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Items {formatInr(order.productSubtotal)} + Fee {formatInr(order.deliveryFee)}
                      </p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        Payment ({order.paymentMethod}): {order.paymentStatus}
                      </p>
                    </div>
                  </div>

                  <ul className="text-sm divide-y divide-slate-100">
                    {order.items.map((item, idx) => (
                      <li key={`${order.id}-${idx}`} className="py-1.5 flex justify-between">
                        <span className="text-slate-700">
                          {item.productName} × {item.quantity}
                        </span>
                        <span className="font-medium text-slate-900 tabular-nums">
                          {formatInr(item.lineTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {order.orderStatus === 'Pending Retailer Confirmation' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void updateOrderStatus(order.id, 'Accepted')}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                          >
                            Accept Order
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateOrderStatus(order.id, 'Rejected')}
                            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                          >
                            Reject Order
                          </button>
                        </>
                      )}

                      {!isTerminal && (
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`status-${order.id}`}
                            className="text-xs font-medium text-slate-600"
                          >
                            Update Status:
                          </label>
                          <select
                            id={`status-${order.id}`}
                            value={order.orderStatus}
                            onChange={(e) =>
                              void updateOrderStatus(order.id, e.target.value as OrderStatus)
                            }
                            className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                          >
                            {(
                              [
                                'Pending Retailer Confirmation',
                                'Accepted',
                                'Confirmed',
                                'Out for Delivery',
                                'Completed',
                                'Rejected',
                                'Cancelled',
                              ] as OrderStatus[]
                            )
                              .filter((st) =>
                                canTransitionOrderStatus(order.orderStatus, st, activeRole)
                              )
                              .map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {isTerminal && (
                        <span className="text-xs font-semibold text-slate-500">
                          Final Status: {order.orderStatus}
                        </span>
                      )}
                    </div>

                    {order.paymentStatus !== 'Manually Verified' && !isTerminal && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateOrderStatus(order.id, order.orderStatus, 'Manually Verified')
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Payment Manually Verified</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTS & BASIC AVAILABILITY */}
      {tab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add / Edit Form */}
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950">
                {editingProductId ? 'Edit Product' : 'Add Store Product'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>

            <div>
              <label htmlFor="rp-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                id="rp-name"
                type="text"
                required
                maxLength={120}
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Instant Coffee Jar 50g"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rp-cat" className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="rp-cat"
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, category: e.target.value as ProductCategory }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option
                      key={c}
                      value={c}
                      disabled={c === 'Medicines' && !currentStore.isPharmacyLicensed}
                    >
                      {c}
                      {c === 'Medicines' && !currentStore.isPharmacyLicensed
                        ? ' (Requires Verified Pharmacy)'
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rp-price" className="block text-xs font-semibold text-slate-700 mb-1">
                  Price (₹) *
                </label>
                <input
                  id="rp-price"
                  type="number"
                  min={1}
                  step="0.5"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="e.g., 55"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div>
              <label htmlFor="rp-unit" className="block text-xs font-semibold text-slate-700 mb-1">
                Pack / Unit Size
              </label>
              <input
                id="rp-unit"
                type="text"
                maxLength={40}
                value={productForm.unitLabel}
                onChange={(e) => setProductForm((f) => ({ ...f, unitLabel: e.target.value }))}
                placeholder="e.g., 250g Pack or 1 Bottle"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="rp-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                Short Description
              </label>
              <textarea
                id="rp-desc"
                rows={2}
                maxLength={400}
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={productForm.isAvailable}
                onChange={(e) => setProductForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                className="rounded border-slate-300 text-violet-800"
              />
              <span>Mark as currently available for WhatsApp orders</span>
            </label>

            {productFormError && (
              <p className="text-xs text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{productFormError}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>{editingProductId ? 'Update Product' : 'Add Product'}</span>
            </button>
          </form>

          {/* Product Availability Table */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-950">
                Store Catalogue ({storeProducts.length})
              </h2>
              <span className="text-xs text-slate-500">
                Manual availability control (MVP Version 1)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Product</th>
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Price</th>
                    <th className="py-2.5 px-4 font-semibold">Availability</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.unitLabel}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-slate-900">
                        {formatInr(p.price)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => void toggleProductAvailability(p.id, !p.isAvailable)}
                          aria-label={`Toggle availability for ${p.name}`}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            p.isAvailable ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {p.isAvailable ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                          <span>{p.isAvailable ? 'Available' : 'Unavailable'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditProduct(p)}
                          className="text-xs font-semibold text-violet-800 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteProduct(p.id)}
                          aria-label={`Delete ${p.name}`}
                          className="text-slate-400 hover:text-rose-600 inline-flex align-middle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STORE PROFILE */}
      {tab === 'profile' && (
        <form
          onSubmit={handleSaveStoreProfile}
          className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-950">Store Contact & WhatsApp Settings</h2>
            <p className="text-xs text-slate-600 mt-1">
              Enter your real 10-digit WhatsApp Business or shop number to activate direct
              WhatsApp Click-to-Chat ordering from student checkouts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="st-wa" className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Order Number
              </label>
              <input
                id="st-wa"
                type="tel"
                maxLength={20}
                value={storeForm.whatsappNumber}
                onChange={(e) => setStoreForm((s) => ({ ...s, whatsappNumber: e.target.value }))}
                placeholder="e.g., 919876543210"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label htmlFor="st-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Store Phone Number
              </label>
              <input
                id="st-phone"
                type="tel"
                maxLength={20}
                value={storeForm.phone}
                onChange={(e) => setStoreForm((s) => ({ ...s, phone: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="st-hours" className="block text-xs font-semibold text-slate-700 mb-1">
              Operating Hours
            </label>
            <input
              id="st-hours"
              type="text"
              maxLength={80}
              value={storeForm.operatingHours}
              onChange={(e) => setStoreForm((s) => ({ ...s, operatingHours: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="st-note" className="block text-xs font-semibold text-slate-700 mb-1">
              Basic Delivery Information
            </label>
            <textarea
              id="st-note"
              rows={2}
              maxLength={200}
              value={storeForm.deliveryNote}
              onChange={(e) => setStoreForm((s) => ({ ...s, deliveryNote: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-800">Accepted Payment Methods</p>
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={storeForm.supportsCod}
                  onChange={(e) => setStoreForm((s) => ({ ...s, supportsCod: e.target.checked }))}
                />
                <span>Cash on Delivery (COD)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={storeForm.supportsUpi}
                  onChange={(e) => setStoreForm((s) => ({ ...s, supportsUpi: e.target.checked }))}
                />
                <span>Manually Coordinated UPI</span>
              </label>
            </div>

            {storeForm.supportsUpi && (
              <div>
                <label htmlFor="st-upi" className="block text-xs font-semibold text-slate-700 mb-1">
                  Verified Store UPI ID (Shown to students only when configured)
                </label>
                <input
                  id="st-upi"
                  type="text"
                  maxLength={100}
                  value={storeForm.verifiedUpiId}
                  onChange={(e) => setStoreForm((s) => ({ ...s, verifiedUpiId: e.target.value }))}
                  placeholder="e.g., storename@upi"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
          >
            Save Store Settings
          </button>
        </form>
      )}
    </div>
  );
};
