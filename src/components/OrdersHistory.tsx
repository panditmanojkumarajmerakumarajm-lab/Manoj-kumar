import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { formatINR } from '../lib/utils';
import { SMMOrder } from '../types';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function OrdersHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SMMOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SMMOrder[];
      setOrders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'cancelled': return <XCircle size={16} className="text-red-500" />;
      case 'pending': return <Clock size={16} className="text-amber-500" />;
      default: return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Orders History</h2>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center p-12 glass-card rounded-3xl">
          <p className="text-slate-500">No orders found. Place your first order today!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 tracking-widest border-b border-slate-800">
                <th className="px-4 py-4">ID</th>
                <th className="px-4 py-4">Service</th>
                <th className="px-4 py-4">Link</th>
                <th className="px-4 py-4">Quantity</th>
                <th className="px-4 py-4">Charge</th>
                <th className="px-4 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((order) => (
                <tr key={order.id} className="text-sm hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-4 font-mono text-[10px] text-slate-500">{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-4 font-medium">{order.serviceName}</td>
                  <td className="px-4 py-4 truncate max-w-[200px] text-slate-400">
                    <a href={order.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                      {order.link}
                    </a>
                  </td>
                  <td className="px-4 py-4">{order.quantity}</td>
                  <td className="px-4 py-4 font-bold">{formatINR(order.charge)}</td>
                  <td className="px-4 py-4 space-x-2 flex items-center">
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
