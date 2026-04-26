import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Link as LinkIcon, Layers, Instagram, Youtube, Facebook, Send, Music2, MessageSquare, Globe, LayoutGrid } from 'lucide-react';
import { formatINR } from '../lib/utils';
import { SMMService } from '../types';

const PLATFORMS = [
  { id: 'all', label: 'All', icon: LayoutGrid, color: 'text-slate-400' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-sky-500' },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-purple-500' },
  { id: 'twitter', label: 'Twitter', icon: MessageSquare, color: 'text-blue-400' },
];

export default function NewOrder() {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<SMMService[]>([]);
  const [activePlatform, setActivePlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<SMMService | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get('/api/services');
        setServices(res.data);
      } catch (err) {
        toast.error('Failed to load services');
      } finally {
        setFetching(false);
      }
    };
    fetchServices();
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

  const filteredServices = services.filter(s => activePlatform === 'all' || getPlatform(s) === activePlatform || (activePlatform === 'other' && getPlatform(s) === 'other'));
  const categories = Array.from(new Set(filteredServices.map(s => s.category)));

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [activePlatform]);

  const categoryServices = filteredServices.filter(s => s.category === selectedCategory);

  const price = selectedService ? (parseFloat(selectedService.rate) / 1000) * (parseInt(quantity) || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !link || !quantity) return toast.error('Please fill all fields');
    
    const qty = parseInt(quantity);
    if (qty < parseInt(selectedService.min) || qty > parseInt(selectedService.max)) {
      return toast.error(`Quantity must be between ${selectedService.min} and ${selectedService.max}`);
    }

    if (profile && profile.balance < price) {
      return toast.error('Insufficient wallet balance');
    }

    setLoading(true);
    try {
      // 1. Place order via external API
      const apiRes = await axios.post('/api/order', {
        service: selectedService.service,
        link,
        quantity: qty
      });

      if (apiRes.data.order) {
        // 2. Record in Firestore
        await addDoc(collection(db, 'orders'), {
          userId: user?.uid,
          serviceId: selectedService.service,
          serviceName: selectedService.name,
          link,
          quantity: qty,
          charge: price,
          status: 'pending',
          externalOrderId: String(apiRes.data.order),
          referralCode: profile?.referralCode || null,
          createdAt: serverTimestamp()
        });

        // 3. Deduct balance
        const userRef = doc(db, 'users', user?.uid || '');
        await updateDoc(userRef, {
          balance: increment(-price),
          ordersCount: increment(1)
        });

        toast.success('Order placed successfully!');
        setLink('');
        setQuantity('');
      } else {
        toast.error(apiRes.data.error || 'API Error');
      }
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Services...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-3xl font-bold">New Order</h2>
        <p className="text-slate-400 mt-2">Choose a service and boost your social presence.</p>
      </div>

      <div className="glass-card p-8 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">Platform</label>
            <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar h-20 items-center">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const isActive = activePlatform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActivePlatform(p.id);
                      setSelectedService(null);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-2xl transition-all border shrink-0 ${
                      isActive 
                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/30 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{p.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setActivePlatform('other');
                  setSelectedService(null);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-2xl transition-all border shrink-0 ${
                  activePlatform === 'other' 
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/30 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <Globe size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Other</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Layers size={18} />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedService(null);
                }}
                className="w-full bg-slate-800 border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Service</label>
            <select
              value={selectedService?.service?.toString() || ''}
              onChange={(e) => setSelectedService(services.find(s => s.service.toString() === e.target.value) || null)}
              className="w-full bg-slate-800 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
            >
              <option value="">Select a service...</option>
              {categoryServices.map(s => (
                <option key={s.service} value={s.service.toString()}>
                  {s.name} - {formatINR(parseFloat(s.rate))} per 1k
                </option>
              ))}
            </select>
          </div>

          {selectedService && (
            <div className="bg-slate-800/50 p-4 rounded-2xl text-xs text-slate-400">
              <p>Minimum: <span className="text-white font-bold">{selectedService.min}</span></p>
              <p>Maximum: <span className="text-white font-bold">{selectedService.max}</span></p>
              <p className="mt-2 text-[10px] leading-relaxed italic">{selectedService.description || "No description available"}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Target Link</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <LinkIcon size={18} />
              </div>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full bg-slate-800 border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="https://instagram.com/p/..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Min: 100"
              required
            />
          </div>

          {price > 0 && (
            <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs uppercase font-bold text-blue-400 tracking-widest">Estimated Charge</p>
                <p className="text-3xl font-black">{formatINR(price)}</p>
              </div>
              <ShoppingBag className="text-blue-500" size={32} />
            </div>
          )}

          <button
            disabled={loading || !selectedService}
            type="submit"
            className="btn-primary w-full py-5 text-xl font-bold shadow-2xl shadow-blue-900/40"
          >
            {loading ? 'Processing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
