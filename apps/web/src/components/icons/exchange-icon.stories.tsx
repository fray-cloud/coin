import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExchangeIcon } from './exchange-icon';

const meta: Meta<typeof ExchangeIcon> = {
  title: 'Icons/ExchangeIcon',
  component: ExchangeIcon,
  argTypes: {
    exchange: { control: 'select', options: ['upbit', 'binance', 'bybit'] },
    size: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof ExchangeIcon>;

export const Upbit: Story = { args: { exchange: 'upbit', size: 32 } };
export const Binance: Story = { args: { exchange: 'binance', size: 32 } };
export const Bybit: Story = { args: { exchange: 'bybit', size: 32 } };

export const AllExchanges: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <ExchangeIcon exchange="upbit" size={32} />
      <ExchangeIcon exchange="binance" size={32} />
      <ExchangeIcon exchange="bybit" size={32} />
      <ExchangeIcon exchange="unknown" size={32} />
    </div>
  ),
};
