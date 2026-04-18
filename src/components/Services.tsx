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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold">Services List</h2>
          <p className="text-slate-400">Categorized social media marketing solutions.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search for something specific..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Platform Selector */}
      <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const isActive = activePlatform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`flex flex-col items-center justify-center min-w-[100px] p-4 rounded-3xl transition-all border ${
                isActive 
                  ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-900/30' 
                  : 'glass-card border-transparent hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-xl mb-2 ${isActive ? 'bg-white/20' : 'bg-slate-800'} ${isActive ? 'text-white' : p.color}`}>
                <Icon size={24} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {p.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setActivePlatform('other')}
          className={`flex flex-col items-center justify-center min-w-[100px] p-4 rounded-3xl transition-all border ${
            activePlatform === 'other' 
              ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-900/30' 
              : 'glass-card border-transparent hover:border-slate-700'
          }`}
        >
          <div className={`p-2 rounded-xl mb-2 ${activePlatform === 'other' ? 'bg-white/20' : 'bg-slate-800'} text-slate-400`}>
            <Globe size={24} />
          </div>
          <span className={`text-xs font-bold uppercase tracking-widest ${activePlatform === 'other' ? 'text-white' : 'text-slate-400'}`}>
            Other
          </span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading amazing services...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.length === 0 ? (
            <div className="p-12 text-center glass-card rounded-3xl text-slate-500 italic">
              No services found for this category.
            </div>
          ) : (
            filtered.map((service, idx) => (
              <div key={idx} className="glass-card p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-800/50 transition-all border border-transparent hover:border-blue-500/20 group">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] uppercase font-black text-blue-500 tracking-tighter bg-blue-500/10 px-2 rounded">
                      {getPlatform(service)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{service.category}</span>
                  </div>
                  <h4 className="text-lg font-bold group-hover:text-blue-400 transition-colors leading-tight">{service.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="text-[10px] bg-slate-800/80 px-3 py-1.5 rounded-xl text-slate-400 flex items-center gap-1.5 font-bold">
                      <LayoutGrid size={12} />
                      Min: {service.min}
                    </div>
                    <div className="text-[10px] bg-slate-800/80 px-3 py-1.5 rounded-xl text-slate-400 flex items-center gap-1.5 font-bold">
                      <LayoutGrid size={12} />
                      Max: {service.max}
                    </div>
                    {service.refill && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold">
                        Auto Refill
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-6 w-full md:w-auto border-t md:border-t-0 border-slate-800/50 pt-4 md:pt-0">
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Rate Per 1k</p>
                    <p className="text-3xl font-black text-white glow-text">{formatINR(parseFloat(service.rate))}</p>
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
