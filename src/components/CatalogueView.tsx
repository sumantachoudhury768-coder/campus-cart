import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Info,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store as StoreIcon,
  X,
} from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { PRODUCT_CATEGORIES, Product } from '../types/campuscart';
import { formatInr } from '../utils/commerce';
import { ProductImage } from './ProductImage';

export const CatalogueView: React.FC = () => {
  const {
    products,
    stores,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    addToCart,
    cart,
    retailerConflict,
    resolveRetailerConflict,
    dataSourceMode,
    loadingCatalog,
  } = useCampusCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  const activeStores = useMemo(
    () => stores.filter((s) => s.status === 'active'),
    [stores]
  );

  const activeStoreIds = useMemo(
    () => new Set(activeStores.map((s) => s.id)),
    [activeStores]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (!activeStoreIds.has(p.storeId)) return false;
      if (selectedCategoryFilter !== 'All' && p.category !== selectedCategoryFilter) return false;
      if (selectedStoreId !== 'All' && p.storeId !== selectedStoreId) return false;
      if (onlyAvailable && !p.isAvailable) return false;
      if (q) {
        const hay = `${p.name} ${p.description} ${p.category} ${p.storeName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return [...list].sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
  }, [products, activeStoreIds, selectedCategoryFilter, selectedStoreId, onlyAvailable, searchQuery, sortBy]);

  const categoriesForFilter = useMemo(() => {
    const hasMedicines = products.some((p) => p.category === 'Medicines');
    return [
      'All',
      ...PRODUCT_CATEGORIES.filter((c) => c !== 'Medicines' || hasMedicines),
    ];
  }, [products]);

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [cart]);

  const openDetails = (product: Product) => {
    setDetailProduct(product);
    setDetailQty(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('All');
    setSelectedStoreId('All');
    setOnlyAvailable(false);
    setSortBy('featured');
  };

  const detailStore = detailProduct
    ? stores.find((s) => s.id === detailProduct.storeId)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Header & Honest Demo Notice */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Campus Essentials Catalogue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse products offered by local stores serving DGU Campus & Selaqui hostels/PGs.
            Availability reflects each retailer&apos;s latest manual update.
          </p>
        </div>

        <p className="text-xs text-slate-500 tabular-nums shrink-0">
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      {dataSourceMode === 'demo-seed' && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-amber-950">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Development Demo Catalogue:</strong> Displaying clearly labelled sample
            products and demo stores until verified Selaqui retailer partnerships are onboarded in
            the Admin Dashboard. Prices and stock statuses below are sample pilot configurations.
          </p>
        </div>
      )}

      {/* Search, Store Filter & Sort Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <label htmlFor="catalogue-search" className="sr-only">
              Search everyday essentials
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="catalogue-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groceries, noodles, notebooks, shampoo..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
            />
          </div>

          <div className="md:col-span-4">
            <label htmlFor="store-filter" className="sr-only">
              Filter by local retailer
            </label>
            <select
              id="store-filter"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-violet-600"
            >
              <option value="All">All Participating Stores ({activeStores.length})</option>
              {activeStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="price-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="price-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-violet-600"
            >
              <option value="featured">Sort: Availability First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Segmented Controls + Available Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
            role="tablist"
            aria-label="Product categories"
          >
            {categoriesForFilter.map((cat) => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-violet-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded border-slate-300 text-violet-800 focus:ring-violet-600"
            />
            <span>Available items only</span>
          </label>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loadingCatalog ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-9 bg-slate-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No matching products found</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Try searching a different term, clearing the store filter, or viewing unavailable items.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const inCartQty = cartQtyMap.get(product.id) ?? 0;
            return (
              <article
                key={product.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-violet-300 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openDetails(product)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-600"
                  aria-label={`View details for ${product.name}`}
                >
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className={!product.isAvailable ? 'opacity-65 grayscale-[30%]' : ''}
                  />
                </button>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">
                        {product.category} · {product.unitLabel}
                      </span>
                      <span
                        className={`font-semibold whitespace-nowrap shrink-0 ${
                          product.isAvailable ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {product.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDetails(product)}
                      className="text-left block w-full"
                    >
                      <h2 className="text-base font-bold text-slate-950 hover:text-violet-900 leading-snug">
                        {product.name}
                      </h2>
                    </button>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    <p className="text-xs text-slate-500 pt-1 truncate">
                      Retailer: <span className="text-slate-700 font-medium">{product.storeName}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-slate-950 tabular-nums">
                      {formatInr(product.price)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(product)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 whitespace-nowrap shrink-0"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        disabled={!product.isAvailable}
                        onClick={() => addToCart(product, 1)}
                        aria-label={`Add ${product.name} to cart`}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                          product.isAvailable
                            ? 'bg-violet-800 hover:bg-violet-900 text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {inCartQty > 0 ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In Cart ({inCartQty})</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Product Details Modal */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <p className="text-xs font-medium text-slate-500">
                {detailProduct.category} · {detailProduct.unitLabel}
              </p>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                aria-label="Close product details"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto grid grid-cols-1 md:grid-cols-2">
              <div className="bg-slate-100">
                <ProductImage
                  src={detailProduct.imageUrl}
                  alt={detailProduct.name}
                  aspectClass="aspect-[4/3] md:h-full"
                />
              </div>

              <div className="p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        detailProduct.isAvailable ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {detailProduct.isAvailable
                        ? 'Available (Retailer Manual Status)'
                        : 'Currently Unavailable'}
                    </span>
                    {detailProduct.isDemo && (
                      <span className="text-xs text-amber-800 font-medium">Demo Listing</span>
                    )}
                  </div>

                  <h2 id="product-detail-title" className="text-xl font-bold text-slate-950">
                    {detailProduct.name}
                  </h2>

                  <p className="text-2xl font-bold text-slate-950 tabular-nums">
                    {formatInr(detailProduct.price)}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      / {detailProduct.unitLabel}
                    </span>
                  </p>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {detailProduct.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <StoreIcon className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                      <span className="font-medium text-slate-900">{detailProduct.storeName}</span>
                    </div>
                    {detailStore && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Store hours: {detailStore.operatingHours}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 pt-1">
                      Availability reflects the retailer&apos;s manual update, not automated
                      real-time inventory tracking. Final stock is confirmed on WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Quantity</span>
                    <div className="inline-flex items-center border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold tabular-nums">
                        {detailQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailQty((q) => Math.min(20, q + 1))}
                        aria-label="Increase quantity"
                        className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!detailProduct.isAvailable}
                    onClick={() => {
                      addToCart(detailProduct, detailQty);
                      setDetailProduct(null);
                    }}
                    className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors ${
                      detailProduct.isAvailable
                        ? 'bg-violet-800 hover:bg-violet-900 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {detailProduct.isAvailable
                      ? `Add ${detailQty} to Cart · ${formatInr(detailProduct.price * detailQty)}`
                      : 'Currently Unavailable'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version 1 Single-Retailer-Per-Order Conflict Dialog */}
      {retailerConflict && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retailer-conflict-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h2 id="retailer-conflict-title" className="text-base font-bold text-slate-950">
                  One Retailer Per Checkout (Version 1)
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your cart currently contains items from{' '}
                  <strong className="text-slate-900">{retailerConflict.existingStoreName}</strong>.
                  Because each order is confirmed directly via WhatsApp with a single local shop, we
                  do not combine items from{' '}
                  <strong className="text-slate-900">{retailerConflict.newStoreName}</strong> into
                  the same order.
                </p>
                <p className="text-xs text-slate-500">
                  Tip: Complete your first order or start a fresh cart for this store.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => resolveRetailerConflict(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Keep Current Cart
              </button>
              <button
                type="button"
                onClick={() => resolveRetailerConflict(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg"
              >
                Switch Store & Replace Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
