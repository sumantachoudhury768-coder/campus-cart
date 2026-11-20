import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  MessageCircle,
  Package,
  Store,
} from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { ASSET_IMAGES } from '../data/seedData';
import { formatInr } from '../utils/commerce';
import { ProductImage } from './ProductImage';

const FAQ_ITEMS = [
  {
    q: 'Which areas does CampusCart currently serve?',
    a: 'CampusCart is launching exclusively as a hyperlocal pilot around DGU Campus and nearby hostel and PG clusters in Selaqui, Dehradun. New service areas are added by the administrator only after local retailer coverage is confirmed.',
  },
  {
    q: 'How does WhatsApp-based ordering work?',
    a: 'Add your daily essentials from a participating store to your cart, enter your hostel or PG delivery details, and click "Continue to WhatsApp". CampusCart formats a clear itemized message for the retailer so they can confirm availability and coordinate doorstep or gate delivery.',
  },
  {
    q: 'Why is there a ₹20 delivery/service fee?',
    a: '₹20 per order is our initial student-friendly pilot pricing assumption designed to cover basic local delivery coordination while keeping small hostel orders affordable. Final fees remain subject to student feedback and retailer arrangements during the pilot.',
  },
  {
    q: 'Can I order items from two different shops in one checkout?',
    a: 'In Version 1, each order is fulfilled directly by one participating local retailer to keep coordination simple and reliable. If you need products from a second store, please place a separate order.',
  },
  {
    q: 'Are medicines available on CampusCart?',
    a: 'Medicines may only be listed when a properly licensed pharmacy partner and applicable compliance requirements have been verified by the administrator. Unlicensed general stores cannot list medicines.',
  },
  {
    q: 'How do I pay for my order?',
    a: 'Depending on what the retailer supports, you can choose Cash on Delivery or manually coordinated UPI. CampusCart never asks for your UPI PIN, OTP, or banking passwords, and payment status is marked verified only after the retailer confirms receipt.',
  },
];

const CATEGORY_CARDS = [
  {
    name: 'Groceries',
    subtitle: 'Oats, instant noodles, spreads, tea & hostel staples',
    image: ASSET_IMAGES.groceries,
  },
  {
    name: 'Snacks',
    subtitle: 'Study-break chips, biscuits, wafers & late-night bites',
    image: ASSET_IMAGES.snacks,
  },
  {
    name: 'Stationery',
    subtitle: 'A4 spiral notebooks, gel pens, highlighters & sticky notes',
    image: ASSET_IMAGES.stationery,
  },
  {
    name: 'Personal Care',
    subtitle: 'Face wash, shampoo, soaps & daily hostel toiletries',
    image: ASSET_IMAGES.personalCare,
  },
];

export const LandingPage: React.FC = () => {
  const {
    setActiveView,
    setSelectedCategoryFilter,
    platformConfig,
    serviceAreas,
    bundles,
    addBundleToCart,
  } = useCampusCart();

  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const openCategory = (category: string) => {
    setSelectedCategoryFilter(category);
    setActiveView('catalogue');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeAreas = serviceAreas.filter((a) => a.isActive);
  const featuredBundles = bundles.filter((b) => b.isActive).slice(0, 3);

  return (
    <div className="bg-[#F8F7FA]">
      {/* Hero Section: Balanced 2-Column Editorial Split */}
      <section className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-medium text-violet-800 tracking-normal">
                {platformConfig.pilotRegionName} · Student Pilot MVP
              </p>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.08] max-w-xl">
                Everything You Need for Campus Life, Delivered.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Groceries, snacks, stationery, and everyday essentials from nearby stores, delivered
                conveniently to your hostel or PG.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => openCategory('All')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Start Shopping</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('explore-categories');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore Categories</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                <span>
                  Pilot Delivery Fee:{' '}
                  <strong className="text-slate-900 tabular-nums">
                    {formatInr(platformConfig.deliveryFee)}/order
                  </strong>{' '}
                  (pilot assumption)
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>WhatsApp-Based Ordering</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>DGU & Selaqui Hostels / PGs</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={ASSET_IMAGES.hero}
                  alt="Hostel study desk with CampusCart daily essentials including spiral notebooks, pens, coffee, and snacks"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-width 3-Step How It Works Strip */}
          <div className="mt-12 pt-10 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-violet-800 font-mono">01. Browse</p>
              <h2 className="text-base font-bold text-slate-900">
                Explore nearby store essentials
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Search groceries, snacks, beverages, stationery, personal care, and student bundles
                from participating local retailers around Selaqui.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-violet-800 font-mono">02. Order</p>
              <h2 className="text-base font-bold text-slate-900">
                Submit your cart through WhatsApp
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Enter your hostel or PG room details once. CampusCart builds a structured order
                message ready to send directly via WhatsApp Click-to-Chat.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700 font-mono">03. Receive</p>
              <h2 className="text-base font-bold text-slate-900">
                Coordinate delivery at your doorstep
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                The local retailer confirms item availability and delivery timing directly with you
                for convenient hostel or PG drop-off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Categories Section */}
      <section id="explore-categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Everyday Hostel & PG Categories
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Built for DGU undergraduate and MBA students who need everyday essentials between
              lectures, late evenings, and exam weeks without walking to Selaqui market.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCategory('All')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-800 hover:text-violet-950 whitespace-nowrap shrink-0"
          >
            <span>View Full Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORY_CARDS.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => openCategory(cat.name)}
              className="group text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
            >
              <ProductImage src={cat.image} alt={`${cat.name} essentials`} />
              <div className="p-4 space-y-1">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-violet-900 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cat.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Curated Student Bundles Section */}
      <section className="bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                Student-Friendly Essential Bundles
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Curated packs built strictly from configured local store products and listed prices
                — no fabricated discounts, just faster ordering for hostel routines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('bundles')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-800 hover:text-violet-950 whitespace-nowrap shrink-0"
            >
              <span>All Bundles</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredBundles.map((bundle) => (
              <article
                key={bundle.id}
                className="bg-[#F8F7FA] border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <ProductImage src={bundle.imageUrl} alt={bundle.name} />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      {bundle.category} · {bundle.items.length} configured items
                    </p>
                    <h3 className="text-base font-bold text-slate-950 leading-snug">
                      {bundle.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{bundle.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Combined Price</p>
                      <p className="text-lg font-bold text-slate-950 tabular-nums">
                        {formatInr(
                          bundle.hasPromotionalPrice
                            ? bundle.promotionalPrice
                            : bundle.originalTotal
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addBundleToCart(bundle)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Add Bundle
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition, Local Retailer Partnership & Pilot Coverage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Built Around Hostel & PG Life in Selaqui
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              For students living in hostels and PGs who need affordable daily essentials but cannot
              conveniently visit nearby shops, CampusCart provides a simple way to order from local
              retailers and receive products at their doorstep.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                <Store className="w-5 h-5 text-violet-800" />
                <h3 className="text-sm font-bold text-slate-950">Local Retailer Partnerships</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Instead of competing with neighbourhood kirana and stationery shops, CampusCart
                  brings them structured student orders via WhatsApp without complex POS software.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-950">Transparent Pilot Pricing</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retailer item totals are shown separately from the{' '}
                  <strong className="text-slate-900">
                    {formatInr(platformConfig.deliveryFee)}
                  </strong>{' '}
                  pilot delivery/service fee assumption. Zero hidden handling surcharges.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-violet-900">
              <MapPin className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold">Configured Pilot Service Areas</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Orders are currently focused on Selaqui clusters near DGU Campus that participating
              retailers can reliably serve.
            </p>
            <ul className="divide-y divide-slate-100 text-sm">
              {activeAreas.map((area) => (
                <li key={area.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{area.name}</p>
                    <p className="text-xs text-slate-500">
                      {area.locality}, {area.city}
                      {area.deliveryEstimateNote ? ` · ${area.deliveryEstimateNote}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 capitalize shrink-0">
                    {area.clusterType}
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>Own a local shop near DGU Selaqui?</span>
              <button
                type="button"
                onClick={() => setActiveView('retailer')}
                className="font-semibold text-violet-800 hover:underline whitespace-nowrap"
              >
                Open Retailer Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-8 space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-600">
              Clear answers about our DGU & Selaqui MVP pilot, pricing assumptions, and WhatsApp
              fulfilment process.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-sm sm:text-base font-semibold text-slate-900">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed pr-8">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="bg-slate-950 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            <div className="md:col-span-2 space-y-2.5">
              <div className="flex items-center gap-2 text-white">
                <Package className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold tracking-tight">CampusCart</span>
              </div>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                Your Campus Essentials, Delivered to Your Doorstep. Initial pilot designed for DGU
                Campus and nearby hostel and PG clusters in Selaqui, Dehradun, Uttarakhand.
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <h3 className="font-semibold text-white">Platform</h3>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => openCategory('All')}
                    className="hover:text-white transition-colors"
                  >
                    Product Catalogue
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveView('bundles')}
                    className="hover:text-white transition-colors"
                  >
                    Student Bundles
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveView('orders')}
                    className="hover:text-white transition-colors"
                  >
                    Track Orders & Feedback
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-sm">
              <h3 className="font-semibold text-white">Partner & Admin</h3>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveView('retailer')}
                    className="hover:text-white transition-colors"
                  >
                    Local Retailer Portal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveView('admin')}
                    className="hover:text-white transition-colors"
                  >
                    Super Admin Dashboard
                  </button>
                </li>
                <li className="text-xs text-slate-500 pt-1">
                  DGU Entrepreneurship & Innovation Capstone · Selaqui, Dehradun
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} CampusCart Pilot MVP. All rights reserved.</p>
            <p>
              Terms of Pilot Use · Privacy Notice (Hostel/PG details used strictly for order
              delivery)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
