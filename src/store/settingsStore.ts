import { create } from 'zustand';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

export interface LoginCertification {
  title: string;
  description: string;
  icon: string;
}

interface CompanySettings {
  name: string;
  logoUrl?: string;
  loginBgUrl?: string;
  loginLogoUrl?: string;
  logoTop?: number;
  logoLeft?: number;
  address?: string;
  phone?: string;
  email?: string;
  updatedAt?: string;
  departments?: string[];
  loginCompanyNameLine1?: string;
  loginCompanyNameLine2?: string;
  loginSloganLine1?: string;
  loginSloganLine2?: string;
  loginCertifications?: LoginCertification[];
}

interface SettingsState {
  settings: CompanySettings | null;
  isLoading: boolean;
  error: string | null;
  init: () => void;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
}

const sanitize = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitize(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitize(v)])
    );
  }
  return obj;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: true,
  error: null,
  init: () => {
    const docRef = doc(db, 'settings', 'main');
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        set({ settings: docSnap.data() as CompanySettings, isLoading: false, error: null });
      } else {
        set({ 
          settings: { 
            name: 'Porto Marine Services L.L.C',
            logoUrl: 'https://ais-pre-mqniulfb23hoygpxy7hd4c-255445966847.europe-west1.run.app/logo.png', // Placeholder or actual if available
            address: 'Abu Dhabi | UAE | Biladi ST | Mariam Ahmed Abdullah Tower | M Floor | Office No.1',
            phone: '+971 50 144 0994',
            email: 'Diving@portomarines.com',
            departments: ['General', 'HR', 'Finance', 'Operation', 'Public']
          }, 
          isLoading: false, 
          error: null 
        });
      }
    }, (error) => {
      console.error("Error fetching company settings:", error);
      set({ error: error.message, isLoading: false });
    });
  },
  updateSettings: async (newSettings) => {
    try {
      const docRef = doc(db, 'settings', 'main');
      const updates = sanitize({ ...get().settings, ...newSettings, updatedAt: new Date().toISOString() });
      await setDoc(docRef, updates, { merge: true });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    }
  },
}));
