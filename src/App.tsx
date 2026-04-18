/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
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

  const adminEmails = ['tiwarigautam819@gmail.com', 'kumar493891@gmail.com'];
  const isAdmin = profile?.isAdmin || (profile?.email && adminEmails.includes(profile.email.toLowerCase()));

  if (!user) {
    return <Auth />;
  }

  const renderTab = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard profile={profile!} setTab={setCurrentTab} />;
      case 'new-order': return <NewOrder />;
      case 'orders': return <OrdersHistory />;
      case 'wallet': return <Wallet />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard profile={profile!} setTab={setCurrentTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      <Sidebar currentTab={currentTab} setTab={setCurrentTab} isAdmin={isAdmin} />
      
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-slate-900 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <div className="md:hidden w-10 h-10 rounded-full border border-blue-500/20 p-0.5 bg-slate-900 shrink-0 overflow-hidden">
              <img 
                src="https://cdn.phototourl.com/free/2026-04-18-b1b736c3-eafe-4366-89b3-b1eb5ee9a62f.png" 
                alt="BharatSMM Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Pages</span>
              <span className="text-slate-700">/</span>
              <span className="font-bold capitalize">{currentTab.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <WalletIcon size={16} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Balance</p>
                <p className="font-bold text-emerald-400">{formatINR(profile?.balance || 0)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{profile?.email.split('@')[0]}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{isAdmin ? 'Admin' : 'User'}</p>
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all group"
                title="Logout"
              >
                <LogOut size={20} className="group-hover:scale-110 transition-transform" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/40">
                <UserIcon size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderTab()}
          </div>
          
          <footer className="mt-20 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs gap-4 mb-4 pb-24 md:pb-4">
            <p>© 2026 BharatSMM. All rights reserved.</p>
            <div className="flex space-x-6">
              <button className="hover:text-blue-400">Terms of Service</button>
              <button className="hover:text-blue-400">Privacy Policy</button>
              <button className="hover:text-blue-400">Contact Support</button>
            </div>
          </footer>
        </div>

        <BottomNav currentTab={currentTab} setTab={setCurrentTab} />
        
        {/* Floating WhatsApp Support */}
        <a
          href="https://wa.me/918955932061?text=Hello BharatSMM Support, I need help with..."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-900/40 hover:scale-110 active:scale-95 transition-all z-40 group"
          title="Contact Support"
        >
          <MessageCircle size={28} />
          <span className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-800">
            WhatsApp Support
          </span>
        </a>
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
            background: '#1e293b',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />
    </AuthProvider>
  );
}
