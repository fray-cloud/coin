import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'success',
        'warning',
        'error',
        'info',
        'purple',
        'orange',
        'cyan',
        'muted',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'Default' } };
export const Success: Story = { args: { children: 'filled', variant: 'success' } };
export const Warning: Story = { args: { children: 'pending', variant: 'warning' } };
export const Error: Story = { args: { children: 'failed', variant: 'error' } };
export const Info: Story = { args: { children: 'RSI', variant: 'info' } };
export const Purple: Story = { args: { children: 'MACD', variant: 'purple' } };
export const Orange: Story = { args: { children: 'Bollinger', variant: 'orange' } };

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge>default</Badge>
      <Badge variant="success">filled</Badge>
      <Badge variant="warning">pending</Badge>
      <Badge variant="error">failed</Badge>
      <Badge variant="info">RSI</Badge>
      <Badge variant="purple">MACD</Badge>
      <Badge variant="orange">Bollinger</Badge>
      <Badge variant="cyan">partial</Badge>
      <Badge variant="muted">cancelled</Badge>
    </div>
  ),
};
