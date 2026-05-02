export const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  placed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  filled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const SIGNAL_STYLES: Record<string, string> = {
  buy: 'text-green-600 dark:text-green-400 font-medium',
  sell: 'text-red-600 dark:text-red-400 font-medium',
};

export const EXCHANGES = [{ value: 'binance', label: 'Binance' }];
