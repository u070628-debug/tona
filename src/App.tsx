import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Languages, 
  Calculator as CalcIcon, 
  Plus, 
  Minus, 
  X, 
  Divide, 
  Delete, 
  RotateCcw,
  Equal,
  UserPlus,
  Users,
  Shield,
  Mail,
  Lock,
  User as UserIcon,
  Trash2,
  LogIn,
  LogOut,
  UtensilsCrossed,
  LayoutDashboard,
  ShoppingCart,
  UsersRound,
  ChevronRight,
  TrendingUp,
  Package,
  PlusCircle,
  Save,
  Search,
  XCircle
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  query, 
  orderBy,
  deleteDoc,
  doc,
  onSnapshot,
  where,
  Timestamp
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { db, auth } from "./lib/firebase";

type Language = "es" | "en";
type NavTab = "dashboard" | "products" | "clients" | "sales" | "users" | "calc";

interface Product {
  id: string;
  name: string;
  price: number;
  category: "Tacos" | "Gringas" | "Bebidas" | "Extras";
  description: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
}

interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  status: "completed" | "pending";
  createdAt: Timestamp;
}

const translations = {
  es: {
    hello: "TAQUERÍA EL ANALISTA",
    dashboard: "Panel",
    products: "Menú",
    clients: "Clientes",
    sales: "Ventas",
    users: "Usuarios",
    calc: "Calculadora",
    add: "Agregar",
    save: "Guardar",
    delete: "Eliminar",
    total: "Total",
    price: "Precio",
    quantity: "Cant.",
    category: "Categoría",
    name: "Nombre",
    email: "Email",
    phone: "Teléfono",
    newSale: "Nueva Venta",
    finalize: "Finalizar",
    recentSales: "Ventas Recientes",
    topProducts: "Top Productos",
    authRequired: "Inicia sesión para gestionar el sistema",
    welcome: "¡Bienvenido de nuevo!",
    totalSales: "Ventas Totales",
    activeClients: "Clientes Activos"
  },
  en: {
    hello: "THE ANALYST TAQUERIA",
    dashboard: "Dashboard",
    products: "Menu",
    clients: "Clients",
    sales: "Sales",
    users: "Users",
    calc: "Calculator",
    add: "Add",
    save: "Save",
    delete: "Delete",
    total: "Total",
    price: "Price",
    quantity: "Qty",
    category: "Category",
    name: "Name",
    email: "Email",
    phone: "Phone",
    newSale: "New Sale",
    finalize: "Finalize",
    recentSales: "Recent Sales",
    topProducts: "Top Products",
    authRequired: "Please sign in to manage the system",
    welcome: "Welcome back!",
    totalSales: "Total Sales",
    activeClients: "Active Clients"
  }
};

export default function App() {
  const [lang, setLang] = useState<Language>("es");
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<{ productId: string; name: string; price: number; quantity: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  const t = translations[lang];

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });
    const unsubSales = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });

    return () => { unsubProducts(); unsubClients(); unsubSales(); };
  }, [user]);

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); }
  };

  const handleFinalizeSale = async () => {
    if (!selectedClientId || cart.length === 0) return;
    const clientName = clients.find(c => c.id === selectedClientId)?.name || "Mostrador";
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    setLoading(true);
    try {
      await addDoc(collection(db, "sales"), {
        clientId: selectedClientId,
        clientName,
        items: cart,
        total,
        status: "completed",
        createdAt: serverTimestamp()
      });
      setCart([]);
      setSelectedClientId("");
      setActiveTab("dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  // --- Calculator Logic (Legacy Request) ---
  const [display, setDisplay] = useState("0");
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [isNext, setIsNext] = useState(true);

  const performCalc = (num: string) => {
    if (isNext) { setDisplay(num); setIsNext(false); }
    else setDisplay(p => p === "0" ? num : p + num);
  };

  const handleOp = (op: string) => {
    const cur = parseFloat(display);
    if (calcMemory === null) setCalcMemory(cur);
    else if (calcOp) {
      const res = calcOp === "+" ? calcMemory + cur : calcOp === "-" ? calcMemory - cur : calcOp === "*" ? calcMemory * cur : calcMemory / cur;
      setCalcMemory(res);
      setDisplay(res.toString());
    }
    setCalcOp(op);
    setIsNext(true);
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] font-sans text-[#1A1A1A]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col p-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-red-500 p-2 rounded-xl">
            <UtensilsCrossed className="text-white w-6 h-6" />
          </div>
          <h1 className="font-black text-xs tracking-tighter leading-none">
            EL ANALISTA<br/><span className="text-gray-400 font-medium">TAQUERÍA</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: t.dashboard },
            { id: "sales", icon: ShoppingCart, label: t.sales },
            { id: "products", icon: Package, label: t.products },
            { id: "clients", icon: UsersRound, label: t.clients },
            { id: "calc", icon: CalcIcon, label: t.calc },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? "bg-black text-white shadow-xl shadow-black/10" 
                  : "text-gray-400 hover:text-black hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-50 space-y-4">
          <div className="flex justify-between p-1 bg-gray-50 rounded-lg">
            {["es", "en"].map(l => (
              <button 
                key={l}
                onClick={() => setLang(l as Language)}
                className={`flex-1 py-1 text-[10px] font-bold rounded uppercase ${lang === l ? "bg-white shadow-sm" : "text-gray-400"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {user ? (
            <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut className="w-4 h-4" /> {t.signOut}
            </button>
          ) : (
            <button onClick={handleSignIn} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
              <LogIn className="w-4 h-4" /> {t.signIn}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight">{t.hello}</h2>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mt-1">
              STATUS: <span className="text-green-500">SYSTEM ANALYST ONLINE</span>
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
              <img src={user.photoURL || ""} alt="" className="w-8 h-8 rounded-full bg-gray-100" />
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{user.displayName}</p>
                <p className="text-[10px] text-gray-400">{user.email}</p>
              </div>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center py-24"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Shield className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t.authRequired}</h3>
              <p className="text-gray-400 mb-8 text-sm">Gestiona ventas, clientes y catálogo de forma segura.</p>
              <button 
                onClick={handleSignIn}
                className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
              >
                {t.signIn} With Google
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* DASHBOARD TAB */}
              {activeTab === "dashboard" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex justify-between items-center overflow-hidden relative">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t.totalSales}</p>
                        <h4 className="text-4xl font-black">${sales.reduce((a, s) => a + s.total, 0).toLocaleString()}</h4>
                      </div>
                      <TrendingUp className="w-16 h-16 text-green-50 absolute -right-4 -bottom-4 rotate-12" />
                    </div>
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex justify-between items-center overflow-hidden relative">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t.activeClients}</p>
                        <h4 className="text-4xl font-black">{clients.length}</h4>
                      </div>
                      <Users className="w-16 h-16 text-blue-50 absolute -right-4 -bottom-4 -rotate-12" />
                    </div>
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex justify-between items-center overflow-hidden relative">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t.products}</p>
                        <h4 className="text-4xl font-black">{products.length}</h4>
                      </div>
                      <Package className="w-16 h-16 text-red-50 absolute -right-4 -bottom-4 rotate-12" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50">
                      <h5 className="text-lg font-bold mb-6 flex items-center justify-between">
                        {t.recentSales}
                        <button className="text-xs text-blue-500 font-bold hover:underline">Ver todas</button>
                      </h5>
                      <div className="space-y-4">
                        {sales.slice(0, 5).map(sale => (
                          <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-black hover:text-white transition-all cursor-default">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-xs text-black group-hover:bg-gray-800 group-hover:text-white">
                                {sale.clientName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-sm tracking-tight">{sale.clientName}</p>
                                <p className="text-[10px] text-gray-400">{sale.createdAt?.toDate().toLocaleString()}</p>
                              </div>
                            </div>
                            <p className="font-black">${sale.total}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50">
                      <h5 className="text-lg font-bold mb-6">{t.topProducts}</h5>
                      <div className="space-y-4">
                        {products.sort((a, b) => b.price - a.price).slice(0, 5).map(prod => (
                          <div key={prod.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                            <div className="flex items-center gap-4">
                              <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">{prod.category}</span>
                              <p className="font-bold text-sm">{prod.name}</p>
                            </div>
                            <p className="font-black text-gray-400">${prod.price}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SALES (POS) TAB */}
              {activeTab === "sales" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black">{t.products}</h3>
                        <div className="flex gap-2">
                          {["Tacos", "Gringas", "Bebidas"].map(cat => (
                            <button key={cat} className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gray-100 hover:bg-black hover:text-white transition-all">
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {products.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => addToCart(p)}
                            className="p-4 bg-gray-50 rounded-3xl text-left hover:bg-white hover:shadow-xl hover:shadow-black/5 border border-transparent hover:border-gray-100 transition-all group active:scale-95"
                          >
                            <p className="text-[10px] font-bold text-red-400 uppercase mb-1">{p.category}</p>
                            <h4 className="font-bold mb-4 h-10 overflow-hidden line-clamp-2">{p.name}</h4>
                            <div className="flex justify-between items-center">
                              <span className="font-black text-lg">${p.price}</span>
                              <PlusCircle className="w-6 h-6 text-gray-300 group-hover:text-black" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                  <aside className="bg-black text-white p-8 rounded-[40px] shadow-2xl flex flex-col h-[70vh]">
                    <h3 className="text-2xl font-black mb-8 flex items-center justify-between">
                      {t.newSale}
                      <ShoppingCart className="w-6 h-6 text-gray-600" />
                    </h3>
                    
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t.clients}</p>
                      <select 
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full bg-gray-900 border-none rounded-xl p-3 text-sm focus:ring-0 outline-none cursor-pointer"
                      >
                        <option value="">-- Mostrador / Seleccionar --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                          <div>
                            <p className="font-bold text-sm tracking-tight">{item.name}</p>
                            <p className="text-[10px] text-gray-500">{item.quantity} x ${item.price}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-black">${item.quantity * item.price}</p>
                            <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-gray-800 space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="font-bold text-gray-500 uppercase text-xs">Total</p>
                        <h4 className="text-4xl font-black">${cart.reduce((a, i) => a + (i.price * i.quantity), 0)}</h4>
                      </div>
                      <button 
                        onClick={handleFinalizeSale}
                        disabled={cart.length === 0 || loading}
                        className="w-full bg-white text-black py-5 rounded-[24px] font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
                      >
                        {t.finalize}
                      </button>
                    </div>
                  </aside>
                </div>
              )}

              {/* PRODUCTS TAB */}
              {activeTab === "products" && (
                <div className="bg-white rounded-[40px] p-12 shadow-sm border border-gray-50">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-black">{t.products}</h3>
                    <button 
                      onClick={() => {
                        const name = prompt("Nombre:");
                        const price = prompt("Precio:");
                        const cat = prompt("Categoría (Tacos, Gringas, Bebidas, Extras):");
                        if (name && price && cat) {
                          addDoc(collection(db, "products"), { name, price: parseFloat(price), category: cat });
                        }
                      }}
                      className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {t.add}
                    </button>
                  </div>
                  <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                      <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-4">
                        <th className="pb-4 pl-4">{t.name}</th>
                        <th className="pb-4">{t.category}</th>
                        <th className="pb-4">{t.price}</th>
                        <th className="pb-4 text-right pr-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} className="bg-gray-50 hover:bg-gray-100 transition-colors group">
                          <td className="py-6 pl-6 rounded-l-3xl font-bold">{p.name}</td>
                          <td className="py-6">
                            <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-red-500 uppercase tracking-tighter border border-red-50">{p.category}</span>
                          </td>
                          <td className="py-6 font-black">${p.price}</td>
                          <td className="py-6 text-right pr-6 rounded-r-3xl">
                            <button onClick={() => deleteDoc(doc(db, "products", p.id))} className="text-gray-200 hover:text-red-500 transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CLIENTS TAB */}
              {activeTab === "clients" && (
                <div className="bg-white rounded-[40px] p-12 shadow-sm border border-gray-50">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-black">{t.clients}</h3>
                    <button 
                      onClick={() => {
                        const name = prompt("Nombre:");
                        const email = prompt("Email:");
                        const phone = prompt("Teléfono:");
                        if (name && email && phone) {
                          addDoc(collection(db, "clients"), { name, email, phone, visits: 0, createdAt: serverTimestamp() });
                        }
                      }}
                      className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> {t.add}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {clients.map(c => (
                      <div key={c.id} className="p-8 bg-gray-50 rounded-[40px] hover:bg-white hover:shadow-2xl hover:shadow-black/5 transition-all group overflow-hidden relative">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-black group-hover:text-white transition-all">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold tracking-tight">{c.name}</h4>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">LOYAL CUSTOMER</p>
                          </div>
                        </div>
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-3 text-xs text-gray-500"><Mail className="w-3 h-3" /> {c.email}</div>
                          <div className="flex items-center gap-3 text-xs text-gray-500"><TrendingUp className="w-3 h-3" /> {c.visits} Visitas</div>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, "clients", c.id))} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-200 hover:text-red-500 transition-all p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CALCULATOR TAB */}
              {activeTab === "calc" && (
                <div className="flex items-center justify-center pt-12">
                   <div className="bg-white rounded-[50px] p-8 shadow-2xl shadow-blue-900/10 border border-gray-100 max-w-sm w-full">
                    <div className="flex items-center gap-2 mb-8 px-2">
                      <CalcIcon className="w-4 h-4 text-blue-500" />
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Precision Toolkit</h2>
                    </div>
                    <div className="bg-gray-50 rounded-[32px] mb-8 p-8 text-right overflow-hidden shadow-inner border border-gray-100">
                      <p className="text-[10px] font-mono text-gray-300 mb-1 h-3">{calcMemory !== null && `${calcMemory} ${calcOp || ""}`}</p>
                      <p className="text-6xl font-black tracking-tighter text-black truncate">{display}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <button onClick={reset} className="col-span-2 py-5 bg-red-50 text-red-500 rounded-3xl font-black text-xs uppercase hover:bg-red-100">C</button>
                      <button onClick={() => setDisplay(p => p.slice(0, -1) || "0")} className="py-5 bg-gray-100 rounded-3xl flex items-center justify-center"><Delete className="w-5 h-5"/></button>
                      <button onClick={() => handleOp("/")} className="py-5 bg-blue-50 text-blue-600 rounded-3xl font-black text-xl hover:bg-blue-100">/</button>
                      {[7,8,9,"*"].map(v => (
                        <button 
                          key={v} 
                          onClick={() => typeof v === "number" ? performCalc(v.toString()) : handleOp(v)}
                          className={`py-6 rounded-3xl font-black text-xl transition-all ${typeof v === "number" ? "bg-white border border-gray-50 shadow-sm hover:shadow-xl hover:scale-105" : "bg-blue-50 text-blue-600"}`}
                        >
                          {v}
                        </button>
                      ))}
                      {[4,5,6,"-"].map(v => (
                        <button 
                          key={v} 
                          onClick={() => typeof v === "number" ? performCalc(v.toString()) : handleOp(v)}
                          className={`py-6 rounded-3xl font-black text-xl transition-all ${typeof v === "number" ? "bg-white border border-gray-50 shadow-sm hover:shadow-xl hover:scale-105" : "bg-blue-50 text-blue-600"}`}
                        >
                          {v}
                        </button>
                      ))}
                      {[1,2,3,"+"].map(v => (
                        <button 
                          key={v} 
                          onClick={() => typeof v === "number" ? performCalc(v.toString()) : handleOp(v)}
                          className={`py-6 rounded-3xl font-black text-xl transition-all ${typeof v === "number" ? "bg-white border border-gray-50 shadow-sm hover:shadow-xl hover:scale-105" : "bg-blue-50 text-blue-600"}`}
                        >
                          {v}
                        </button>
                      ))}
                      <button onClick={() => performCalc("0")} className="col-span-2 py-6 bg-white border border-gray-50 rounded-3xl font-black text-xl shadow-sm hover:shadow-xl hover:scale-105">0</button>
                      <button onClick={() => !display.includes(".") && performCalc(".")} className="py-6 bg-white border border-gray-50 rounded-3xl font-black text-xl">.</button>
                      <button onClick={handleEqual} className="py-6 bg-black text-white rounded-3xl font-black text-xl shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all text-center flex justify-center items-center"><Equal className="w-6 h-6"/></button>
                    </div>
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
