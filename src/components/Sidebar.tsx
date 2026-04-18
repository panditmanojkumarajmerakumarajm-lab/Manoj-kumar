import { Home, PlusCircle, List, History, CreditCard, ShieldCheck, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  isAdmin: boolean;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'new-order', label: 'New Order', icon: PlusCircle },
  { id: 'orders', label: 'Orders', icon: History },
  { id: 'wallet', label: 'Add Funds', icon: CreditCard },
];

export default function Sidebar({ currentTab, setTab, isAdmin }: SidebarProps) {
  return (
    <div className="hidden md:flex w-64 bg-slate-900 h-screen flex-col border-r border-slate-800">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 p-0.5 bg-slate-800 shrink-0 overflow-hidden shadow-lg shadow-blue-500/10">
          <img 
            src="https://cdn.phototourl.com/free/2026-04-18-b1b736c3-eafe-4366-89b3-b1eb5ee9a62f.png" 
            alt="BharatSMM Logo" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-500 tracking-tight">BharatSMM</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest leading-none">SMM Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all",
              currentTab === item.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setTab('admin')}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mt-8",
              currentTab === 'admin' 
                ? "bg-purple-600 text-white" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <ShieldCheck size={20} />
            <span className="font-medium">Admin Panel</span>
          </button>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
