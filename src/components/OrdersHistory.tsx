import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { formatINR } from '../lib/utils';
import { SMMOrder } from '../types';
import { Search, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export default function OrdersHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SMMOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  const filters = ['All', 'Canceled', 'Completed', 'Processing', 'Pending'];

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.serviceName.toLowerCase().includes(search.toLowerCase()) || 
                         o.id.toLowerCase().includes(search.toLowerCase()) ||
                         o.externalOrderId?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || o.status.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'completed': 
        return <div className="bg-[#5cb85c] text-white px-3 py-1 rounded text-[10px] font-bold uppercase w-16 text-center">COMPLETED</div>;
      case 'canceled': 
      case 'cancelled':
      case 'error':
      case 'refunded':
        return <div className="bg-[#d9534f] text-white px-3 py-1 rounded text-[10px] font-bold uppercase w-16 text-center">CANCEL</div>;
      case 'processing':
      case 'in progress':
      case 'pending':
        return <div className="bg-[#f0ad4e] text-white px-3 py-1 rounded text-[10px] font-bold uppercase w-16 text-center">{s === 'in progress' ? 'PROGRESS' : s}</div>;
      default: 
        return <div className="bg-[#0088cc] text-white px-3 py-1 rounded text-[10px] font-bold uppercase w-16 text-center">{status}</div>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto pb-10">
      {/* Search & Actions */}
      <div className="panel-card bg-white p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-2 px-4 pr-10 focus:ring-1 focus:ring-[#0088cc] outline-none text-sm"
            />
            <button className="absolute right-0 top-0 h-full w-10 bg-[#5cb85c] text-white rounded-r flex items-center justify-center">
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="bg-[#0088cc] text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-tight shadow-sm">COPY ORDER IDS</button>
          <button className="bg-[#f0ad4e] text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-tight shadow-sm">BULK REFILL ORDERS</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeFilter === f ? 'text-[#333] border-b-2 border-[#0088cc]' : 'text-slate-400'
            }`}
          >
            {f === 'Canceled' && <X size={14} />}
            {f === 'Completed' && <Check size={14} />}
            {f}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#0088cc]" size={32} /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="panel-card bg-white p-12 text-center text-slate-400 italic">No orders found matching your filter.</div>
      ) : (
        <div className="space-y-4">
          {/* Header for desktop */}
          <div className="hidden md:flex px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
            <div className="w-10"></div>
            <div className="w-24">ID</div>
            <div className="flex-1">Service</div>
            <div className="w-24 text-right">Charge</div>
            <div className="w-32 text-center">Status</div>
          </div>

          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <div key={order.id} className="panel-card bg-white p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0088cc] focus:ring-[#0088cc]" />
                  <div className="text-xs font-bold text-slate-800 md:w-24">{order.externalOrderId || '---'}</div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between md:hidden mb-1">
                    {getStatusBadge(order.status)}
                    <span className="text-xs font-bold text-[#333]">{formatINR(order.charge)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#333] leading-tight mb-1">
                    {order.serviceId} - {order.serviceName}
                  </h4>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-medium italic">
                    <span className="flex items-center gap-1">✨ Instant</span>
                    <span className="flex items-center gap-1">⚡ Fast</span>
                    {order.link && <span className="text-[#0088cc] hover:underline truncate max-w-[200px]">{order.link}</span>}
                  </div>
                </div>

                <div className="hidden md:block w-24 text-right text-sm font-bold text-[#333]">
                  {formatINR(order.charge)}
                </div>

                <div className="hidden md:flex w-32 justify-center">
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
