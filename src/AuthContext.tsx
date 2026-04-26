import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Subscribe to profile changes
        const userDocRef = doc(db, 'users', u.uid);
        
        // Initial fetch or create
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const adminEmails = ['tiwarigautam819@gmail.com', 'kumar493891@gmail.com'];
          const isInitialAdmin = u.email && adminEmails.includes(u.email.toLowerCase());
          
          const generateReferralId = () => {
            return Math.random().toString(36).substring(2, 10).toUpperCase();
          };

          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            balance: 0,
            ordersCount: 0,
            totalSpend: 0,
            isAdmin: !!isInitialAdmin,
            myReferralId: generateReferralId(),
            referralEarnings: 0,
            referralBalance: 0,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        }

        const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const adminEmails = ['tiwarigautam819@gmail.com', 'kumar493891@gmail.com'];
            
            // Generate referral ID if missing for existing users
            if (!data.myReferralId) {
              const newId = Math.random().toString(36).substring(2, 10).toUpperCase();
              await updateDoc(userDocRef, { myReferralId: newId });
              data.myReferralId = newId;
            }

            // Ensure referral reward fields exist
            if (data.referralEarnings === undefined || data.referralBalance === undefined) {
              const updates: any = {};
              if (data.referralEarnings === undefined) updates.referralEarnings = 0;
              if (data.referralBalance === undefined) updates.referralBalance = 0;
              await updateDoc(userDocRef, updates);
              data.referralEarnings = data.referralEarnings ?? 0;
              data.referralBalance = data.referralBalance ?? 0;
            }
            
            // Auto-upgrade to admin in DB if missing (case-insensitive check)
            if (u.email && adminEmails.includes(u.email.toLowerCase())) {
              let changed = false;
              if (!data.isAdmin) {
                data.isAdmin = true;
                changed = true;
              }
              
              // Also ensure presence in 'admins' collection for firestore rules
              const adminRef = doc(db, 'admins', u.uid);
              const adminSnap = await getDoc(adminRef);
              if (!adminSnap.exists()) {
                await setDoc(adminRef, { email: u.email, createdAt: new Date().toISOString() });
              }

              if (changed) {
                await updateDoc(userDocRef, { isAdmin: true });
              }
            }
            
            setProfile(data);
          }
        });

        setLoading(false);
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
