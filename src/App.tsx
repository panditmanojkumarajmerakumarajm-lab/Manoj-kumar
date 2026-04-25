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
                src="https://img.sanishtech.com/u/5ea88f19ae3f59add4421ea1d1b5d3a1.png" 
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
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderTab()}
          </div>
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
