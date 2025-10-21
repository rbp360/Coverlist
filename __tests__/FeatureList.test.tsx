import { render, screen } from '@testing-library/react';
import FeatureList from '../components/FeatureList';

describe('FeatureList', () => {
  it('renders list items', () => {
    render(<FeatureList items={['One', 'Two']} />);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });
});
