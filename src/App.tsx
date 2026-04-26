/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { useOrderStatusSync } from './hooks/useOrderStatusSync';
import { auth } from './firebase';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewOrder from './components/NewOrder';
import OrdersHistory from './components/OrdersHistory';
import Wallet from './components/Wallet';
import AdminPanel from './components/AdminPanel';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav';
import { formatINR } from './lib/utils';
import { Wallet as WalletIcon, User as UserIcon, MessageCircle, LogOut } from 'lucide-react';

function MainApp() {
  const { user, profile } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useOrderStatusSync(user?.uid);

  const adminEmails = ['tiwarigautam819@gmail.com', 'kumar493891@gmail.com'];
  const isAdmin = profile?.isAdmin || (profile?.email && adminEmails.includes(profile.email.toLowerCase()));

  if (!user) {
    return <Auth />;
  }

  const renderTab = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard profile={profile!} setTab={setCurrentTab} />;
      case 'new-order': return <Dashboard profile={profile!} setTab={setCurrentTab} />;
      case 'orders': return <OrdersHistory />;
      case 'wallet': return <Wallet />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard profile={profile!} setTab={setCurrentTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f9] text-[#333] selection:bg-[#0088cc]/30">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        currentTab={currentTab} 
        setTab={(tab) => {
          setCurrentTab(tab);
          setIsSidebarOpen(false);
        }} 
        isAdmin={isAdmin}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col relative min-h-screen">
        {/* Top Header */}
        <header className="h-14 md:h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-[#0088cc] p-2"
            >
              <div className="w-6 h-0.5 bg-[#0088cc] mb-1"></div>
              <div className="w-6 h-0.5 bg-[#0088cc] mb-1"></div>
              <div className="w-6 h-0.5 bg-[#0088cc]"></div>
            </button>
            <div className="flex items-center">
              <img 
                src="https://img.sanishtech.com/u/60b9981de99ed812d965d653e39a147a.png" 
                alt="BharatSMM Logo" 
                className="h-12 md:h-16 w-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center">
              <div className="bg-[#5cb85c] text-white px-3 md:px-4 py-1.5 rounded flex items-center gap-2 text-sm font-bold border border-[#4cae4c] shadow-sm">
                <WalletIcon size={14} className="md:size-4" />
                <span>{formatINR(profile?.balance || 0).replace('₹', '₹ ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-[#0088cc] flex items-center justify-center text-white font-bold text-sm md:text-base border border-[#0077b3] shadow-sm uppercase">
                {profile?.email?.[0] || 'U'}
              </div>
              <div className="p-1 md:p-2 text-slate-400">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-slate-400"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto">
            {renderTab()}
          </div>
          
          {/* Floating WhatsApp Button */}
          <a 
            href="https://wa.me/918955932061?text=Hello BharatSMM Support, I need some help." 
            target="_blank" 
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 group"
          >
            <div className="bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 md:p-4 rounded-full shadow-[0_4px_24px_rgba(37,211,102,0.4)] transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 md:w-8 md:h-8 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="absolute right-full mr-3 bg-white text-[#25D366] px-3 py-1.5 rounded-lg text-sm font-bold shadow-xl border border-[#25D366]/20 whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none">
                WhatsApp Support
              </span>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      />
    </AuthProvider>
  );
}
