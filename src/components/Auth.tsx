import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn, UserPlus, KeyRound, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created! Welcome to BharatSMM.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }

    setLoading(true);
    console.log("Attempting password reset for:", email);
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Reset email sent successfully");
      toast.success('Password reset link sent! Please check your Inbox and Spam folder.');
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f6f9]">
      <div className="w-full max-w-md panel-card p-6 md:p-8 space-y-8">
        <div className="text-center flex flex-col items-center">
          <img 
            src="https://cdn.phototourl.com/free/2026-04-18-b1b736c3-eafe-4366-89b3-b1eb5ee9a62f.png" 
            alt="BharatSMM Logo" 
            className="h-16 md:h-20 w-auto mb-4"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-bold text-[#333] uppercase">BharatSMM</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tighter">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-2.5 pl-10 pr-4 focus:ring-1 focus:ring-[#0088cc] outline-none text-sm"
                placeholder="Email address"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter">Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] font-bold text-[#0088cc] hover:underline uppercase"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-2.5 pl-10 pr-4 focus:ring-1 focus:ring-[#0088cc] outline-none text-sm"
                placeholder="Password"
                required
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-sm"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                <span>{isLogin ? 'Login' : 'Signup'}</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-500 hover:text-[#0088cc] transition-colors text-xs font-bold"
          >
            {isLogin ? "DON'T HAVE ACCOUNT? REGISTER" : "ALREADY HAVE ACCOUNT? LOGIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
