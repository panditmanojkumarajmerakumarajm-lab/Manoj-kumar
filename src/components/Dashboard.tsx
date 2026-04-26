import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, writeBatch, query, where, getDocs } from 'firebase/firestore';
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
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [isUpdatingReferral, setIsUpdatingReferral] = useState(false);

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
          referralCode: profile?.referralCode || null,
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

  const handleApplyReferral = async () => {
    const code = newReferralCode.trim().toUpperCase();
    if (!code) return toast.error('Please enter a referral code');
    if (code === profile?.myReferralId) return toast.error('You cannot use your own referral code!');

    setIsUpdatingReferral(true);
    try {
      // Use query for security/performance instead of full collection scan
      const q = query(collection(db, 'users'), where('myReferralId', '==', code));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error('Invalid referral code. Please check and try again.');
        return;
      }

      const userRef = doc(db, 'users', user?.uid || '');
      await updateDoc(userRef, {
        referralCode: code
      });
      
      toast.success('Referral code applied successfully!');
      setNewReferralCode('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply referral code');
    } finally {
      setIsUpdatingReferral(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto pb-10">
      {/* Top Stats Stack */}
      <div className="space-y-4">
        {/* Total Orders Card */}
        <div className="panel-card bg-white p-6 md:p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0088cc] rounded-full flex items-center justify-center text-white mb-4 shadow-sm overflow-hidden">
            <img 
              src="https://img.sanishtech.com/u/60b9981de99ed812d965d653e39a147a.png" 
              alt="Total Orders Icon"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-600 uppercase tracking-tight mb-2">TOTAL ORDERS AT NEW BHARAT SMM</h3>
          <p className="text-3xl md:text-5xl font-bold text-[#333] mb-2 tracking-tighter">1229330</p>
          <div className="mb-2 inline-flex items-center space-x-1.5 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 shadow-sm animate-pulse">
            <span className="text-[10px] md:text-xs font-bold text-blue-500 uppercase tracking-widest">Partnership with</span>
            <span className="text-sm md:text-base font-black text-blue-600 uppercase tracking-tight italic scale-110">Sanvariyaset</span>
          </div>
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

        {/* Earning Card */}
        <div className="panel-card bg-gradient-to-br from-[#0088cc] to-[#006699] p-6 md:p-8 text-center flex flex-col items-center text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 group-hover:scale-175 transition-transform">
            <Zap size={64} />
          </div>
          
          <div className="flex flex-col items-center mb-6 w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 mb-2">Your Personal Referral Code</p>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-3 group/code cursor-pointer active:scale-95 transition-all"
                 onClick={() => {
                   navigator.clipboard.writeText(profile?.myReferralId || '');
                   toast.success('Code copied to clipboard!');
                 }}>
              <span className="text-2xl font-black tracking-widest text-yellow-300">
                {profile?.myReferralId || '---'}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover/code:bg-white/30 transition-colors">
                <Tag size={16} />
              </div>
            </div>
          </div>

          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-white/30">
            <Zap size={24} className="text-yellow-300 fill-yellow-300" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tighter mb-1">Earning Opportunity</h3>
          
          <button 
            onClick={() => setShowEarningModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group-hover:shadow-emerald-500/50 w-full"
          >
            START EARNING NOW
          </button>
          
          <div className="mt-4 flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/80">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Partnership Program Live
          </div>
        </div>
      </div>

      {/* Applied Referral Info or Option to Add */}
      {!profile?.referralCode && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-card bg-amber-50 border-amber-200 p-5 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-200/50">
              <Tag size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Have a Referral Code?</h4>
              <p className="text-xs text-amber-700 font-medium">Use it now to support the person who invited you!</p>
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="text" 
              placeholder="ENTER CODE"
              value={newReferralCode}
              onChange={(e) => setNewReferralCode(e.target.value)}
              className="flex-1 md:w-40 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-bold tracking-widest outline-none focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-300 placeholder:font-bold placeholder:tracking-normal"
            />
            <button 
              onClick={handleApplyReferral}
              disabled={isUpdatingReferral}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-amber-600/20 uppercase"
            >
              {isUpdatingReferral ? <Loader2 className="animate-spin size-4" /> : 'APPLY'}
            </button>
          </div>
        </motion.div>
      )}

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

      {/* Earning Information Modal */}
      <AnimatePresence>
        {showEarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEarningModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-gradient-to-br from-[#0088cc] to-[#006699] p-6 text-white text-center flex-shrink-0">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                  <Zap size={32} className="text-yellow-300 fill-yellow-300" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">earning program</h3>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-center text-slate-800">📢 कमाई करने का आसान तरीका!</h4>
                  <p className="text-slate-600 text-center font-medium">अपना referral code दूसरों के साथ शेयर करें और कमाई शुरू करें 💸</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center font-bold">1</div>
                    <p className="text-sm text-slate-700 font-medium">जब कोई नया user आपके referral code से जुड़ता है</p>
                  </div>
                  <div className="flex items-start gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex-shrink-0 flex items-center justify-center font-bold">2</div>
                    <p className="text-sm text-slate-700 font-medium">और वह जितना भी deposit करता है</p>
                  </div>
                  <div className="flex items-start gap-4 bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex-shrink-0 flex items-center justify-center font-bold">3</div>
                    <p className="text-sm text-slate-700 font-medium">उसका <span className="font-black text-yellow-600">10% सीधा</span> आपको मिलता है</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">your referral id</p>
                  <p className="text-2xl font-black text-[#0088cc] tracking-widest uppercase">{profile?.myReferralId || '---'}</p>
                </div>

                <p className="text-center text-sm font-bold text-emerald-600 bg-emerald-50 py-2 rounded-lg">यानि जितना ज्यादा आप शेयर करेंगे, उतनी ज्यादा आपकी कमाई बढ़ेगी 🚀</p>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profile?.myReferralId || '');
                      toast.success('Code copied to clipboard!');
                    }}
                    className="w-full btn-primary py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Tag size={18} /> COPY CODE & SHARE
                  </button>
                  <button
                    onClick={() => setShowEarningModal(false)}
                    className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                  >
                    CLOSE WINDOW
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
