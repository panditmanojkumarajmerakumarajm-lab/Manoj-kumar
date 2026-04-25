import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { ShoppingBag, ShoppingCart, CreditCard, ChevronDown, Search, Check, AlertCircle, Info, FileText, Link as LinkIcon, Hash, Zap, Tag, Loader2, Monitor, Clock, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatINR } from '../lib/utils';
import { UserProfile, SMMService } from '../types';
import { toast } from 'react-hot-toast';

interface DashboardProps {
  profile: UserProfile;
  setTab: (tab: string) => void;
}

export default function Dashboard({ profile, setTab }: DashboardProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<SMMService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'mass'>('new');
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<SMMService | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/services');
        setServices(res.data);
      } catch (err: any) {
        console.error('Services Fetch Error:', err.message);
        toast.error('Failed to load services.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const categories = Array.from(new Set(services.map(s => s.category)));
  const filteredServices = services.filter(s => s.category === selectedCategory);

  const price = selectedService ? (parseFloat(selectedService.rate) / 1000) * (parseInt(quantity) || 0) : 0;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !link || !quantity) return toast.error('Please fill all fields');
    if (!agreed) return toast.error('Please agree to the Terms & Conditions');
    
    const qty = parseInt(quantity);
    if (qty < parseInt(selectedService.min) || qty > parseInt(selectedService.max)) {
      return toast.error(`Quantity must be between ${selectedService.min} and ${selectedService.max}`);
    }

    if (profile && profile.balance < price) {
      return toast.error('Insufficient wallet balance');
    }

    setIsOrdering(true);
    try {
      const apiRes = await axios.post('/api/order', {
        service: selectedService.service,
        link: link.trim(),
        quantity: qty
      });

      if (apiRes.data && (apiRes.data.order || apiRes.data.data?.order)) {
        const orderIdFromApi = apiRes.data.order || apiRes.data.data?.order;
        const batch = writeBatch(db);
        
        const newOrderRef = doc(collection(db, 'orders'));
        batch.set(newOrderRef, {
          userId: user?.uid,
          serviceId: selectedService.service,
          serviceName: selectedService.name,
          link: link.trim(),
          quantity: qty,
          charge: price,
          status: 'pending',
          externalOrderId: String(orderIdFromApi),
          createdAt: serverTimestamp()
        });

        const userRef = doc(db, 'users', user?.uid || '');
        batch.update(userRef, {
          balance: increment(-price),
          ordersCount: increment(1),
          totalSpend: increment(price)
        });

        await batch.commit();
        toast.success('Order placed successfully!');
        setLink('');
        setQuantity('');
        setAgreed(false);
      } else {
        toast.error(apiRes.data.error || 'Provider rejected order');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto pb-10">
      {/* Top Stats Stack */}
      <div className="space-y-4">
        {/* Total Orders Card */}
        <div className="panel-card bg-white p-6 md:p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0088cc] rounded-full flex items-center justify-center text-white mb-4 shadow-sm">
            <Monitor size={36} className="md:size-40" />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-600 uppercase tracking-tight mb-2">TOTAL ORDERS AT NEW BHARAT SMM</h3>
          <p className="text-3xl md:text-5xl font-bold text-[#333] mb-2 tracking-tighter">1229330</p>
          <p className="text-xs md:text-sm text-slate-500">3+ years experience providing SMM services!</p>
        </div>

        {/* Wallet Balance Card */}
        <div className="panel-card bg-white p-6 md:p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0088cc] rounded-full flex items-center justify-center text-white mb-4 shadow-sm">
            <CreditCard size={36} className="md:size-40" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-4 tracking-tight">looking to Deposit?</p>
          <button 
            onClick={() => setTab('wallet')}
            className="btn-success w-48 md:w-56 py-3 mb-6 flex items-center justify-center gap-2 text-lg shadow-md"
          >
            DEPOSIT NOW
          </button>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CURRENT BALANCE</p>
          <p className="text-2xl md:text-3xl font-bold text-[#333] mb-1">{formatINR(profile?.balance || 0).replace('₹', '₹ ')}</p>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Your total spendings : {formatINR(profile?.totalSpend || 0)}</p>
        </div>
      </div>

      {/* Main Order Form */}
      <div className="panel-card bg-white">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-4 text-center font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'new' ? 'text-[#333] bg-white border-b-2 border-[#0088cc]' : 'text-slate-400 bg-slate-50'}`}
          >
            <FileText size={18} />
            New Order
          </button>
          <button 
            onClick={() => setActiveTab('mass')}
            className={`flex-1 py-4 text-center font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'mass' ? 'text-[#333] bg-white border-b-2 border-[#0088cc]' : 'text-slate-400 bg-slate-50'}`}
          >
            <ShoppingCart size={18} />
            Mass Order
          </button>
        </div>

        <form onSubmit={handleOrder} className="p-6 md:p-8 space-y-6">
          {/* Search Service */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Service"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-3 px-4 focus:ring-1 focus:ring-[#0088cc] focus:border-[#0088cc] outline-none text-sm shadow-inner"
              />
            </div>
          </div>

          {/* Service Category */}
          <div>
            <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Service <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedService(null);
                }}
                className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-3 px-4 focus:ring-1 focus:ring-[#0088cc] focus:border-[#0088cc] outline-none appearance-none text-sm"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Package Select */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Package <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={selectedService?.service?.toString() || ''}
                  onChange={(e) => {
                    const s = services.find(serv => serv.service.toString() === e.target.value);
                    setSelectedService(s || null);
                  }}
                  className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-3 px-4 focus:ring-1 focus:ring-[#0088cc] focus:border-[#0088cc] outline-none appearance-none text-sm pr-10"
                  required
                >
                  <option value="">Select Package</option>
                  {filteredServices.map(s => (
                    <option key={s.service} value={s.service.toString()}>
                      ID:{s.service} {s.name} -- {formatINR(parseFloat(s.rate))} per 1000
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          )}

          {/* Price Preview */}
          {selectedService && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Price</label>
                <input
                  type="text"
                  readOnly
                  value={`${formatINR(parseFloat(selectedService.rate))} per 1000`}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-3 px-4 text-sm text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Description</label>
                <div className="bg-[#fcfcfc] border border-slate-200 rounded p-4 text-xs space-y-3 prose prose-slate">
                  <div dangerouslySetInnerHTML={{ __html: selectedService.description || "" }} />
                  {!selectedService.description && (
                    <div className="space-y-2 text-slate-600">
                      <p className="flex items-center gap-2"><Clock size={14} className="text-[#0088cc]" /> Start Within : Instant</p>
                      <p className="flex items-center gap-2"><Zap size={14} className="text-[#0088cc]" /> Delivery Speed : Fast</p>
                      <p className="flex items-center gap-2"><Check size={14} className="text-[#0088cc]" /> Quality : Real/HQ</p>
                      <p className="flex items-center gap-2"><RotateCcw size={14} className="text-[#0088cc]" /> Refill : No Refill (Unless specified)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Link Input */}
          <div>
            <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Link <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-3 px-4 focus:ring-1 focus:ring-[#0088cc] focus:border-[#0088cc] outline-none text-sm"
              placeholder="Account Must be Public"
              required
            />
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Quantity <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-3 px-4 focus:ring-1 focus:ring-[#0088cc] focus:border-[#0088cc] outline-none text-sm"
              required
            />
            {selectedService && (
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                Min: {selectedService.min} - Max: {selectedService.max}
              </p>
            )}
          </div>

          {/* Total Charge */}
          <div>
            <label className="block text-sm font-bold text-[#333] mb-2 uppercase tracking-tighter">Total Charge</label>
            <div className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-3 px-4 text-sm font-bold text-[#333]">
              {formatINR(price).replace('₹', '₹ ')}
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="agreed"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 text-[#0088cc] border-slate-300 rounded focus:ring-[#0088cc]"
            />
            <label htmlFor="agreed" className="text-xs text-slate-500 font-medium">
              I agree to the <button type="button" className="text-[#0088cc] hover:underline">Terms & Conditions</button>
            </label>
          </div>

          {/* Place Order Button */}
          <button
            disabled={isOrdering}
            type="submit"
            className="btn-primary w-full py-4 text-sm uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
          >
            {isOrdering ? <Loader2 className="animate-spin" size={18} /> : 'PLACE ORDER'}
          </button>
        </form>
      </div>

      {/* Latest News Section */}
      <div className="panel-card bg-white p-6 space-y-4">
        <h3 className="text-base font-bold flex items-center gap-2 uppercase tracking-tight">
          <Info size={18} className="text-[#0088cc]" />
          LATEST NEWS
        </h3>
        <div className="space-y-4">
          <div className="border border-slate-100 rounded overflow-hidden">
            <div className="bg-[#5cb85c] text-white px-4 py-1 text-xs font-bold inline-block">2026-02-01 22:58:34</div>
            <div className="p-4 bg-[#fcfcfc]">
              <p className="text-sm font-bold flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#0088cc]"></span>
                QR CODE CHANGED
              </p>
              <p className="text-sm text-slate-600">Please make payment in new qr code</p>
            </div>
          </div>
          
          <div className="border border-slate-100 rounded overflow-hidden">
            <div className="bg-[#5cb85c] text-white px-4 py-1 text-xs font-bold inline-block">2025-10-15 18:22:46</div>
            <div className="p-4 bg-[#fcfcfc]">
              <p className="text-sm font-bold flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#0088cc]"></span>
                QR CODE CHANGED
              </p>
              <p className="text-sm text-slate-600">Please make payment in new qr code</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
