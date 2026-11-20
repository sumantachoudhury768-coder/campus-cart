import React from 'react';
import { ArrowRight, Info, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { formatInr } from '../utils/commerce';
import { ProductImage } from './ProductImage';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    cartTotals,
    platformConfig,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    setActiveView,
  } = useCampusCart();

  if (!isCartOpen) return null;

  const storeName = cart.length > 0 ? cart[0].storeName : null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    setActiveView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-violet-800" />
            <h2 id="cart-drawer-title" className="text-lg font-bold text-slate-900">
              Your Cart
            </h2>
            <span className="text-sm text-slate-500 tabular-nums">
              · {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping cart"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store indicator */}
        {storeName && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span className="truncate">
              Ordering from <strong className="text-slate-900">{storeName}</strong>
            </span>
            <button
              type="button"
              onClick={clearCart}
              className="text-rose-700 hover:text-rose-900 font-medium whitespace-nowrap shrink-0"
            >
              Clear cart
            </button>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-semibold text-slate-900">Your cart is empty</h3>
                <p className="text-sm text-slate-600">
                  Browse groceries, snacks, stationery, or student bundles from participating Selaqui
                  stores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setActiveView('catalogue');
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors"
              >
                Browse Catalogue
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {cart.map((item) => (
                <li key={item.productId} className="py-4 flex gap-3.5">
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                    <ProductImage src={item.imageUrl} alt={item.productName} aspectClass="aspect-square" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                        {item.productName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        aria-label={`Remove ${item.productName}`}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.unitLabel} · {formatInr(item.price)} each
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, -1)}
                          aria-label={`Decrease quantity of ${item.productName}`}
                          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-l-lg"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, 1)}
                          aria-label={`Increase quantity of ${item.productName}`}
                          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-r-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatInr(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary & CTA */}
        {cart.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-4 bg-slate-50/70 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Retailer Product Subtotal</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatInr(cartTotals.productSubtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>CampusCart Delivery / Service Fee</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatInr(cartTotals.deliveryFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-900">
                <span>Estimated Order Total</span>
                <span className="tabular-nums">{formatInr(cartTotals.orderTotal)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{platformConfig.pilotFeeDisclaimer}</span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
