import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable, type Column } from './data-table';

interface SampleRow {
  id: string;
  name: string;
  price: number;
  change: number;
}

const columns: Column<SampleRow>[] = [
  { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    render: (row) => `$${row.price.toLocaleString()}`,
  },
  {
    key: 'change',
    header: 'Change',
    align: 'right',
    render: (row) => (
      <span className={row.change >= 0 ? 'text-green-500' : 'text-red-500'}>
        {row.change >= 0 ? '+' : ''}
        {row.change.toFixed(2)}%
      </span>
    ),
  },
];

const sampleData: SampleRow[] = [
  { id: '1', name: 'Bitcoin', price: 95000, change: 2.5 },
  { id: '2', name: 'Ethereum', price: 3400, change: -1.2 },
  { id: '3', name: 'XRP', price: 2.1, change: 0.8 },
];

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const Default: Story = {
  render: () => <DataTable columns={columns} data={sampleData} rowKey={(row) => row.id} />,
};

export const Empty: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={[]}
      rowKey={(row: SampleRow) => row.id}
      emptyMessage="No data available"
    />
  ),
};

export const Clickable: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={sampleData}
      rowKey={(row) => row.id}
      onRowClick={(row) => alert(`Clicked: ${row.name}`)}
    />
  ),
};
