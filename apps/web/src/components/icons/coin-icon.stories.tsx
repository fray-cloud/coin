import type { Meta, StoryObj } from '@storybook/react-vite';
import { CoinIcon } from './coin-icon';

const meta: Meta<typeof CoinIcon> = {
  title: 'Icons/CoinIcon',
  component: CoinIcon,
  argTypes: {
    symbol: { control: 'text' },
    size: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof CoinIcon>;

export const BTC: Story = { args: { symbol: 'BTC', size: 32 } };
export const ETH: Story = { args: { symbol: 'ETH', size: 32 } };
export const XRP: Story = { args: { symbol: 'XRP', size: 32 } };
export const SOL: Story = { args: { symbol: 'SOL', size: 32 } };
export const DOGE: Story = { args: { symbol: 'DOGE', size: 32 } };
export const Unknown: Story = { args: { symbol: 'ZZZZZ', size: 32 } };

export const AllCoins: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <CoinIcon symbol="BTC" size={32} />
      <CoinIcon symbol="ETH" size={32} />
      <CoinIcon symbol="XRP" size={32} />
      <CoinIcon symbol="SOL" size={32} />
      <CoinIcon symbol="DOGE" size={32} />
      <CoinIcon symbol="ADA" size={32} />
      <CoinIcon symbol="BTCUSDT" size={32} />
      <CoinIcon symbol="KRW-ETH" size={32} />
    </div>
  ),
};
