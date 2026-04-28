import { LayoutGrid, ShoppingCart, UserPlus, History, RotateCcw, List, Wallet, Ticket, Code, LogOut, X, Instagram } from 'lucide-react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'New Order', icon: ShoppingCart },
  { id: 'child-panels', label: 'Child Panels', icon: UserPlus },
  { id: 'orders', label: 'Orders', icon: History },
  { id: 'refill', label: 'Refill History', icon: RotateCcw },
  { id: 'services', label: 'Services', icon: List },
  { id: 'wallet', label: 'Deposit', icon: Wallet },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'api', label: 'API', icon: Code },
];

export default function Sidebar({ currentTab, setTab, isAdmin, isOpen, onClose }: SidebarProps) {
  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 transform md:relative md:translate-x-0 overflow-y-auto",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-4 flex items-center justify-between border-b border-slate-100 md:hidden">
        <span className="font-bold text-[#0088cc]">Menu</span>
        <button onClick={onClose} className="p-2 text-slate-400">
          <X size={20} />
        </button>
      </div>

      <nav className="py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (['api', 'tickets', 'child-panels'].includes(item.id)) {
                window.open(`https://wa.me/918955932061?text=Hello, I need help with ${item.label}`, '_blank');
              } else if (item.id === 'instagram') {
                window.open('https://www.instagram.com/newbharatsmm?igsh=MWE3NWxhNDAzeHdydw==', '_blank');
              } else {
                setTab(item.id);
              }
              onClose();
            }}
            className={cn(
              "w-full flex items-center space-x-3 px-6 py-3 transition-colors text-sm font-medium",
              currentTab === item.id 
                ? "text-[#0088cc] bg-slate-50 border-r-4 border-[#0088cc]" 
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0088cc]"
            )}
          >
            <item.icon size={18} className="shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => {
              setTab('admin');
              onClose();
            }}
            className={cn(
              "w-full flex items-center space-x-3 px-6 py-3 transition-colors text-sm font-medium mt-4",
              currentTab === 'admin' 
                ? "text-purple-600 bg-slate-50 border-r-4 border-purple-600" 
                : "text-slate-600 hover:bg-slate-50 hover:text-purple-600"
            )}
          >
            <LayoutGrid size={18} className="shrink-0" />
            <span>Admin Panel</span>
          </button>
        )}
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center space-x-3 px-4 py-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
