import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ToggleSwitch } from './toggle-switch';

const meta: Meta<typeof ToggleSwitch> = {
  title: 'UI/ToggleSwitch',
  component: ToggleSwitch,
};

export default meta;
type Story = StoryObj<typeof ToggleSwitch>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return <ToggleSwitch checked={checked} onChange={setChecked} label="Enable" />;
  },
};

export const Small: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <ToggleSwitch checked={checked} onChange={setChecked} label="Active" size="sm" />;
  },
};
