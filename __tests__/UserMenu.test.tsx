import { render, screen, waitFor } from '@testing-library/react';

import UserMenu from '../components/UserMenu';

const originalFetch = global.fetch;

describe('UserMenu', () => {
  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch as any;
  });

  it('shows Sign in link when unauthenticated', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    render(<UserMenu />);
    // It should render Sign in immediately without waiting
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
  });

  it('shows Profile button when authenticated', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { name: undefined, avatarUrl: undefined }, count: 0 }),
    });
    render(<UserMenu />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open user menu' })).toBeInTheDocument(),
    );
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders invites badge when count provided', () => {
    render(<UserMenu initialAuthed={true} initialUser={{}} initialPendingInvitesCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
