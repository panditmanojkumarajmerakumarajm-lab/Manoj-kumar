import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatINR } from '../lib/utils';
import { SMMService } from '../types';
import { Search, Instagram, Youtube, Facebook, Send, Music2, MessageSquare, Globe, LayoutGrid } from 'lucide-react';
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

export default function Services() {
  const [services, setServices] = useState<SMMService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/services');
        setServices(res.data);
      } catch (err) {
        toast.error('Failed to load services');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Services List</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Browse our categorized social media marketing solutions.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search for something specific..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#0088cc] outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Platform Selector */}
      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const isActive = activePlatform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`flex flex-col items-center justify-center min-w-[90px] p-4 rounded-xl transition-all border ${
                isActive 
                  ? 'bg-[#0088cc] border-[#0088cc] shadow-md' 
                  : 'bg-white border-slate-200 hover:border-[#0088cc] shadow-sm'
              }`}
            >
              <div className={`p-2 rounded-lg mb-2 ${isActive ? 'bg-white/20' : 'bg-slate-50'} ${isActive ? 'text-white' : p.color}`}>
                <Icon size={22} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {p.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setActivePlatform('other')}
          className={`flex flex-col items-center justify-center min-w-[90px] p-4 rounded-xl transition-all border ${
            activePlatform === 'other' 
              ? 'bg-[#0088cc] border-[#0088cc] shadow-md' 
              : 'bg-white border-slate-200 hover:border-[#0088cc] shadow-sm'
          }`}
        >
          <div className={`p-2 rounded-lg mb-2 ${activePlatform === 'other' ? 'bg-white/20' : 'bg-slate-50'} text-slate-400`}>
            <Globe size={22} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${activePlatform === 'other' ? 'text-white' : 'text-slate-500'}`}>
            Other
          </span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading amazing services...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.length === 0 ? (
            <div className="p-12 text-center panel-card text-slate-500 italic">
              No services found for this category.
            </div>
          ) : (
            filtered.map((service, idx) => (
              <div key={idx} className="panel-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#0088cc]/50 transition-all group">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] uppercase font-black text-[#0088cc] tracking-tighter bg-[#0088cc]/10 px-2 rounded">
                      {getPlatform(service)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[200px]">{service.category}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 group-hover:text-[#0088cc] transition-colors leading-tight">{service.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-md text-slate-500 flex items-center gap-1.5 font-bold border border-slate-100">
                      <LayoutGrid size={12} />
                      Min: {service.min}
                    </div>
                    <div className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-md text-slate-500 flex items-center gap-1.5 font-bold border border-slate-100">
                      <LayoutGrid size={12} />
                      Max: {service.max}
                    </div>
                    {service.refill && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md border border-emerald-100 font-bold">
                        Auto Refill
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-6 w-full md:w-auto border-t md:border-t-0 border-slate-50 pt-3 md:pt-0">
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Rate Per 1k</p>
                    <p className="text-2xl font-black text-[#0088cc]">{formatINR(parseFloat(service.rate))}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
