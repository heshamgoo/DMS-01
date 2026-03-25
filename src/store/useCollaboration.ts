import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

export interface Cursor {
  x: number;
  y: number;
}

export interface Collaborator {
  uid: string;
  name: string;
  socketId: string;
  cursor: Cursor | null;
  color: string;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

export function useCollaboration(documentId: string, initialData: any = null) {
  const { profile } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [sharedData, setSharedData] = useState<any>(initialData);
  const isLocalUpdate = useRef(false);

  useEffect(() => {
    if (!documentId || !profile) return;

    // Connect to the WebSocket server
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    const userColor = COLORS[Math.abs(profile.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % COLORS.length];

    newSocket.on('connect', () => {
      newSocket.emit('join-document', {
        documentId,
        user: {
          uid: profile.uid,
          name: profile.fullName,
          color: userColor
        }
      });
    });

    newSocket.on('presence-update', (users: Collaborator[]) => {
      // Filter out self
      setCollaborators(users.filter(u => u.uid !== profile.uid));
    });

    newSocket.on('document-sync', (data: any) => {
      if (!isLocalUpdate.current) {
        setSharedData(data);
      }
    });

    newSocket.on('document-update', (data: any) => {
      if (!isLocalUpdate.current) {
        setSharedData(data);
      }
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (newSocket.connected) {
        newSocket.emit('cursor-move', {
          documentId,
          cursor: { x: e.pageX, y: e.pageY }
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      newSocket.disconnect();
    };
  }, [documentId, profile]);

  const updateSharedData = (data: any) => {
    setSharedData(data);
    isLocalUpdate.current = true;
    if (socket && socket.connected) {
      socket.emit('document-update', { documentId, data });
    }
    // Reset local update flag after a short delay to allow receiving updates again
    setTimeout(() => {
      isLocalUpdate.current = false;
    }, 50);
  };

  return { collaborators, sharedData, updateSharedData };
}
