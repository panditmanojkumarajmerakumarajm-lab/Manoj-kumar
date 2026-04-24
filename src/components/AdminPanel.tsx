import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';
import { formatINR } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Check, X, ShieldAlert, Percent, Save, Search, User, CreditCard } from 'lucide-react';

export default function AdminPanel() {
  const [pendingPayments, setPendingPayments] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [profitMargin, setProfitMargin] = useState('20');
  const [savingMargin, setSavingMargin] = useState(false);
  
  // User search states
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);

  useEffect(() => {
    // Fetch current settings
    const fetchSettings = async () => {
      const settingsRef = doc(db, 'settings', 'global');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        setProfitMargin(String(snap.data().profitMargin || '20'));
      }
    };
    fetchSettings();

    const q = query(
      collection(db, 'transactions'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setPendingPayments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateMargin = async () => {
    setSavingMargin(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, { 
        profitMargin: parseFloat(profitMargin),
        updatedAt: new Date()
      }, { merge: true });
      toast.success('Profit margin updated successfully!');
    } catch (err) {
      toast.error('Failed to update margin');
    } finally {
      setSavingMargin(false);
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    try {
      // 1. Update transaction status
      const transRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transRef, { status: 'approved' });

      // 2. Add balance to user
      const userRef = doc(db, 'users', transaction.userId);
      await updateDoc(userRef, {
        balance: increment(transaction.amount)
      });

      toast.success('Payment approved and wallet updated!');
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const transRef = doc(db, 'transactions', id);
      await updateDoc(transRef, { status: 'rejected' });
      toast.success('Payment rejected');
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        setFoundUser({ id: userDoc.id, ...userDoc.data() });
        setNewBalance(String(userDoc.data().balance || 0));
      } else {
        toast.error('User not found');
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!foundUser) return;
    setUpdatingBalance(true);
    try {
      const userRef = doc(db, 'users', foundUser.id);
      await updateDoc(userRef, {
        balance: parseFloat(newBalance)
      });
      setFoundUser({ ...foundUser, balance: parseFloat(newBalance) });
      toast.success('User balance updated!');
    } catch (err) {
      toast.error('Failed to update balance');
    } finally {
      setUpdatingBalance(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Admin Management</h2>
          <p className="text-slate-400">Approve payments and manage BharatSMM.</p>
        </div>
      </div>

      {/* Profit Margin Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-3xl">
          <div className="flex items-center space-x-3 mb-6">
            <Percent className="text-blue-500" size={20} />
            <h3 className="text-xl font-bold">Pricing Settings</h3>
          </div>
          <div className="flex flex-col space-y-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-400 mb-2">Profit Margin (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
              </div>
            </div>
            <button
              onClick={handleUpdateMargin}
              disabled={savingMargin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-2"
            >
              <Save size={18} />
              <span>{savingMargin ? 'Saving...' : 'Save Price'}</span>
            </button>
          </div>
        </div>

        {/* User Balance Management */}
        <div className="glass-card p-8 rounded-3xl">
          <div className="flex items-center space-x-3 mb-6">
            <User className="text-purple-500" size={20} />
            <h3 className="text-xl font-bold">User Management</h3>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Search user email..."
                  className="w-full bg-slate-800 border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <button
                onClick={handleSearchUser}
                disabled={searching}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl font-bold transition-all"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {foundUser && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-2xl border border-purple-500/20">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Currently Editing</p>
                    <p className="text-sm font-bold text-white mb-1">{foundUser.email}</p>
                    <p className="text-xs text-slate-400">UID: {foundUser.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">Current Balance</p>
                    <p className="text-lg font-black text-emerald-500">{formatINR(foundUser.balance)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className="w-full bg-slate-900 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="New balance"
                    />
                  </div>
                  <button
                    onClick={handleUpdateBalance}
                    disabled={updatingBalance}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
                  >
                    {updatingBalance ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-3xl">
        <h3 className="text-xl font-bold mb-6">Pending Payment Approvals</h3>
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading requests...</div>
        ) : pendingPayments.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-slate-700 rounded-2xl text-slate-500">
            No pending payments. Everything is up to date!
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPayments.map((p) => (
              <div key={p.id} className="bg-slate-800/50 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">User ID: {p.userId}</p>
                  <p className="text-2xl font-black text-emerald-500">{formatINR(p.amount)}</p>
                  <p className="text-sm font-medium text-slate-300 mt-1">UTR: <span className="bg-slate-700 px-2 py-0.5 rounded text-white">{p.utr}</span></p>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                  <button
                    onClick={() => handleReject(p.id)}
                    className="flex-1 md:flex-none border border-red-500/20 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <X size={18} />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleApprove(p)}
                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2"
                  >
                    <Check size={18} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
