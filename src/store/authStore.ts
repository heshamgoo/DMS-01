import { create } from 'zustand';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type AppRole = 'Admin' | 'Manager' | 'Employee';
export type AppPermission = 'View' | 'Edit' | 'Full Access';

export interface EmployeeProfile {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  position: string;
  department: string;
  status: 'Active' | 'Inactive';
  role: AppRole;
  permissions: AppPermission[];
  createdAt: string;
}

interface AuthState {
  user: any | null;
  profile: EmployeeProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  init: () => void;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  isLoading: true,
  error: null,
  init: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'employees', user.uid));
          let profile: EmployeeProfile;
          
          if (docSnap.exists()) {
            profile = docSnap.data() as EmployeeProfile;
            if (profile.status === 'Inactive') {
              await signOut(auth);
              set({ user: null, profile: null, isAdmin: false, isLoading: false, error: 'Account is deactivated. Please contact your administrator.' });
              return;
            }
          } else {
            // Auto-create profile for the initial admin
            if (user.email === 'heshamgoo39@gmail.com' || user.email === 'moahmednoury@gmail.com') {
              profile = {
                uid: user.uid,
                fullName: 'System Admin',
                email: user.email || '',
                phoneNumber: '',
                position: 'System Administrator',
                department: 'Management',
                status: 'Active',
                role: 'Admin',
                permissions: ['Full Access'],
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'employees', user.uid), profile);
            } else {
              await signOut(auth);
              set({ user: null, profile: null, isAdmin: false, isLoading: false, error: 'Account not found. Please contact your administrator.' });
              return;
            }
          }
          
          set({ 
            user, 
            profile, 
            isAdmin: profile.role === 'Admin', 
            isLoading: false 
          });
        } catch (error) {
          console.error("Error fetching profile:", error);
          set({ user, isLoading: false });
        }
      } else {
        set({ user: null, profile: null, isAdmin: false, isLoading: false });
      }
    });
  },
  login: async (email, password, rememberMe) => {
    set({ isLoading: true, error: null });
    try {
      // Set persistence based on remember me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      try {
        await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
      } catch (err: any) {
        // Auto-create the initial admin accounts if they don't exist yet
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          if ((email.toLowerCase() === 'heshamgoo39@gmail.com' || email.toLowerCase() === 'moahmednoury@gmail.com') && password === '123456') {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
              const uid = userCredential.user.uid;
              const profile: EmployeeProfile = {
                uid,
                fullName: 'System Admin',
                email: email.toLowerCase(),
                phoneNumber: '',
                position: 'System Administrator',
                department: 'Management',
                status: 'Active',
                role: 'Admin',
                permissions: ['Full Access'],
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'employees', uid), profile);
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
              } else {
                throw createErr;
              }
            }
          } else {
            throw new Error('Invalid email or password');
          }
        } else {
          throw err;
        }
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    await signOut(auth);
    set({ user: null, profile: null, isAdmin: false });
  },
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw error;
    }
  },
  setError: (error) => set({ error }),
}));
