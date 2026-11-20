import React, { useState } from 'react';
import { Menu, ShoppingBag, UserCircle2, X } from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { AppView } from '../types/campuscart';

const NAV_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'catalogue', label: 'Catalogue' },
  { view: 'bundles', label: 'Bundles' },
  { view: 'orders', label: 'My Orders' },
  { view: 'retailer', label: 'Retailer Portal' },
  { view: 'admin', label: 'Admin' },
];

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    cartTotals,
    setIsCartOpen,
    setIsAccountModalOpen,
    firebaseUser,
    activeRole,
    isCloudMode,
  } = useCampusCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (view: AppView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const accountLabel = firebaseUser
    ? firebaseUser.displayName?.split(' ')[0] || 'Account'
    : activeRole === 'admin'
      ? 'Demo Admin'
      : activeRole === 'retailer'
        ? 'Demo Partner'
        : 'Sign In';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 lg:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="text-xl font-bold tracking-tight text-violet-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded"
        >
          CampusCart
        </button>

        {/* Zone 2: Clean single-line text navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 lg:gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => navigate(item.view)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-violet-900 border-violet-700'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action (Cart) + Compact Account / Mobile Menu */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            aria-label={`Account and role settings (${accountLabel})`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:text-violet-900 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <UserCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[110px] truncate">{accountLabel}</span>
            {!isCloudMode && activeRole !== 'student' && (
              <span className="text-xs text-amber-700 font-normal">· Local</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Open shopping cart with ${cartTotals.itemCount} items`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cart</span>
            <span className="tabular-nums font-mono text-xs bg-violet-950/60 px-1.5 py-0.5 rounded">
              {cartTotals.itemCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              activeView === 'home' ? 'bg-violet-50 text-violet-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Home
          </button>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => navigate(item.view)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === item.view
                  ? 'bg-violet-50 text-violet-900'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsAccountModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-800 hover:bg-violet-50"
            >
              <UserCircle2 className="w-4 h-4" />
              <span>Account & Role ({accountLabel})</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
