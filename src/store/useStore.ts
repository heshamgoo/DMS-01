import { create } from 'zustand';
import { User, Template, Document, DocumentStatus, ApprovalLog, Client } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc,
  getDocFromServer
} from 'firebase/firestore';

interface AppState {
  templates: Template[];
  documents: Document[];
  clients: Client[];
  loading: boolean;
  
  init: () => (() => void);
  addTemplate: (template: Template) => Promise<void>;
  updateTemplate: (id: string, template: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  
  addDocument: (doc: Document) => Promise<void>;
  updateDocumentStatus: (docId: string, status: DocumentStatus, log: ApprovalLog) => Promise<void>;
  updateDocumentData: (docId: string, data: Record<string, any>) => Promise<void>;

  addClient: (client: Client) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
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

export const useStore = create<AppState>((set, get) => ({
  templates: [],
  documents: [],
  clients: [],
  loading: true,
  
  init: () => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    // Listen to templates
    const templatesUnsub = onSnapshot(collection(db, 'templates'), (snapshot) => {
      const templates = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return data as Template;
      });
      set({ templates, loading: false });
    }, (error) => {
      // Don't throw here to avoid crashing the app on initial load if rules are being deployed
      console.error('Templates snapshot error:', error);
      set({ loading: false });
    });

    // Listen to documents
    const documentsUnsub = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const documents = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return data as Document;
      });
      set({ documents, loading: false });
    }, (error) => {
      console.error('Documents snapshot error:', error);
    });

    // Listen to clients
    const clientsUnsub = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clients = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return data as Client;
      });
      set({ clients });
    }, (error) => {
      console.error('Clients snapshot error:', error);
    });

    return () => {
      templatesUnsub();
      documentsUnsub();
      clientsUnsub();
    };
  },
  
  addTemplate: async (template) => {
    console.log('Adding template:', template);
    const toSave = { ...template };
    const sanitized = sanitize(toSave);
    const path = `templates/${template.id}`;
    try {
      await setDoc(doc(db, 'templates', template.id), sanitized);
      console.log('Template added successfully');
    } catch (error) {
      console.error('Error adding template:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  
  updateTemplate: async (id, updated) => {
    console.log('Updating template:', id, updated);
    const toSave = { ...updated };
    const sanitized = sanitize(toSave);
    const path = `templates/${id}`;
    try {
      await updateDoc(doc(db, 'templates', id), sanitized);
      console.log('Template updated successfully');
    } catch (error) {
      console.error('Error updating template:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  
  deleteTemplate: async (id) => {
    const path = `templates/${id}`;
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  
  addDocument: async (docData) => {
    const toSave = { ...docData };
    const sanitized = sanitize(toSave);
    const path = `documents/${docData.id}`;
    try {
      await setDoc(doc(db, 'documents', docData.id), sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  
  updateDocumentStatus: async (docId, status, log) => {
    const path = `documents/${docId}`;
    try {
      const docRef = doc(db, 'documents', docId);
      const currentDoc = get().documents.find(d => d.id === docId);
      if (!currentDoc) return;

      const updates = sanitize({ 
        status, 
        logs: [...currentDoc.logs, log],
        updatedAt: new Date().toISOString()
      });

      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  
  updateDocumentData: async (docId, data) => {
    const path = `documents/${docId}`;
    try {
      const updates = sanitize({
        data,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'documents', docId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  addClient: async (client) => {
    const toSave = { ...client };
    const sanitized = sanitize(toSave);
    const path = `clients/${client.id}`;
    try {
      await setDoc(doc(db, 'clients', client.id), sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  updateClient: async (id, updated) => {
    const toSave = { ...updated };
    const sanitized = sanitize(toSave);
    const path = `clients/${id}`;
    try {
      await updateDoc(doc(db, 'clients', id), sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteClient: async (id) => {
    const path = `clients/${id}`;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}));
