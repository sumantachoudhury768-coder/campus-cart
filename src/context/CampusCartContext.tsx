import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  DEFAULT_PLATFORM_CONFIG,
  DEMO_BUNDLES,
  DEMO_PRODUCTS,
  DEMO_SERVICE_AREAS,
  DEMO_STORES,
  INITIAL_DEMO_FEEDBACK,
} from '../data/seedData';
import {
  AppView,
  Bundle,
  CartItem,
  CheckoutFormInput,
  FeedbackEntry,
  Order,
  OrderStatus,
  PaymentStatus,
  PlatformConfig,
  Product,
  ServiceArea,
  Store,
  UserPrivateProfile,
  UserRole,
} from '../types/campuscart';
import {
  calculateOrderTotals,
  checkSingleRetailerConflict,
  generateOrderReference,
  generateWhatsAppOrderMessage,
} from '../utils/commerce';

const STORAGE_CART_KEY = 'campuscart_cart_v1';
const STORAGE_LOCAL_ORDERS_KEY = 'campuscart_local_orders_v1';
const STORAGE_LOCAL_PROFILE_KEY = 'campuscart_local_profile_v1';
const STORAGE_LOCAL_FEEDBACK_KEY = 'campuscart_local_feedback_v1';
const STORAGE_DEMO_ROLE_KEY = 'campuscart_demo_role_v1';

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface RetailerConflictState {
  pendingItems: CartItem[];
  existingStoreName: string;
  newStoreName: string;
}

interface CampusCartContextValue {
  // Navigation & UI overlays
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (cat: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Auth & Role Mode
  authReady: boolean;
  firebaseUser: User | null;
  isCloudMode: boolean;
  activeRole: UserRole;
  demoPreviewRole: UserRole | null;
  setDemoPreviewRole: (role: UserRole | null) => void;
  isLiveAdmin: boolean;
  ownedStoreIds: string[];
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authError: string | null;

  // Data Collections
  dataSourceMode: 'cloud' | 'demo-seed';
  platformConfig: PlatformConfig;
  serviceAreas: ServiceArea[];
  stores: Store[];
  products: Product[];
  bundles: Bundle[];
  orders: Order[];
  feedbackList: FeedbackEntry[];
  userProfile: UserPrivateProfile;
  loadingCatalog: boolean;

  // Cart & Conflict
  cart: CartItem[];
  cartTotals: {
    productSubtotal: number;
    deliveryFee: number;
    orderTotal: number;
    itemCount: number;
  };
  retailerConflict: RetailerConflictState | null;
  addToCart: (product: Product, quantity?: number) => void;
  addBundleToCart: (bundle: Bundle) => void;
  resolveRetailerConflict: (replaceCart: boolean) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Mutations
  submitOrder: (form: CheckoutFormInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => Promise<void>;
  reassignOrderStore: (orderId: string, newStoreId: string) => Promise<void>;
  saveUserProfile: (profile: Omit<UserPrivateProfile, 'uid' | 'updatedAt'>) => Promise<void>;
  submitFeedback: (entry: Omit<FeedbackEntry, 'id' | 'customerId' | 'createdAt'>) => Promise<void>;

  // Retailer & Admin Management
  saveProduct: (product: Omit<Product, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  toggleProductAvailability: (productId: string, isAvailable: boolean) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  saveStore: (store: Omit<Store, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  saveServiceArea: (area: Omit<ServiceArea, 'updatedAt'>) => Promise<void>;
  deleteServiceArea: (areaId: string) => Promise<void>;
  saveBundle: (bundle: Omit<Bundle, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  deleteBundle: (bundleId: string) => Promise<void>;
  savePlatformConfig: (config: Omit<PlatformConfig, 'updatedAt'>) => Promise<void>;
  seedDemoDataToFirestore: () => Promise<void>;
}

const CampusCartContext = createContext<CampusCartContextValue | null>(null);

export const CampusCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [demoPreviewRole, setDemoPreviewRoleState] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem(STORAGE_DEMO_ROLE_KEY);
    if (saved === 'student' || saved === 'retailer' || saved === 'admin') {
      return saved;
    }
    return null;
  });

  // Cloud state
  const [cloudConfig, setCloudConfig] = useState<PlatformConfig | null>(null);
  const [cloudAreas, setCloudAreas] = useState<ServiceArea[] | null>(null);
  const [cloudStores, setCloudStores] = useState<Store[] | null>(null);
  const [cloudProducts, setCloudProducts] = useState<Product[] | null>(null);
  const [cloudBundles, setCloudBundles] = useState<Bundle[] | null>(null);
  const [cloudCustomerOrders, setCloudCustomerOrders] = useState<Order[]>([]);
  const [cloudRetailerOrders, setCloudRetailerOrders] = useState<Order[]>([]);
  const [cloudAdminOrders, setCloudAdminOrders] = useState<Order[]>([]);
  const [cloudFeedback, setCloudFeedback] = useState<FeedbackEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Local fallback / demo state (explicitly separated from Cloud)
  const [localConfig, setLocalConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [localAreas, setLocalAreas] = useState<ServiceArea[]>(DEMO_SERVICE_AREAS);
  const [localStores, setLocalStores] = useState<Store[]>(DEMO_STORES);
  const [localProducts, setLocalProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [localBundles, setLocalBundles] = useState<Bundle[]>(DEMO_BUNDLES);
  const [localOrders, setLocalOrders] = useState<Order[]>(() =>
    safeJsonParse<Order[]>(localStorage.getItem(STORAGE_LOCAL_ORDERS_KEY), [])
  );
  const [localFeedback, setLocalFeedback] = useState<FeedbackEntry[]>(() =>
    safeJsonParse<FeedbackEntry[]>(localStorage.getItem(STORAGE_LOCAL_FEEDBACK_KEY), INITIAL_DEMO_FEEDBACK)
  );
  const [userProfile, setUserProfile] = useState<UserPrivateProfile>(() =>
    safeJsonParse<UserPrivateProfile>(localStorage.getItem(STORAGE_LOCAL_PROFILE_KEY), {
      uid: 'local_student',
      displayName: '',
      email: '',
      phone: '',
      hostelOrPg: '',
      roomNumber: '',
      landmark: '',
      updatedAt: new Date().toISOString(),
    })
  );

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() =>
    safeJsonParse<CartItem[]>(localStorage.getItem(STORAGE_CART_KEY), [])
  );
  const [retailerConflict, setRetailerConflict] = useState<RetailerConflictState | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
  }, [localOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LOCAL_FEEDBACK_KEY, JSON.stringify(localFeedback));
  }, [localFeedback]);

  const setDemoPreviewRole = useCallback((role: UserRole | null) => {
    setDemoPreviewRoleState(role);
    if (role) {
      localStorage.setItem(STORAGE_DEMO_ROLE_KEY, role);
    } else {
      localStorage.removeItem(STORAGE_DEMO_ROLE_KEY);
    }
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setDemoPreviewRole(null);
        try {
          const adminSnap = await getDoc(doc(db, 'admins', user.uid));
          setIsAdminDoc(adminSnap.exists());
        } catch {
          setIsAdminDoc(false);
        }
      } else {
        setIsAdminDoc(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [setDemoPreviewRole]);

  const isBootstrappedAdmin = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL
  );
  const isLiveAdmin = isBootstrappedAdmin || isAdminDoc;
  const isCloudMode = Boolean(firebaseUser);

  // Public catalog Firestore listeners (stores, products, bundles, serviceAreas, platformConfig)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'platformConfig', 'pilot'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setCloudConfig({
              deliveryFee: Number(d.deliveryFee ?? 20),
              pilotFeeDisclaimer: String(d.pilotFeeDisclaimer ?? DEFAULT_PLATFORM_CONFIG.pilotFeeDisclaimer),
              fallbackWhatsappNumber: String(d.fallbackWhatsappNumber ?? ''),
              enableCod: Boolean(d.enableCod ?? true),
              enableUpi: Boolean(d.enableUpi ?? true),
              pilotRegionName: String(d.pilotRegionName ?? DEFAULT_PLATFORM_CONFIG.pilotRegionName),
              pilotBannerText: String(d.pilotBannerText ?? DEFAULT_PLATFORM_CONFIG.pilotBannerText),
              variableCostPerTxn: Number(d.variableCostPerTxn ?? 12),
              monthlyFixedCost: Number(d.monthlyFixedCost ?? 3000),
              baseMonthlyCustomers: Number(d.baseMonthlyCustomers ?? 100),
              basePurchasesPerCustomer: Number(d.basePurchasesPerCustomer ?? 4),
              updatedAt: toIsoString(d.updatedAt),
            });
          } else {
            setCloudConfig(null);
          }
        },
        (err) => {
          console.warn('platformConfig listener note:', err.message);
        }
      )
    );

    const areasQuery = isBootstrappedAdmin
      ? collection(db, 'serviceAreas')
      : query(collection(db, 'serviceAreas'), where('isActive', '==', true));

    unsubs.push(
      onSnapshot(
        areasQuery,
        (snap) => {
          if (snap.empty) {
            setCloudAreas(null);
          } else {
            setCloudAreas(
              snap.docs.map((d) => {
                const x = d.data();
                return {
                  id: d.id,
                  name: String(x.name ?? ''),
                  clusterType: (x.clusterType as ServiceArea['clusterType']) || 'hostel',
                  locality: String(x.locality ?? 'Selaqui'),
                  city: String(x.city ?? 'Dehradun'),
                  isActive: Boolean(x.isActive),
                  deliveryEstimateNote: x.deliveryEstimateNote ? String(x.deliveryEstimateNote) : undefined,
                  updatedAt: toIsoString(x.updatedAt),
                };
              })
            );
          }
        },
        (err) => {
          console.warn('serviceAreas listener note:', err.message);
        }
      )
    );

    const storesQuery = isBootstrappedAdmin
      ? collection(db, 'stores')
      : query(collection(db, 'stores'), where('status', '==', 'active'));

    unsubs.push(
      onSnapshot(
        storesQuery,
        (snap) => {
          if (snap.empty) {
            setCloudStores(null);
          } else {
            setCloudStores(
              snap.docs.map((d) => {
                const x = d.data();
                return {
                  id: d.id,
                  name: String(x.name ?? ''),
                  ownerName: String(x.ownerName ?? ''),
                  ownerUid: String(x.ownerUid ?? ''),
                  phone: String(x.phone ?? ''),
                  whatsappNumber: String(x.whatsappNumber ?? ''),
                  address: String(x.address ?? ''),
                  serviceAreaIds: Array.isArray(x.serviceAreaIds) ? x.serviceAreaIds : [],
                  category: String(x.category ?? ''),
                  operatingHours: String(x.operatingHours ?? ''),
                  status: (x.status as Store['status']) || 'active',
                  deliveryNote: x.deliveryNote ? String(x.deliveryNote) : undefined,
                  supportsCod: Boolean(x.supportsCod),
                  supportsUpi: Boolean(x.supportsUpi),
                  verifiedUpiId: x.verifiedUpiId ? String(x.verifiedUpiId) : '',
                  isPharmacyLicensed: Boolean(x.isPharmacyLicensed),
                  isDemo: Boolean(x.isDemo),
                  createdAt: toIsoString(x.createdAt),
                  updatedAt: toIsoString(x.updatedAt),
                };
              })
            );
          }
          setLoadingCatalog(false);
        },
        (err) => {
          console.warn('stores listener note:', err.message);
          setLoadingCatalog(false);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'products'), where('price', '>', 0)),
        (snap) => {
          if (snap.empty) {
            setCloudProducts(null);
          } else {
            setCloudProducts(
              snap.docs.map((d) => {
                const x = d.data();
                return {
                  id: d.id,
                  storeId: String(x.storeId ?? ''),
                  storeName: String(x.storeName ?? ''),
                  retailerUid: String(x.retailerUid ?? ''),
                  name: String(x.name ?? ''),
                  category: (x.category as Product['category']) || 'Groceries',
                  description: String(x.description ?? ''),
                  imageUrl: String(x.imageUrl ?? ''),
                  price: Number(x.price ?? 0),
                  unitLabel: String(x.unitLabel ?? ''),
                  isAvailable: Boolean(x.isAvailable),
                  isDemo: Boolean(x.isDemo),
                  createdAt: toIsoString(x.createdAt),
                  updatedAt: toIsoString(x.updatedAt),
                };
              })
            );
          }
        },
        (err) => {
          console.warn('products listener note:', err.message);
        }
      )
    );

    const bundlesQuery = isBootstrappedAdmin
      ? collection(db, 'bundles')
      : query(collection(db, 'bundles'), where('isActive', '==', true));

    unsubs.push(
      onSnapshot(
        bundlesQuery,
        (snap) => {
          if (snap.empty) {
            setCloudBundles(null);
          } else {
            setCloudBundles(
              snap.docs.map((d) => {
                const x = d.data();
                return {
                  id: d.id,
                  name: String(x.name ?? ''),
                  category: (x.category as Bundle['category']) || 'Hostel Essentials',
                  description: String(x.description ?? ''),
                  storeId: String(x.storeId ?? ''),
                  storeName: String(x.storeName ?? ''),
                  imageUrl: String(x.imageUrl ?? ''),
                  items: Array.isArray(x.items) ? x.items : [],
                  originalTotal: Number(x.originalTotal ?? 0),
                  promotionalPrice: Number(x.promotionalPrice ?? 0),
                  hasPromotionalPrice: Boolean(x.hasPromotionalPrice),
                  isActive: Boolean(x.isActive),
                  isDemo: Boolean(x.isDemo),
                  createdAt: toIsoString(x.createdAt),
                  updatedAt: toIsoString(x.updatedAt),
                };
              })
            );
          }
        },
        (err) => {
          console.warn('bundles listener note:', err.message);
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isBootstrappedAdmin]);

  // Authenticated private listeners (profile, orders, feedback)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setCloudCustomerOrders([]);
      setCloudRetailerOrders([]);
      setCloudAdminOrders([]);
      setCloudFeedback([]);
      return;
    }

    const unsubs: Array<() => void> = [];
    const uid = firebaseUser.uid;

    // Private profile
    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid, 'private', 'info'),
        (snap) => {
          if (snap.exists()) {
            const x = snap.data();
            setUserProfile({
              uid,
              displayName: String(x.displayName ?? firebaseUser.displayName ?? ''),
              email: String(x.email ?? firebaseUser.email ?? ''),
              phone: String(x.phone ?? ''),
              hostelOrPg: String(x.hostelOrPg ?? ''),
              roomNumber: String(x.roomNumber ?? ''),
              landmark: String(x.landmark ?? ''),
              updatedAt: toIsoString(x.updatedAt),
            });
          } else {
            setUserProfile((prev) => ({
              ...prev,
              uid,
              displayName: prev.displayName || firebaseUser.displayName || '',
              email: firebaseUser.email || prev.email || '',
            }));
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
        }
      )
    );

    const mapOrderDoc = (d: { id: string; data: () => Record<string, unknown> }): Order => {
      const x = d.data();
      return {
        id: d.id,
        orderRef: String(x.orderRef ?? ''),
        customerId: String(x.customerId ?? ''),
        customerName: String(x.customerName ?? ''),
        customerMobile: String(x.customerMobile ?? ''),
        hostelOrPg: String(x.hostelOrPg ?? ''),
        roomDetails: String(x.roomDetails ?? ''),
        landmark: x.landmark ? String(x.landmark) : '',
        deliveryInstructions: x.deliveryInstructions ? String(x.deliveryInstructions) : '',
        storeId: String(x.storeId ?? ''),
        storeName: String(x.storeName ?? ''),
        retailerUid: String(x.retailerUid ?? ''),
        items: Array.isArray(x.items) ? (x.items as Order['items']) : [],
        productSubtotal: Number(x.productSubtotal ?? 0),
        deliveryFee: Number(x.deliveryFee ?? 0),
        orderTotal: Number(x.orderTotal ?? 0),
        paymentMethod: (x.paymentMethod as Order['paymentMethod']) || 'COD',
        paymentStatus: (x.paymentStatus as PaymentStatus) || 'Unverified',
        orderStatus: (x.orderStatus as OrderStatus) || 'Pending Retailer Confirmation',
        whatsappMessage: String(x.whatsappMessage ?? ''),
        createdAt: toIsoString(x.createdAt),
        updatedAt: toIsoString(x.updatedAt),
      };
    };

    if (isBootstrappedAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'orders'),
          (snap) => {
            setCloudAdminOrders(snap.docs.map(mapOrderDoc));
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'orders');
          }
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'feedback'),
          (snap) => {
            setCloudFeedback(
              snap.docs.map((d) => {
                const x = d.data();
                return {
                  id: d.id,
                  customerId: String(x.customerId ?? ''),
                  customerName: String(x.customerName ?? ''),
                  hostelOrPg: String(x.hostelOrPg ?? ''),
                  orderRef: x.orderRef ? String(x.orderRef) : '',
                  willingToPay20: (x.willingToPay20 as FeedbackEntry['willingToPay20']) || 'maybe',
                  rating: Number(x.rating ?? 5),
                  comment: String(x.comment ?? ''),
                  createdAt: toIsoString(x.createdAt),
                };
              })
            );
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'feedback');
          }
        )
      );
    } else {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'orders'), where('customerId', '==', uid)),
          (snap) => {
            setCloudCustomerOrders(snap.docs.map(mapOrderDoc));
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'orders');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'orders'), where('retailerUid', '==', uid)),
          (snap) => {
            setCloudRetailerOrders(snap.docs.map(mapOrderDoc));
          },
          (err) => {
            console.warn('retailer orders query note:', err.message);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'feedback'), where('customerId', '==', uid)),
          (snap) => {
            setCloudFeedback(
              snap.docs.map((d) => {
                const x = d.data();
                return {
                  id: d.id,
                  customerId: String(x.customerId ?? ''),
                  customerName: String(x.customerName ?? ''),
                  hostelOrPg: String(x.hostelOrPg ?? ''),
                  orderRef: x.orderRef ? String(x.orderRef) : '',
                  willingToPay20: (x.willingToPay20 as FeedbackEntry['willingToPay20']) || 'maybe',
                  rating: Number(x.rating ?? 5),
                  comment: String(x.comment ?? ''),
                  createdAt: toIsoString(x.createdAt),
                };
              })
            );
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'feedback');
          }
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, isBootstrappedAdmin]);

  // Resolved active datasets (Cloud Firestore if populated, else clearly labelled demo seed)
  const hasCloudCatalog = Boolean(cloudStores && cloudStores.length > 0);
  const dataSourceMode: 'cloud' | 'demo-seed' = hasCloudCatalog ? 'cloud' : 'demo-seed';

  const platformConfig = cloudConfig ?? localConfig;
  const serviceAreas = cloudAreas ?? localAreas;
  const stores = cloudStores ?? localStores;
  const products = cloudProducts ?? localProducts;
  const bundles = cloudBundles ?? localBundles;

  const orders = useMemo(() => {
    if (!isCloudMode) {
      return [...localOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const merged = new Map<string, Order>();
    const source = isBootstrappedAdmin
      ? cloudAdminOrders
      : [...cloudCustomerOrders, ...cloudRetailerOrders];
    for (const o of source) {
      merged.set(o.id, o);
    }
    return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [isCloudMode, isBootstrappedAdmin, cloudAdminOrders, cloudCustomerOrders, cloudRetailerOrders, localOrders]);

  const feedbackList = useMemo(() => {
    const src = isCloudMode ? cloudFeedback : localFeedback;
    return [...src].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [isCloudMode, cloudFeedback, localFeedback]);

  const ownedStoreIds = useMemo(() => {
    if (firebaseUser) {
      return stores.filter((s) => s.ownerUid === firebaseUser.uid).map((s) => s.id);
    }
    if (demoPreviewRole === 'retailer') {
      return stores.map((s) => s.id);
    }
    return [];
  }, [firebaseUser, stores, demoPreviewRole]);

  const activeRole: UserRole = useMemo(() => {
    if (firebaseUser) {
      if (isLiveAdmin) return 'admin';
      if (ownedStoreIds.length > 0) return 'retailer';
      return 'student';
    }
    return demoPreviewRole ?? 'student';
  }, [firebaseUser, isLiveAdmin, ownedStoreIds.length, demoPreviewRole]);

  const cartTotals = useMemo(
    () => calculateOrderTotals(cart, platformConfig.deliveryFee),
    [cart, platformConfig.deliveryFee]
  );

  // Auth actions
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAccountModalOpen(false);
      showToast('Signed in with Google. Live Cloud Firestore sync active.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(msg);
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setDemoPreviewRole(null);
    showToast('Signed out.');
  }, [setDemoPreviewRole, showToast]);

  // Cart operations with single-retailer-per-order guardrail
  const commitCartItems = useCallback(
    (incomingItems: CartItem[], replaceExisting: boolean) => {
      setCart((prev) => {
        const base = replaceExisting ? [] : [...prev];
        for (const item of incomingItems) {
          const idx = base.findIndex((x) => x.productId === item.productId);
          if (idx >= 0) {
            base[idx] = { ...base[idx], quantity: base[idx].quantity + item.quantity };
          } else {
            base.push(item);
          }
        }
        return base;
      });
    },
    []
  );

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (!product.isAvailable) {
        showToast('This product is currently marked unavailable by the retailer.');
        return;
      }
      const nextItem: CartItem = {
        productId: product.id,
        productName: product.name,
        storeId: product.storeId,
        storeName: product.storeName,
        price: product.price,
        unitLabel: product.unitLabel,
        imageUrl: product.imageUrl,
        quantity: Math.max(1, quantity),
      };

      const conflict = checkSingleRetailerConflict(cart, product.storeId);
      if (conflict.hasConflict && conflict.existingStoreName) {
        setRetailerConflict({
          pendingItems: [nextItem],
          existingStoreName: conflict.existingStoreName,
          newStoreName: product.storeName,
        });
        return;
      }

      commitCartItems([nextItem], false);
      showToast(`Added ${product.name} to cart.`);
    },
    [cart, commitCartItems, showToast]
  );

  const addBundleToCart = useCallback(
    (bundle: Bundle) => {
      const bundleCartItems: CartItem[] = bundle.items.map((bi) => {
        const matchingProduct = products.find((p) => p.id === bi.productId);
        return {
          productId: bi.productId,
          productName: bi.productName,
          storeId: bundle.storeId,
          storeName: bundle.storeName,
          price: matchingProduct?.price ?? bi.unitPrice,
          unitLabel: matchingProduct?.unitLabel ?? 'Bundle item',
          imageUrl: matchingProduct?.imageUrl ?? bundle.imageUrl,
          quantity: bi.quantity,
        };
      });

      if (bundleCartItems.length === 0) return;

      const conflict = checkSingleRetailerConflict(cart, bundle.storeId);
      if (conflict.hasConflict && conflict.existingStoreName) {
        setRetailerConflict({
          pendingItems: bundleCartItems,
          existingStoreName: conflict.existingStoreName,
          newStoreName: bundle.storeName,
        });
        return;
      }

      commitCartItems(bundleCartItems, false);
      showToast(`Added "${bundle.name}" items to cart.`);
      setIsCartOpen(true);
    },
    [cart, products, commitCartItems, showToast]
  );

  const resolveRetailerConflict = useCallback(
    (replaceCart: boolean) => {
      if (replaceCart && retailerConflict) {
        commitCartItems(retailerConflict.pendingItems, true);
        showToast(`Cart updated for ${retailerConflict.newStoreName}.`);
      }
      setRetailerConflict(null);
    },
    [retailerConflict, commitCartItems, showToast]
  );

  const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Order submission
  const submitOrder = useCallback(
    async (form: CheckoutFormInput): Promise<Order> => {
      if (cart.length === 0) {
        throw new Error('Cart is empty.');
      }

      const storeId = cart[0].storeId;
      const store = stores.find((s) => s.id === storeId);
      const storeName = store?.name ?? cart[0].storeName;
      const retailerUid = store?.ownerUid ?? 'demo_retailer_kirana';

      const orderItems = cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: Math.round(item.price * item.quantity * 100) / 100,
      }));

      const totals = calculateOrderTotals(cart, platformConfig.deliveryFee);
      const orderRef = generateOrderReference();
      const orderId = `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();

      const whatsappMessage = generateWhatsAppOrderMessage({
        orderRef,
        storeName,
        customerName: form.customerName.trim(),
        customerMobile: form.customerMobile.trim(),
        hostelOrPg: form.hostelOrPg.trim(),
        roomDetails: form.roomDetails.trim(),
        landmark: form.landmark.trim(),
        deliveryInstructions: form.deliveryInstructions.trim(),
        items: orderItems,
        productSubtotal: totals.productSubtotal,
        deliveryFee: totals.deliveryFee,
        orderTotal: totals.orderTotal,
        paymentMethod: form.paymentMethod,
      });

      const orderRecord: Order = {
        id: orderId,
        orderRef,
        customerId: firebaseUser?.uid ?? 'local_student',
        customerName: form.customerName.trim().slice(0, 100),
        customerMobile: form.customerMobile.trim().slice(0, 20),
        hostelOrPg: form.hostelOrPg.trim().slice(0, 120),
        roomDetails: form.roomDetails.trim().slice(0, 120),
        landmark: form.landmark.trim().slice(0, 140),
        deliveryInstructions: form.deliveryInstructions.trim().slice(0, 240),
        storeId,
        storeName: storeName.slice(0, 120),
        retailerUid: retailerUid.slice(0, 128),
        items: orderItems,
        productSubtotal: totals.productSubtotal,
        deliveryFee: totals.deliveryFee,
        orderTotal: totals.orderTotal,
        paymentMethod: form.paymentMethod,
        paymentStatus: 'Unverified',
        orderStatus: 'Pending Retailer Confirmation',
        whatsappMessage: whatsappMessage.slice(0, 3000),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (firebaseUser && hasCloudCatalog) {
        try {
          await setDoc(doc(db, 'orders', orderId), {
            ...orderRecord,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
        }
      } else {
        setLocalOrders((prev) => [orderRecord, ...prev]);
      }

      // Also save delivery details locally for convenience
      const nextProfile: UserPrivateProfile = {
        uid: firebaseUser?.uid ?? 'local_student',
        displayName: form.customerName.trim().slice(0, 120),
        email: firebaseUser?.email ?? userProfile.email ?? '',
        phone: form.customerMobile.trim().slice(0, 20),
        hostelOrPg: form.hostelOrPg.trim().slice(0, 120),
        roomNumber: form.roomDetails.trim().slice(0, 60),
        landmark: form.landmark.trim().slice(0, 140),
        updatedAt: nowIso,
      };
      setUserProfile(nextProfile);
      localStorage.setItem(STORAGE_LOCAL_PROFILE_KEY, JSON.stringify(nextProfile));

      setCart([]);
      return orderRecord;
    },
    [cart, stores, platformConfig.deliveryFee, firebaseUser, hasCloudCatalog, userProfile.email]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && hasCloudCatalog) {
        try {
          const payload: Record<string, unknown> = {
            orderStatus: status,
            updatedAt: serverTimestamp(),
          };
          if (paymentStatus) {
            payload.paymentStatus = paymentStatus;
          }
          await updateDoc(doc(db, 'orders', orderId), payload);
          showToast(`Order updated to "${status}".`);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        }
      } else {
        setLocalOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  orderStatus: status,
                  paymentStatus: paymentStatus ?? o.paymentStatus,
                  updatedAt: nowIso,
                }
              : o
          )
        );
        showToast(`Order updated to "${status}" (Local Preview).`);
      }
    },
    [firebaseUser, hasCloudCatalog, showToast]
  );

  const reassignOrderStore = useCallback(
    async (orderId: string, newStoreId: string) => {
      const targetStore = stores.find((s) => s.id === newStoreId);
      if (!targetStore) return;
      const nowIso = new Date().toISOString();
      if (firebaseUser && isLiveAdmin && hasCloudCatalog) {
        try {
          await updateDoc(doc(db, 'orders', orderId), {
            storeId: targetStore.id,
            storeName: targetStore.name,
            retailerUid: targetStore.ownerUid,
            updatedAt: serverTimestamp(),
          });
          showToast(`Order assigned to ${targetStore.name}.`);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        }
      } else {
        setLocalOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  storeId: targetStore.id,
                  storeName: targetStore.name,
                  retailerUid: targetStore.ownerUid,
                  updatedAt: nowIso,
                }
              : o
          )
        );
        showToast(`Order assigned to ${targetStore.name}.`);
      }
    },
    [stores, firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const saveUserProfile = useCallback(
    async (profile: Omit<UserPrivateProfile, 'uid' | 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      const uid = firebaseUser?.uid ?? 'local_student';
      const cleaned: UserPrivateProfile = {
        uid,
        displayName: profile.displayName.trim().slice(0, 120) || 'Student',
        email: (profile.email ?? firebaseUser?.email ?? '').trim().slice(0, 200),
        phone: (profile.phone ?? '').trim().slice(0, 20),
        hostelOrPg: (profile.hostelOrPg ?? '').trim().slice(0, 120),
        roomNumber: (profile.roomNumber ?? '').trim().slice(0, 60),
        landmark: (profile.landmark ?? '').trim().slice(0, 140),
        updatedAt: nowIso,
      };
      setUserProfile(cleaned);
      localStorage.setItem(STORAGE_LOCAL_PROFILE_KEY, JSON.stringify(cleaned));

      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'users', uid, 'private', 'info'), {
            ...cleaned,
            updatedAt: serverTimestamp(),
          });
          showToast('Profile saved to Cloud Firestore.');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
        }
      } else {
        showToast('Profile saved locally for this browser.');
      }
    },
    [firebaseUser, showToast]
  );

  const submitFeedback = useCallback(
    async (entry: Omit<FeedbackEntry, 'id' | 'customerId' | 'createdAt'>) => {
      const feedbackId = `fb_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const nowIso = new Date().toISOString();
      const record: FeedbackEntry = {
        id: feedbackId,
        customerId: firebaseUser?.uid ?? 'local_student',
        customerName: entry.customerName.trim().slice(0, 100),
        hostelOrPg: entry.hostelOrPg.trim().slice(0, 120),
        orderRef: (entry.orderRef ?? '').trim().slice(0, 40),
        willingToPay20: entry.willingToPay20,
        rating: Math.min(5, Math.max(1, Math.round(entry.rating))),
        comment: entry.comment.trim().slice(0, 600),
        createdAt: nowIso,
      };

      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'feedback', feedbackId), {
            ...record,
            createdAt: serverTimestamp(),
          });
          showToast('Thank you! Pilot feedback recorded in Cloud Firestore.');
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `feedback/${feedbackId}`);
        }
      } else {
        setLocalFeedback((prev) => [record, ...prev]);
        showToast('Thank you! Pilot feedback recorded in local preview.');
      }
    },
    [firebaseUser, showToast]
  );

  // Retailer & Admin mutations
  const saveProduct = useCallback(
    async (product: Omit<Product, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && hasCloudCatalog) {
        try {
          if (isNew) {
            await setDoc(doc(db, 'products', product.id), {
              ...product,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(doc(db, 'products', product.id), {
              name: product.name,
              category: product.category,
              description: product.description,
              imageUrl: product.imageUrl,
              price: product.price,
              unitLabel: product.unitLabel,
              isAvailable: product.isAvailable,
              updatedAt: serverTimestamp(),
            });
          }
          showToast(isNew ? 'Product added to catalogue.' : 'Product updated.');
        } catch (err) {
          handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `products/${product.id}`);
        }
      } else {
        setLocalProducts((prev) => {
          if (isNew) {
            return [{ ...product, createdAt: nowIso, updatedAt: nowIso }, ...prev];
          }
          return prev.map((p) =>
            p.id === product.id ? { ...p, ...product, updatedAt: nowIso } : p
          );
        });
        showToast(isNew ? 'Product added (Local Preview).' : 'Product updated (Local Preview).');
      }
    },
    [firebaseUser, hasCloudCatalog, showToast]
  );

  const toggleProductAvailability = useCallback(
    async (productId: string, isAvailable: boolean) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && hasCloudCatalog) {
        try {
          await updateDoc(doc(db, 'products', productId), {
            isAvailable,
            updatedAt: serverTimestamp(),
          });
          showToast(isAvailable ? 'Marked Available.' : 'Marked Unavailable.');
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
        }
      } else {
        setLocalProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, isAvailable, updatedAt: nowIso } : p
          )
        );
        showToast(isAvailable ? 'Marked Available.' : 'Marked Unavailable.');
      }
    },
    [firebaseUser, hasCloudCatalog, showToast]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      if (firebaseUser && hasCloudCatalog) {
        try {
          await deleteDoc(doc(db, 'products', productId));
          showToast('Product removed.');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
        }
      } else {
        setLocalProducts((prev) => prev.filter((p) => p.id !== productId));
        showToast('Product removed (Local Preview).');
      }
    },
    [firebaseUser, hasCloudCatalog, showToast]
  );

  const saveStore = useCallback(
    async (store: Omit<Store, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && hasCloudCatalog) {
        try {
          if (isNew) {
            await setDoc(doc(db, 'stores', store.id), {
              ...store,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else if (isLiveAdmin) {
            await updateDoc(doc(db, 'stores', store.id), {
              ...store,
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(doc(db, 'stores', store.id), {
              operatingHours: store.operatingHours,
              deliveryNote: store.deliveryNote ?? '',
              whatsappNumber: store.whatsappNumber,
              phone: store.phone,
              supportsCod: store.supportsCod,
              supportsUpi: store.supportsUpi,
              verifiedUpiId: store.verifiedUpiId ?? '',
              updatedAt: serverTimestamp(),
            });
          }
          showToast(isNew ? 'Retailer onboarded.' : 'Store profile saved.');
        } catch (err) {
          handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `stores/${store.id}`);
        }
      } else {
        setLocalStores((prev) => {
          if (isNew) {
            return [{ ...store, createdAt: nowIso, updatedAt: nowIso }, ...prev];
          }
          return prev.map((s) => (s.id === store.id ? { ...s, ...store, updatedAt: nowIso } : s));
        });
        showToast(isNew ? 'Retailer onboarded (Local Preview).' : 'Store profile saved (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const deleteStore = useCallback(
    async (storeId: string) => {
      if (firebaseUser && isLiveAdmin && hasCloudCatalog) {
        try {
          await deleteDoc(doc(db, 'stores', storeId));
          showToast('Retailer removed.');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `stores/${storeId}`);
        }
      } else {
        setLocalStores((prev) => prev.filter((s) => s.id !== storeId));
        showToast('Retailer removed (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const saveServiceArea = useCallback(
    async (area: Omit<ServiceArea, 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && isLiveAdmin && hasCloudCatalog) {
        try {
          await setDoc(doc(db, 'serviceAreas', area.id), {
            ...area,
            updatedAt: serverTimestamp(),
          });
          showToast('Service area saved.');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `serviceAreas/${area.id}`);
        }
      } else {
        setLocalAreas((prev) => {
          const exists = prev.some((a) => a.id === area.id);
          if (exists) {
            return prev.map((a) => (a.id === area.id ? { ...area, updatedAt: nowIso } : a));
          }
          return [...prev, { ...area, updatedAt: nowIso }];
        });
        showToast('Service area saved (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const deleteServiceArea = useCallback(
    async (areaId: string) => {
      if (firebaseUser && isLiveAdmin && hasCloudCatalog) {
        try {
          await deleteDoc(doc(db, 'serviceAreas', areaId));
          showToast('Service area removed.');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `serviceAreas/${areaId}`);
        }
      } else {
        setLocalAreas((prev) => prev.filter((a) => a.id !== areaId));
        showToast('Service area removed (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const saveBundle = useCallback(
    async (bundle: Omit<Bundle, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && isLiveAdmin && hasCloudCatalog) {
        try {
          if (isNew) {
            await setDoc(doc(db, 'bundles', bundle.id), {
              ...bundle,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(doc(db, 'bundles', bundle.id), {
              ...bundle,
              updatedAt: serverTimestamp(),
            });
          }
          showToast(isNew ? 'Student bundle created.' : 'Bundle updated.');
        } catch (err) {
          handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `bundles/${bundle.id}`);
        }
      } else {
        setLocalBundles((prev) => {
          if (isNew) {
            return [{ ...bundle, createdAt: nowIso, updatedAt: nowIso }, ...prev];
          }
          return prev.map((b) =>
            b.id === bundle.id ? { ...b, ...bundle, updatedAt: nowIso } : b
          );
        });
        showToast(isNew ? 'Student bundle created (Local Preview).' : 'Bundle updated (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const deleteBundle = useCallback(
    async (bundleId: string) => {
      if (firebaseUser && isLiveAdmin && hasCloudCatalog) {
        try {
          await deleteDoc(doc(db, 'bundles', bundleId));
          showToast('Bundle deleted.');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `bundles/${bundleId}`);
        }
      } else {
        setLocalBundles((prev) => prev.filter((b) => b.id !== bundleId));
        showToast('Bundle deleted (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, hasCloudCatalog, showToast]
  );

  const savePlatformConfig = useCallback(
    async (config: Omit<PlatformConfig, 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      if (firebaseUser && isLiveAdmin) {
        try {
          await setDoc(doc(db, 'platformConfig', 'pilot'), {
            ...config,
            updatedAt: serverTimestamp(),
          });
          showToast('Platform settings saved to Cloud Firestore.');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'platformConfig/pilot');
        }
      } else {
        setLocalConfig({ ...config, updatedAt: nowIso });
        showToast('Platform settings saved (Local Preview).');
      }
    },
    [firebaseUser, isLiveAdmin, showToast]
  );

  const seedDemoDataToFirestore = useCallback(async () => {
    if (!firebaseUser || !isLiveAdmin) {
      showToast('Sign in as Super Administrator to seed Cloud Firestore.');
      return;
    }
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'platformConfig', 'pilot'), {
        ...DEFAULT_PLATFORM_CONFIG,
        updatedAt: serverTimestamp(),
      });
      for (const area of DEMO_SERVICE_AREAS) {
        batch.set(doc(db, 'serviceAreas', area.id), {
          ...area,
          updatedAt: serverTimestamp(),
        });
      }
      for (const store of DEMO_STORES) {
        batch.set(doc(db, 'stores', store.id), {
          ...store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const prod of DEMO_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), {
          ...prod,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const bundle of DEMO_BUNDLES) {
        batch.set(doc(db, 'bundles', bundle.id), {
          ...bundle,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      showToast('Pilot demo catalogue seeded to Cloud Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch-seed');
    }
  }, [firebaseUser, isLiveAdmin, showToast]);

  const value: CampusCartContextValue = {
    activeView,
    setActiveView,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    isCartOpen,
    setIsCartOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    toastMessage,
    showToast,
    authReady,
    firebaseUser,
    isCloudMode,
    activeRole,
    demoPreviewRole,
    setDemoPreviewRole,
    isLiveAdmin,
    ownedStoreIds,
    signInWithGoogle,
    signOutUser,
    authError,
    dataSourceMode,
    platformConfig,
    serviceAreas,
    stores,
    products,
    bundles,
    orders,
    feedbackList,
    userProfile,
    loadingCatalog,
    cart,
    cartTotals,
    retailerConflict,
    addToCart,
    addBundleToCart,
    resolveRetailerConflict,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    submitOrder,
    updateOrderStatus,
    reassignOrderStore,
    saveUserProfile,
    submitFeedback,
    saveProduct,
    toggleProductAvailability,
    deleteProduct,
    saveStore,
    deleteStore,
    saveServiceArea,
    deleteServiceArea,
    saveBundle,
    deleteBundle,
    savePlatformConfig,
    seedDemoDataToFirestore,
  };

  return <CampusCartContext.Provider value={value}>{children}</CampusCartContext.Provider>;
};

export function useCampusCart(): CampusCartContextValue {
  const ctx = useContext(CampusCartContext);
  if (!ctx) {
    throw new Error('useCampusCart must be used within CampusCartProvider');
  }
  return ctx;
}
