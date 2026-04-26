import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, SMMOrder, Withdrawal } from '../types';
import { formatINR } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Check, X, ShieldAlert, Percent, Save, Search, User, CreditCard, History, Tag, Smartphone, Landmark } from 'lucide-react';
import { writeBatch } from 'firebase/firestore';

import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<Transaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Withdrawal[]>([]);
  const [allOrders, setAllOrders] = useState<SMMOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [profitMargin, setProfitMargin] = useState('20');
  const [savingMargin, setSavingMargin] = useState(false);
  
  // User search states
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);

  useEffect(() => {
    if (authLoading || !profile?.isAdmin) return;

    // Fetch current settings
    const fetchSettings = async () => {
      const settingsRef = doc(db, 'settings', 'global');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        setProfitMargin(String(snap.data().profitMargin || '20'));
      }
    };
    fetchSettings();

    // Transactions listener
    const qTrans = query(
      collection(db, 'transactions'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTrans = onSnapshot(qTrans, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setPendingPayments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Withdrawals listener
    const qWith = query(
      collection(db, 'withdrawals'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeWith = onSnapshot(qWith, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Withdrawal[];
      setPendingWithdrawals(data);
      setLoadingWithdrawals(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    // Orders listener (limit to 50 for performance)
    const qOrders = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeOrders = onSnapshot(qOrders, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SMMOrder[];
      setAllOrders(data);
      setLoadingOrders(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubscribeTrans();
      unsubscribeWith();
      unsubscribeOrders();
    };
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
      const userSnap = await getDoc(userRef);
      
      await updateDoc(userRef, {
        balance: increment(transaction.amount)
      });

      // 3. Handle Referral Commission (10%)
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.referralCode) {
          // Find the referrer who owns this code
          const referrerQuery = query(
            collection(db, 'users'), 
            where('myReferralId', '==', userData.referralCode)
          );
          const referrerSnap = await getDocs(referrerQuery);
          
          if (!referrerSnap.empty) {
            const referrerDoc = referrerSnap.docs[0];
            const commissionAmount = transaction.amount * 0.1;
            
            // Credit 10% to referrer reward fields
            await updateDoc(doc(db, 'users', referrerDoc.id), {
              referralEarnings: increment(commissionAmount),
              referralBalance: increment(commissionAmount)
            });
            
            toast.success(`Referral commission of ${formatINR(commissionAmount)} credited to the referrer!`);
          }
        }
      }

      toast.success('Payment approved and wallet updated!');
    } catch (err) {
      console.error(err);
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

  const handleWithdrawApprove = async (withdrawal: Withdrawal) => {
    try {
      const withRef = doc(db, 'withdrawals', withdrawal.id);
      await updateDoc(withRef, { status: 'approved' });
      toast.success('Withdrawal approved! Make sure to send the UPI payment.');
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleWithdrawReject = async (withdrawal: Withdrawal) => {
    try {
      // Return balance to user on rejection
      const batch = writeBatch(db);
      const withRef = doc(db, 'withdrawals', withdrawal.id);
      batch.update(withRef, { status: 'rejected' });
      
      const userRef = doc(db, 'users', withdrawal.userId);
      batch.update(userRef, {
        referralBalance: increment(withdrawal.amount)
      });

      await batch.commit();
      toast.success('Withdrawal rejected and balance returned');
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

  const handleAddFundsManual = async () => {
    if (!foundUser || !addAmount) return;
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount');

    setAddingFunds(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Create approved transaction
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        userId: foundUser.id,
        userEmail: foundUser.email,
        amount: amount,
        utr: 'ADMIN_MANUAL_ADD',
        status: 'approved',
        type: 'add_funds',
        createdAt: new Date().toISOString() // Use string ISO for consistency if serverTimestamp is not imported, but let's check imports
      });

      // 2. Update user balance
      const userRef = doc(db, 'users', foundUser.id);
      batch.update(userRef, {
        balance: increment(amount)
      });

      await batch.commit();
      
      setFoundUser({ ...foundUser, balance: (foundUser.balance || 0) + amount });
      setNewBalance(String((foundUser.balance || 0) + amount));
      setAddAmount('');
      toast.success(`Successfully added ${formatINR(amount)} to user!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add funds');
    } finally {
      setAddingFunds(false);
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
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        className="w-full bg-slate-900 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Add money (Amount)"
                      />
                    </div>
                    <button
                      onClick={handleAddFundsManual}
                      disabled={addingFunds}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
                    >
                      {addingFunds ? 'Adding...' : 'Add Funds'}
                    </button>
                  </div>

                  <div className="flex gap-2 border-t border-slate-700 pt-4">
                    <div className="relative flex-1">
                      <History size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="w-full bg-slate-900 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="Set direct balance"
                      />
                    </div>
                    <button
                      onClick={handleUpdateBalance}
                      disabled={updatingBalance}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
                    >
                      {updatingBalance ? 'Updating...' : 'Set Balance'}
                    </button>
                  </div>
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

      {/* Referral Withdrawals Section */}
      <div className="glass-card p-8 rounded-3xl">
        <h3 className="text-xl font-bold mb-6">Pending Referral Withdrawals</h3>
        {loadingWithdrawals ? (
          <div className="p-12 text-center text-slate-500">Loading withdrawals...</div>
        ) : pendingWithdrawals.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-slate-700 rounded-2xl text-slate-500">
            No pending withdrawals.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingWithdrawals.map((w) => (
              <div key={w.id} className="bg-slate-800/50 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">User: {w.userEmail}</p>
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Withdrawal</span>
                  </div>
                  <p className="text-2xl font-black text-blue-500">{formatINR(w.amount)}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Landmark size={14} className="text-slate-500" />
                      UPI: <span className="text-white font-bold">{w.upiId}</span>
                    </p>
                    <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Smartphone size={14} className="text-slate-500" />
                      Mobile: <span className="text-white font-bold">{w.mobileNumber}</span>
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                  <button
                    onClick={() => handleWithdrawReject(w)}
                    className="flex-1 md:flex-none border border-red-500/20 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <X size={18} />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleWithdrawApprove(w)}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-2"
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

      <div className="glass-card p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <History className="text-blue-500" size={20} />
            <h3 className="text-xl font-bold">Recent Master Orders</h3>
          </div>
          <p className="text-xs text-slate-500">Showing last 50 orders</p>
        </div>
        
        {loadingOrders ? (
          <div className="p-12 text-center text-slate-500">Loading orders...</div>
        ) : allOrders.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-slate-700 rounded-2xl text-slate-500">
            No orders placed yet.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="w-full text-left">
              <thead className="text-xs text-slate-500 uppercase tracking-widest border-b border-slate-700">
                <tr>
                  <th className="pb-4 font-bold">Order ID</th>
                  <th className="pb-4 font-bold">Service</th>
                  <th className="pb-4 font-bold">Charge</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold">Referral</th>
                  <th className="pb-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {allOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-4">
                      <p className="text-white font-medium">#{order.externalOrderId || 'Local'}</p>
                      <p className="text-[10px] text-slate-500">{order.id.slice(0, 10)}</p>
                    </td>
                    <td className="py-4">
                      <p className="text-slate-300 max-w-[150px] truncate">{order.serviceName}</p>
                      <p className="text-[10px] text-slate-500">Qty: {order.quantity}</p>
                    </td>
                    <td className="py-4 font-bold text-white">
                      {formatINR(order.charge)}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4">
                      {order.referralCode ? (
                        <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                          <Tag size={12} />
                          <span className="bg-blue-500/10 px-2 py-0.5 rounded">{order.referralCode}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                    <td className="py-4 text-slate-500 text-xs">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
