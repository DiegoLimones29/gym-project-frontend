import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';
import { useAuth } from '../features/auth/AuthContext';
import { getQueryKeysForTable } from './tableQueryMap';

export type RealtimeStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected';

export interface DbChangeEvent {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  timestamp: number;
  source?: string;
}

interface RealtimeContextValue {
  status: RealtimeStatus;
  lastEvent: DbChangeEvent | null;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<DbChangeEvent | null>(null);

  const hasConnectedBeforeRef = useRef(false);
  const currentUserIdRef = useRef<string | undefined>(user?.id);
  const logoutRef = useRef(logout);

  useEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      hasConnectedBeforeRef.current = false;
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    const socket: Socket = io(`${API_BASE_URL}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    });

    socket.on('connect', () => {
      const wasReconnect = hasConnectedBeforeRef.current;
      hasConnectedBeforeRef.current = true;
      setStatus('connected');

      if (wasReconnect) {
        void queryClient.invalidateQueries();
      }
    });

    socket.on('disconnect', () => {
      setStatus((prev) =>
        hasConnectedBeforeRef.current ? 'reconnecting' : prev === 'connecting' ? 'connecting' : 'disconnected',
      );
    });

    socket.on('connect_error', () => {
      setStatus(hasConnectedBeforeRef.current ? 'reconnecting' : 'connecting');
    });

    socket.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setStatus('disconnected');
    });

    socket.on('auth_error', () => {
      setStatus('disconnected');
      socket.disconnect();
    });

    socket.on('db:change', (event: DbChangeEvent) => {
      setLastEvent(event);

      if (
        event.table === 'users' &&
        event.action === 'DELETE' &&
        event.id &&
        event.id === currentUserIdRef.current
      ) {
        logoutRef.current();
        return;
      }

      const queryKeys = getQueryKeysForTable(event.table);
      if (queryKeys.length === 0) {
        void queryClient.invalidateQueries();
        return;
      }

      for (const queryKey of queryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthenticated, token, queryClient]);

  return (
    <RealtimeContext.Provider value={{ status, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime debe usarse dentro de RealtimeProvider');
  }
  return ctx;
}
