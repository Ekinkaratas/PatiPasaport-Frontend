import { useEffect, useRef, useState } from 'react';

export const BOT_BLOCKED_CODE = 'REQUEST_BLOCKED';

export interface HoneypotState {
  value: string;
  onChange: (value: string) => void;
}

export interface BotGuard {
  honeypot: HoneypotState;
  isLikelyBot: () => boolean;
}

export function useBotGuard({
  minFillMs = 0,
}: { minFillMs?: number } = {}): BotGuard {
  const [value, setValue] = useState('');
  const mountedAt = useRef<number | null>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const isLikelyBot = () => {
    if (value !== '') return true;
    if (minFillMs > 0 && mountedAt.current !== null) {
      return Date.now() - mountedAt.current < minFillMs;
    }
    return false;
  };

  return { honeypot: { value, onChange: setValue }, isLikelyBot };
}
