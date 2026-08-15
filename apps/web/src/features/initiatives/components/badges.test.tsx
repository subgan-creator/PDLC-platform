import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge, PhaseBadge } from './badges';

describe('HealthBadge', () => {
  it('renders a text label, not just a color, for every health status', () => {
    const { rerender } = render(<HealthBadge health="GREEN" />);
    expect(screen.getByText('On track')).toBeInTheDocument();

    rerender(<HealthBadge health="AMBER" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();

    rerender(<HealthBadge health="RED" />);
    expect(screen.getByText('Off track')).toBeInTheDocument();
  });
});

describe('PhaseBadge', () => {
  it('renders the human-readable phase label', () => {
    render(<PhaseBadge phase="DISCOVERY" />);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
  });
});
