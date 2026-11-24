import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  seq?: number;
}

interface RealtimePollResponse {
  cursor: number;
  events: DbChangeEvent[];
  reset: boolean;
}

interface RealtimeContextValue {
  status: RealtimeStatus;
  lastEvent: DbChangeEvent | null;
}

const POLL_TIMEOUT_MS = 25_000;
const CLIENT_REQUEST_TIMEOUT_MS = 35_000;
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 15_000;
const MIN_EMPTY_POLL_INTERVAL_MS = 250;

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<DbChangeEvent | null>(null);

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
      setStatus('disconnected');
      return;
    }

    let stopped = false;
    let hasConnectedBefore = false;
    let cursor: number | null = null;
    let needsReconnectSync = false;
    let retryAttempt = 0;
    let activeController: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelSleep: (() => void) | null = null;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          if (retryTimer !== null) {
            clearTimeout(retryTimer);
            retryTimer = null;
          }
          cancelSleep = null;
          resolve();
        };
        cancelSleep = finish;
        retryTimer = setTimeout(finish, ms);
      });

    setStatus('connecting');

    const runLoop = async () => {
      while (!stopped) {
        const previousCursor = cursor;
        const wasReconnectAttempt = needsReconnectSync;
        const url =
          previousCursor === null
            ? `${API_BASE_URL}/realtime/poll`
            : wasReconnectAttempt
              ? `${API_BASE_URL}/realtime/poll?since=${previousCursor}&timeout=0`
              : `${API_BASE_URL}/realtime/poll?since=${previousCursor}&timeout=${POLL_TIMEOUT_MS}`;

        const controller = new AbortController();
        activeController = controller;
        let requestTimedOut = false;
        const requestTimer = setTimeout(() => {
          requestTimedOut = true;
          controller.abort();
        }, CLIENT_REQUEST_TIMEOUT_MS);

        const startedAt = Date.now();

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
            signal: controller.signal,
          });

          if (stopped) {
            break;
          }

          if (response.status === 401 || response.status === 403) {
            setStatus('disconnected');
            break;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = (await response.json()) as Partial<RealtimePollResponse>;
          if (
            typeof data?.cursor !== 'number' ||
            !Array.isArray(data?.events)
          ) {
            throw new Error('Respuesta de long polling inválida');
          }

          if (stopped) {
            break;
          }

          retryAttempt = 0;
          needsReconnectSync = false;
          cursor = data.cursor;
          hasConnectedBefore = true;
          setStatus('connected');

          const events = data.events;
          const currentUserDeleted = events.some(
            (event) =>
              event.table === 'users' &&
              event.action === 'DELETE' &&
              event.id &&
              event.id === currentUserIdRef.current,
          );

          if (currentUserDeleted) {
            logoutRef.current();
            break;
          }

          if (events.length > 0) {
            setLastEvent(events[events.length - 1]);
          }

          if (wasReconnectAttempt || data.reset) {
            void queryClient.invalidateQueries();
          } else if (events.length > 0) {
            const seen = new Set<string>();
            const keysToInvalidate: string[][] = [];
            let invalidateAll = false;

            for (const event of events) {
              const queryKeys = getQueryKeysForTable(event.table);
              if (queryKeys.length === 0) {
                invalidateAll = true;
                break;
              }
              for (const queryKey of queryKeys) {
                const serialized = JSON.stringify(queryKey);
                if (!seen.has(serialized)) {
                  seen.add(serialized);
                  keysToInvalidate.push(queryKey);
                }
              }
            }

            if (invalidateAll) {
              void queryClient.invalidateQueries();
            } else {
              for (const queryKey of keysToInvalidate) {
                void queryClient.invalidateQueries({ queryKey });
              }
            }
          }

          if (
            !wasReconnectAttempt &&
            previousCursor !== null &&
            events.length === 0 &&
            !data.reset &&
            Date.now() - startedAt < MIN_EMPTY_POLL_INTERVAL_MS
          ) {
            await sleep(MIN_EMPTY_POLL_INTERVAL_MS);
          }
        } catch (error) {
          if (stopped) {
            break;
          }

          if (
            error instanceof DOMException &&
            error.name === 'AbortError' &&
            !requestTimedOut
          ) {
            break;
          }

          needsReconnectSync = true;
          setStatus(hasConnectedBefore ? 'reconnecting' : 'connecting');

          const delayMs = Math.min(
            INITIAL_RETRY_DELAY_MS * 2 ** retryAttempt,
            MAX_RETRY_DELAY_MS,
          );
          retryAttempt += 1;
          await sleep(delayMs);
        } finally {
          clearTimeout(requestTimer);
          if (activeController === controller) {
            activeController = null;
          }
        }
      }
    };

    void runLoop();

    return () => {
      stopped = true;
      activeController?.abort();
      activeController = null;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      cancelSleep?.();
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
