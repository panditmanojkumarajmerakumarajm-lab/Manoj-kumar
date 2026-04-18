import { Home, PlusCircle, List, History, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'new-order', label: 'Order', icon: PlusCircle },
  { id: 'orders', label: 'History', icon: History },
  { id: 'wallet', label: 'Wallet', icon: CreditCard },
];

export default function BottomNav({ currentTab, setTab }: BottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass-card rounded-[2rem] p-2 flex justify-around items-center z-50 shadow-2xl shadow-blue-900/40 border border-white/10">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all",
            currentTab === item.id 
              ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-900/50" 
              : "text-slate-500 active:scale-95"
          )}
        >
          <item.icon size={20} />
          <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
