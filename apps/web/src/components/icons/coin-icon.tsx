interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

function BtcIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.6-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5 .3 5.9-2.3.8-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4.2 1-5.4.7l1-3.9c1.2.3 5 .9 4.4 3.2zm.6-5.3c-.5 2-3.6.9-4.6.7l.9-3.5c1 .3 4.2.7 3.7 2.8z"
        fill="white"
      />
    </svg>
  );
}

function EthIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="white" fillOpacity="0.6" />
      <path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="white" />
      <path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="white" fillOpacity="0.6" />
      <path d="M16.5 28v-6.1L9 17.6l7.5 10.4z" fill="white" />
      <path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="white" fillOpacity="0.2" />
      <path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

function XrpIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#23292F" />
      <path
        d="M23.1 8h2.4l-5.7 5.6c-2.1 2.1-5.5 2.1-7.6 0L6.5 8h2.4l4.5 4.4c1.3 1.3 3.4 1.3 4.7 0L23.1 8zM8.9 24H6.5l5.7-5.6c2.1-2.1 5.5-2.1 7.6 0l5.7 5.6h-2.4l-4.5-4.4c-1.3-1.3-3.4-1.3-4.7 0L8.9 24z"
        fill="white"
      />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ size: number }>> = {
  BTC: BtcIcon,
  ETH: EthIcon,
  XRP: XrpIcon,
};

function parseSymbol(symbol: string): string {
  // "KRW-BTC" → "BTC", "BTCUSDT" → "BTC", "ETHUSDT" → "ETH"
  if (symbol.includes('-')) {
    return symbol.split('-').pop()!;
  }
  for (const quote of ['USDT', 'BUSD', 'USD', 'USDC']) {
    if (symbol.endsWith(quote)) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

export function CoinIcon({ symbol, size = 20, className }: CoinIconProps) {
  const base = parseSymbol(symbol).toUpperCase();
  const Icon = ICON_MAP[base];

  if (!Icon) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#6b7280',
          color: 'white',
          fontSize: size * 0.45,
          fontWeight: 700,
        }}
      >
        {base.charAt(0)}
      </span>
    );
  }

  return (
    <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <Icon size={size} />
    </span>
  );
}
