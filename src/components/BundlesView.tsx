import React, { useMemo, useState } from 'react';
import { Info, Package, ShoppingBag } from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { BUNDLE_CATEGORIES } from '../types/campuscart';
import { formatInr } from '../utils/commerce';
import { ProductImage } from './ProductImage';

export const BundlesView: React.FC = () => {
  const { bundles, addBundleToCart, dataSourceMode } = useCampusCart();
  const [selectedCat, setSelectedCat] = useState<string>('All');

  const visibleBundles = useMemo(() => {
    return bundles.filter((b) => {
      if (!b.isActive) return false;
      if (selectedCat !== 'All' && b.category !== selectedCat) return false;
      return true;
    });
  }, [bundles, selectedCat]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          Student-Friendly Essential Bundles
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Customized packs tailored for hostel move-in, exam nights, and monthly PG restocks. Every
          bundle uses real configured retailer products and transparent combined pricing.
        </p>
      </div>

      {dataSourceMode === 'demo-seed' && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-amber-950">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            <strong>Demo Pilot Bundles:</strong> Prices equal the exact sum of included demo store
            items. Promotional savings are displayed only when configured by the administrator with
            real product data.
          </p>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['All', ...BUNDLE_CATEGORIES].map((cat) => {
          const active = selectedCat === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-violet-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {visibleBundles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <Package className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No active bundles in this category</h2>
          <p className="text-sm text-slate-600">
            Administrators can configure and enable new bundles in the Admin Dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleBundles.map((bundle) => {
            const displayPrice = bundle.hasPromotionalPrice
              ? bundle.promotionalPrice
              : bundle.originalTotal;
            return (
              <article
                key={bundle.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
                  <div className="sm:col-span-5 bg-slate-100">
                    <ProductImage
                      src={bundle.imageUrl}
                      alt={bundle.name}
                      aspectClass="aspect-[4/3] sm:h-full"
                    />
                  </div>
                  <div className="sm:col-span-7 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        {bundle.category} · {bundle.storeName}
                      </p>
                      <h2 className="text-lg font-bold text-slate-950 leading-snug">
                        {bundle.name}
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed">{bundle.description}</p>

                      <div className="pt-2">
                        <p className="text-xs font-semibold text-slate-800 mb-1.5">
                          Included Products
                        </p>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {bundle.items.map((item) => (
                            <li
                              key={`${bundle.id}-${item.productId}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                {item.productName} × {item.quantity}
                              </span>
                              <span className="tabular-nums text-slate-800 shrink-0">
                                {formatInr(item.unitPrice * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          {bundle.hasPromotionalPrice ? 'Promotional Bundle Price' : 'Combined Total'}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-slate-950 tabular-nums">
                            {formatInr(displayPrice)}
                          </span>
                          {bundle.hasPromotionalPrice && bundle.promotionalPrice < bundle.originalTotal && (
                            <span className="text-xs text-slate-400 line-through tabular-nums">
                              {formatInr(bundle.originalTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addBundleToCart(bundle)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add Bundle to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
