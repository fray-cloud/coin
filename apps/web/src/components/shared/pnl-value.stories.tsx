import type { Meta, StoryObj } from '@storybook/react-vite';
import { PnlValue } from './pnl-value';

const meta: Meta<typeof PnlValue> = {
  title: 'Shared/PnlValue',
  component: PnlValue,
  argTypes: {
    value: { control: 'number' },
    prefix: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof PnlValue>;

export const Positive: Story = { args: { value: 1500000 } };
export const Negative: Story = { args: { value: -320000 } };
export const Zero: Story = { args: { value: 0 } };
export const Large: Story = { args: { value: 15000000 } };
export const WithPrefix: Story = { args: { value: 250000, prefix: '₩' } };
