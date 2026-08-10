import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from './Table';

interface Row {
  id: string;
  title: string;
}

describe('Table', () => {
  const rows: Row[] = [
    { id: '1', title: 'Reduce checkout drop-off' },
    { id: '2', title: 'Improve onboarding' },
  ];

  it('renders a real table with a caption for screen reader context', () => {
    render(
      <Table
        caption="Initiatives"
        rows={rows}
        getRowId={(row) => row.id}
        columns={[{ key: 'title', header: 'Title', render: (row) => row.title }]}
      />,
    );
    expect(screen.getByRole('table', { name: 'Initiatives' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 rows
  });

  it('exposes sort controls as keyboard-operable buttons with aria-sort', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      <Table
        caption="Initiatives"
        rows={rows}
        getRowId={(row) => row.id}
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (row) => row.title,
            onSort,
            sortDirection: null,
          },
        ]}
      />,
    );
    const sortButton = screen.getByRole('button', { name: 'Title' });
    expect(sortButton).toHaveAttribute('aria-sort', 'none');
    await user.click(sortButton);
    expect(onSort).toHaveBeenCalledOnce();
  });

  it('shows an empty-state message when there are no rows', () => {
    render(
      <Table
        caption="Initiatives"
        rows={[]}
        getRowId={(row: Row) => row.id}
        columns={[{ key: 'title', header: 'Title', render: (row: Row) => row.title }]}
      />,
    );
    expect(screen.getByText('No records.')).toBeInTheDocument();
  });
});
