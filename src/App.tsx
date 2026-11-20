import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { CampusCartProvider, useCampusCart } from './context/CampusCartContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { CatalogueView } from './components/CatalogueView';
import { BundlesView } from './components/BundlesView';
import { CheckoutView } from './components/CheckoutView';
import { CustomerOrdersView } from './components/CustomerOrdersView';
import { RetailerDashboard } from './components/RetailerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { CartDrawer } from './components/CartDrawer';
import { AccountModal } from './components/AccountModal';

const CampusCartShell: React.FC = () => {
  const { activeView, platformConfig, toastMessage, showToast } = useCampusCart();
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7FA] text-slate-900">
      {/* Slim dismissible pilot coverage banner (<= 40px) */}
      {!bannerDismissed && platformConfig.pilotBannerText && (
        <div className="bg-violet-950 text-violet-100 text-xs px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="truncate sm:whitespace-normal">{platformConfig.pilotBannerText}</p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss pilot coverage notice"
              className="text-violet-300 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <Navbar />

      <main className="flex-1">
        {activeView === 'home' && <LandingPage />}
        {activeView === 'catalogue' && <CatalogueView />}
        {activeView === 'bundles' && <BundlesView />}
        {activeView === 'checkout' && <CheckoutView />}
        {activeView === 'orders' && <CustomerOrdersView />}
        {activeView === 'retailer' && <RetailerDashboard />}
        {activeView === 'admin' && <AdminDashboard />}
      </main>

      <CartDrawer />
      <AccountModal />

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
          <button
            type="button"
            onClick={() => showToast('')}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <CampusCartProvider>
        <CampusCartShell />
      </CampusCartProvider>
    </ErrorBoundary>
  );
}
