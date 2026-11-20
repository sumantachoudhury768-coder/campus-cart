import React from 'react';
import { CheckCircle2, Cloud, LogOut, ShieldCheck, Store as StoreIcon, User, X } from 'lucide-react';
import { useCampusCart } from '../context/CampusCartContext';
import { UserRole } from '../types/campuscart';

export const AccountModal: React.FC = () => {
  const {
    isAccountModalOpen,
    setIsAccountModalOpen,
    firebaseUser,
    isCloudMode,
    activeRole,
    demoPreviewRole,
    setDemoPreviewRole,
    signInWithGoogle,
    signOutUser,
    authError,
    setActiveView,
  } = useCampusCart();

  if (!isAccountModalOpen) return null;

  const handleSelectPreviewRole = (role: UserRole) => {
    setDemoPreviewRole(role);
    if (role === 'admin') setActiveView('admin');
    if (role === 'retailer') setActiveView('retailer');
    if (role === 'student') setActiveView('catalogue');
    setIsAccountModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="account-modal-title" className="text-lg font-bold text-slate-900">
              Account & Access Mode
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Sign in with Google for live Firebase Authentication and Cloud Firestore persistence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAccountModalOpen(false)}
            aria-label="Close account dialog"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {firebaseUser ? (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
              <Cloud className="w-4 h-4" />
              <span>Signed in with Google (Cloud Firestore Active)</span>
            </div>
            <div className="text-sm text-slate-800 space-y-1">
              <p className="font-medium">{firebaseUser.displayName || 'Authenticated User'}</p>
              <p className="text-slate-600 text-xs">{firebaseUser.email}</p>
              <p className="text-xs text-slate-700 pt-1">
                Assigned Role:{' '}
                <span className="font-semibold capitalize text-violet-900">{activeRole}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white bg-violet-800 hover:bg-violet-900 rounded-lg transition-colors"
            >
              <Cloud className="w-4 h-4" />
              Continue with Google (Live Firebase)
            </button>
            {authError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                {authError}
              </p>
            )}
          </div>
        )}

        {!isCloudMode && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Local Development Preview (Browser-Only)
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                For DGU capstone demonstration without a live Google login, switch preview roles
                below. Local preview changes stay in this browser and do not write to Cloud
                Firestore.
              </p>
            </div>

            <div className="space-y-2">
              {(
                [
                  {
                    role: 'student' as UserRole,
                    title: 'Student / Customer Preview',
                    desc: 'Browse essentials, manage cart, generate WhatsApp orders, submit feedback',
                    icon: User,
                  },
                  {
                    role: 'retailer' as UserRole,
                    title: 'Local Retailer Partner Preview',
                    desc: 'Update manual product availability, accept/reject incoming orders, verify UPI/COD',
                    icon: StoreIcon,
                  },
                  {
                    role: 'admin' as UserRole,
                    title: 'Super Administrator Preview',
                    desc: 'Configure ₹20 pilot fee, Selaqui service areas, bundles, retailers, unit economics',
                    icon: ShieldCheck,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const selected = (demoPreviewRole ?? 'student') === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => handleSelectPreviewRole(opt.role)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                      selected
                        ? 'border-violet-600 bg-violet-50/70'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-violet-800 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{opt.title}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-violet-700 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
