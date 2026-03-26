interface ExchangeIconProps {
  exchange: string;
  size?: number;
  className?: string;
}

function UpbitIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#093687" />
      <path d="M16 7l7 12H9l7-12z" fill="white" />
      <circle cx="16" cy="22" r="3" fill="white" />
    </svg>
  );
}

function BinanceIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path
        d="M16 8.4l2 2-5.6 5.6-2-2L16 8.4zm-5.6 5.6l2-2 2 2-2 2-2-2zm5.6 5.6l-2-2 5.6-5.6 2 2L16 19.6zm5.6-5.6l-2 2-2-2 2-2 2 2zM16 12.4l3.6 3.6L16 19.6l-3.6-3.6L16 12.4z"
        fill="white"
      />
    </svg>
  );
}

function BybitIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7A600" />
      <path
        d="M8 11h5.5c1.9 0 3.2 1 3.2 2.7 0 1.1-.6 1.9-1.5 2.3 1.2.3 2 1.3 2 2.6 0 1.8-1.4 2.9-3.4 2.9H8V11zm5.2 4.2c.8 0 1.3-.5 1.3-1.1 0-.7-.5-1.1-1.3-1.1h-3v2.2h3zm.3 4.3c.9 0 1.4-.5 1.4-1.2s-.5-1.2-1.4-1.2h-3.3v2.4h3.3zM19 19.1l1.8-3.1-1.7-3h2.2l.8 1.6.8-1.6H25l-1.7 3 1.8 3.1h-2.2l-.9-1.7-.9 1.7H19z"
        fill="white"
      />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ size: number }>> = {
  upbit: UpbitIcon,
  binance: BinanceIcon,
  bybit: BybitIcon,
};

export function ExchangeIcon({ exchange, size = 20, className }: ExchangeIconProps) {
  const Icon = ICON_MAP[exchange.toLowerCase()];

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
        {exchange.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <Icon size={size} />
    </span>
  );
}
