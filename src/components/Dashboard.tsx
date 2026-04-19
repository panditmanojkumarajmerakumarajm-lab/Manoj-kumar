import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { ShoppingBag, Clock, CheckCircle, Wallet, PlusCircle, List, ShieldCheck, Search, Instagram, Youtube, Facebook, Send, Music2, MessageSquare, Globe, LayoutGrid, X, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatINR } from '../lib/utils';
import { UserProfile, SMMService } from '../types';
import { toast } from 'react-hot-toast';

const PLATFORMS = [
  { id: 'all', label: 'All', icon: LayoutGrid, color: 'text-slate-400' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-sky-500' },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-purple-500' },
  { id: 'twitter', label: 'Twitter', icon: MessageSquare, color: 'text-blue-400' },
];

interface DashboardProps {
  profile: UserProfile;
  setTab: (tab: string) => void;
}

export default function Dashboard({ profile, setTab }: DashboardProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<SMMService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState('all');

  // Quick Order State
  const [quickOrderService, setQuickOrderService] = useState<SMMService | null>(null);
  const [quickLink, setQuickLink] = useState('');
  const [quickQuantity, setQuickQuantity] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/services');
        setServices(res.data);
      } catch (err: any) {
        console.error('Services Fetch Error:', err.response?.data || err.message);
        toast.error('Failed to load services. Please check backend connection.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getPlatform = (service: SMMService) => {
    const text = (service.category + ' ' + service.name).toLowerCase();
    if (text.includes('instagram')) return 'instagram';
    if (text.includes('youtube')) return 'youtube';
    if (text.includes('facebook')) return 'facebook';
    if (text.includes('telegram')) return 'telegram';
    if (text.includes('tiktok')) return 'tiktok';
    if (text.includes('twitter') || text.includes(' x ')) return 'twitter';
    return 'other';
  };

  const filtered = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.category.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = activePlatform === 'all' || getPlatform(s) === activePlatform;
    return matchesSearch && matchesPlatform;
  });

  const price = quickOrderService ? (parseFloat(quickOrderService.rate) / 1000) * (parseInt(quickQuantity) || 0) : 0;

  const handleQuickOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickOrderService || !quickLink || !quickQuantity) return toast.error('Please fill all fields');
    
    const qty = parseInt(quickQuantity);
    
    // Just trim, no aggressive cleaning as some providers expect full URLs
    const cleanLink = quickLink.trim();

    if (cleanLink.length < 10) {
      return toast.error('Please enter a valid, complete link');
    }

    if (qty < parseInt(quickOrderService.min) || qty > parseInt(quickOrderService.max)) {
      return toast.error(`Quantity must be between ${quickOrderService.min} and ${quickOrderService.max}`);
    }

    if (profile && profile.balance < price) {
      return toast.error('Insufficient wallet balance');
    }

    setIsOrdering(true);
    console.log("Placing order for service:", quickOrderService.service, " Link:", cleanLink, " Qty:", qty);
    
    try {
      // 1. Place order to external Provider (via server proxy)
      const apiRes = await axios.post('/api/order', {
        service: quickOrderService.service,
        link: cleanLink,
        quantity: qty
      });

      console.log("Registry/Provider Response:", apiRes.data);

      if (apiRes.data && (apiRes.data.order || apiRes.data.data?.order)) {
        const orderIdFromApi = apiRes.data.order || apiRes.data.data?.order;
        
        // 2. SUCCESS! Now atomically deduct balance and record order in Firestore
        const batch = writeBatch(db);
        
        // Record Order
        const newOrderRef = doc(collection(db, 'orders'));
        batch.set(newOrderRef, {
          userId: user?.uid,
          serviceId: quickOrderService.service,
          serviceName: quickOrderService.name,
          link: quickLink,
          quantity: qty,
          charge: price,
          status: 'pending',
          externalOrderId: String(orderIdFromApi),
          createdAt: serverTimestamp()
        });

        // Deduct Balance
        const userRef = doc(db, 'users', user?.uid || '');
        batch.update(userRef, {
          balance: increment(-price),
          ordersCount: increment(1)
        });

        await batch.commit();

        setShowSuccess(true);
        toast.success('Order placed successfully!');
        
        // Reset form
        setTimeout(() => {
          setShowSuccess(false);
          setQuickOrderService(null);
          setQuickLink('');
          setQuickQuantity('');
        }, 2000);
      } else {
        const errorMsg = apiRes.data.error || 'Provider rejected order';
        toast.error(`Order Failed: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error("Order process caught error:", error);
      const isFirestoreError = !error.response;
      const errorMsg = error.response?.data?.error || error.message || 'Failed to place order';
      
      if (isFirestoreError) {
        toast.error('Provider order placed but balance update failed. Please contact support.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsOrdering(false);
    }
  };

  const quickActions = [
    { id: 'new-order', label: 'New Order', icon: PlusCircle, color: 'bg-blue-600' },
    { id: 'wallet', label: 'Add Funds', icon: Wallet, color: 'bg-emerald-600' },
  ];

  const stats = [
    { label: 'Wallet Balance', value: formatINR(profile?.balance || 0), icon: Wallet, color: 'text-blue-500' },
    { label: 'Total Orders', value: profile?.ordersCount || 0, icon: ShoppingBag, color: 'text-purple-500' },
    { label: 'Running Orders', value: 0, icon: Clock, color: 'text-amber-500' },
    { label: 'Completed', value: 0, icon: CheckCircle, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Quick Order Modal */}
      {quickOrderService && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-[2.5rem] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Quick Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">{quickOrderService.name}</p>
              </div>
              <button 
                onClick={() => setQuickOrderService(null)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleQuickOrder} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Target Link / URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <LinkIcon size={18} />
                  </div>
                  <input
                    type="url"
                    value={quickLink}
                    onChange={(e) => setQuickLink(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Quantity</label>
                <div className="relative">
                  <input
                    type="number"
                    value={quickQuantity}
                    onChange={(e) => setQuickQuantity(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={`Min: ${quickOrderService.min} - Max: ${quickOrderService.max}`}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5 font-medium uppercase tracking-widest">
                  <AlertCircle size={12} className="text-blue-500" />
                  Rate: {formatINR(parseFloat(quickOrderService.rate))} per 1,000
                </p>
              </div>

              {price > 0 && (
                <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest leading-none mb-1">Total Charge</p>
                    <p className="text-3xl font-black text-white">{formatINR(price)}</p>
                  </div>
                  <ShoppingBag className="text-blue-500" size={32} />
                </div>
              )}

              <motion.button
                disabled={isOrdering || showSuccess}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`w-full py-5 text-xl font-extrabold shadow-2xl transition-all rounded-2xl flex items-center justify-center gap-3 ${
                  showSuccess 
                    ? 'bg-emerald-500 shadow-emerald-900/40 text-white translate-y-[-2px]' 
                    : isOrdering
                      ? 'bg-blue-600/50 cursor-not-allowed opacity-80'
                      : 'bg-blue-600 shadow-blue-900/40 hover:bg-blue-500 hover:shadow-blue-500/20 active:translate-y-0 text-white'
                }`}
              >
                {showSuccess ? (
                  <>
                    <CheckCircle className="animate-in zoom-in-50 duration-300" size={24} />
                    <span>Done!</span>
                  </>
                ) : isOrdering ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Place Order Now'
                )}
              </motion.button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Welcome to BharatSMM</h2>
          <p className="text-slate-400 mt-2">India's most trusted SMM panel is at your service.</p>
        </div>
        
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => setTab(action.id)}
              className={`${action.color} flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/20`}
            >
              <action.icon size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-6 rounded-2xl flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-slate-800 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Services List directly on Dashboard */}
      <div className="space-y-6 pt-8 border-t border-slate-900/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-2xl font-bold">Available Services</h3>
            <p className="text-slate-400 text-sm">Our top-rated boosting packages.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Quick search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Platform Icons */}
        <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar h-20 items-center">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const isActive = activePlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl transition-all border shrink-0 ${
                  isActive 
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/30 text-white' 
                    : 'glass-card border-transparent text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`${isActive ? 'text-white' : p.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">{p.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse font-bold tracking-widest uppercase">Fetching Services...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="col-span-full p-12 text-center glass-card rounded-3xl text-slate-500 italic">
                No services found for your search.
              </div>
            ) : (
              filtered.map((service, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setQuickOrderService(service)}
                  className="glass-card p-6 rounded-3xl flex flex-col justify-between items-start gap-4 hover:bg-slate-800/20 transition-all border border-transparent hover:border-blue-500/20 group cursor-pointer"
                >
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-black text-blue-500 tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded">
                        {getPlatform(service)}
                      </span>
                      <p className="text-xl font-black text-white">{formatINR(parseFloat(service.rate))}</p>
                    </div>
                    <h4 className="text-md font-bold group-hover:text-blue-400 transition-colors leading-tight line-clamp-1">{service.name}</h4>
                    <p className="text-[10px] uppercase text-slate-500 font-bold mt-1 tracking-wider">{service.category}</p>
                  </div>
                  <div className="w-full">
                    <button 
                      className="w-full bg-blue-600/10 group-hover:bg-blue-600 group-hover:text-white text-blue-400 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      Quick Order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div className="glass-card p-8 rounded-3xl">
          <h3 className="text-xl font-bold mb-4">📢 News & Updates</h3>
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <p className="text-emerald-400 font-bold text-sm uppercase">Automatic UPI Payment</p>
              <p className="text-slate-300 mt-1">Pay to <span className="text-white font-bold">Manoj Kumar (8955932061@ptyes)</span>. Your funds will be approved instantly after submitting UTR.</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <p className="text-blue-400 font-bold text-sm uppercase">WhatsApp Support</p>
              <p className="text-slate-300 mt-1">Need help? Contact us on WhatsApp: <a href="https://wa.me/918955932061" className="text-white font-bold underline">8955932061</a></p>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl flex flex-col justify-center items-center text-center space-y-4">
          <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-500">
            <ShieldCheck size={48} />
          </div>
          <h3 className="text-2xl font-bold">Safe & Secure</h3>
          <p className="text-slate-400 max-w-sm">BharatSMM uses enterprise-grade security to ensure your data and transactions are always protected.</p>
        </div>
      </div>

      {/* Subtle Admin Link */}
      <div className="pt-20 pb-4 flex justify-center">
        <button 
          onClick={() => {
            const adminEmails = ['tiwarigautam819@gmail.com', 'kumar493891@gmail.com'];
            const isOwnerEmail = profile.email && adminEmails.includes(profile.email.toLowerCase());
            
            if (profile.isAdmin || isOwnerEmail) {
              setTab('admin');
              toast.success('Admin Panel Opened');
            } else {
              toast.error('Admin control restricted.');
              console.log('Admin check failed:', { isAdmin: profile.isAdmin, email: profile.email });
            }
          }}
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-700 opacity-10 hover:opacity-50 transition-opacity cursor-pointer select-none px-4 py-2"
        >
          Pushpendra Control
        </button>
      </div>
    </div>
  );
}
