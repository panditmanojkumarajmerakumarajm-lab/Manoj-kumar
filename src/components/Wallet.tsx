import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import { CreditCard, QrCode, Send } from 'lucide-react';
import { formatINR } from '../lib/utils';

export default function Wallet() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !utr) return toast.error('Please fill all fields');
    if (parseFloat(amount) < 10) return toast.error('Minimum amount is ₹10');

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user?.uid,
        amount: parseFloat(amount),
        utr,
        type: 'add_funds',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Payment request submitted! Admin will approve soon.');
      setAmount('');
      setUtr('');
    } catch (error) {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Add Funds to Wallet</h2>
        <p className="text-slate-400 mt-2">Pay using any UPI app and submit details below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-3xl flex flex-col items-center justify-center space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-inner group overflow-hidden relative">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=8955932061@ptyes&pn=Manoj%20Kumar&cu=INR')}`} 
              alt="UPI QR Code"
              className="w-56 h-56 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          </div>
          <div className="text-center">
            <p className="font-black text-xl text-white tracking-tight">Manoj Kumar</p>
            <p className="font-bold text-blue-400 mt-1">UPI ID: 8955932061@ptyes</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Scan this QR securely with any UPI app</p>
          </div>
          <div className="flex space-x-3 items-center">
            <img src="https://picsum.photos/seed/paytm/24/24" className="w-6 h-6 rounded grayscale opacity-50" alt="Paytm" />
            <img src="https://picsum.photos/seed/phonepe/24/24" className="w-6 h-6 rounded grayscale opacity-50" alt="PhonePe" />
            <img src="https://picsum.photos/seed/gpay/24/24" className="w-6 h-6 rounded grayscale opacity-50" alt="GPay" />
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Amount (INR)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  ₹
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Transaction ID / UTR</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Send size={18} />
                </div>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Enter 12-digit UTR"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-blue-900/40 mt-4"
            >
              {loading ? 'Submitting...' : 'Submit Payment Info'}
            </button>

            <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider font-bold">
              Funds will be added after manual verification (usually 1 hour)
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
