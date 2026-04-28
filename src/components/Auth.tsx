import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn, UserPlus, KeyRound, Loader2, Tag } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generateReferralId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile with referral code
        const adminEmails = ['tiwarigautam819@gmail.com', 'kumar493891@gmail.com'];
        const isInitialAdmin = user.email && adminEmails.includes(user.email.toLowerCase());
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          balance: 0,
          ordersCount: 0,
          totalSpend: 0,
          isAdmin: !!isInitialAdmin,
          referralCode: referralCode.trim() || null,
          myReferralId: generateReferralId(),
          createdAt: new Date().toISOString()
        });
        
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
            src="https://img.sanishtech.com/u/be91e1d1b58877d055aa4b3ff51a5aa8.png" 
            alt="BharatSMM Logo" 
            className="h-24 md:h-32 w-auto mb-4"
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter">
                {isLogin ? 'Password' : 'Set Your New Password'}
              </label>
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
                placeholder={isLogin ? "Enter Password" : "Create a New Password"}
                required
              />
            </div>
            {!isLogin && (
              <p className="text-[10px] text-slate-400 mt-1">Yahan apna ek naya password banayein jo aap yaad rakh sakein.</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tighter">Referral Code (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Tag size={16} />
                </span>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full bg-[#fcfcfc] border border-slate-200 rounded py-2.5 pl-10 pr-4 focus:ring-1 focus:ring-[#0088cc] outline-none text-sm"
                  placeholder="Referral code (Optional)"
                />
              </div>
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-sm mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                <span>{isLogin ? 'Login Kariye' : 'Naya Account Banayein'}</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600 mb-2">
            {isLogin ? "Pahle se account nahi hai?" : "Kya aapka pahle se account hai?"}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-2 border-2 border-[#0088cc] text-[#0088cc] rounded-lg hover:bg-[#0088cc] hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
          >
            {isLogin ? "Naya Account Register Karein" : "Login Page Par Jayein"}
          </button>
        </div>
      </div>
    </div>
  );
}
