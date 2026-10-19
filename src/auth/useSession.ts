import { useSyncExternalStore } from 'react';
import { getSessionState, subscribe, type SessionState } from './session';

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSessionState, getSessionState);
}
