import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Settings from './Settings';
import type { User } from '@supabase/supabase-js';

vi.mock('../components/Settings/SettingsUI', () => ({
  default: vi.fn(({ user }) => (
    <div data-testid="settings-ui">
      {user && <div data-testid="user-email">{user.email}</div>}
    </div>
  )),
}));

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

vi.mock('../components/Settings/useSettings', () => ({
  useSettings: vi.fn(),
}));

const getByTestId = (container: HTMLElement, testId: string): HTMLElement | null => {
  return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
};

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SettingsUI when user is authenticated', async () => {
    const { useSettings } = await import('../components/Settings/useSettings');
    vi.mocked(useSettings).mockReturnValue({
      user: mockUser,
      isDeleting: false,
      showDeleteDialog: false,
      setShowDeleteDialog: vi.fn(),
      deleteConfirmation: '',
      setDeleteConfirmation: vi.fn(),
      handleDeleteAccount: vi.fn(),
    });

    const { container } = render(<Settings />);

    expect(getByTestId(container, 'settings-ui')).toBeInTheDocument();
    expect(getByTestId(container, 'user-email')).toHaveTextContent('test@example.com');
  });

  it('renders nothing when user is not authenticated', async () => {
    const { useSettings } = await import('../components/Settings/useSettings');
    vi.mocked(useSettings).mockReturnValue({
      user: null,
      isDeleting: false,
      showDeleteDialog: false,
      setShowDeleteDialog: vi.fn(),
      deleteConfirmation: '',
      setDeleteConfirmation: vi.fn(),
      handleDeleteAccount: vi.fn(),
    });

    const { container } = render(<Settings />);

    expect(container.firstChild).toBeNull();
  });

  it('passes all hook values to SettingsUI', async () => {
    const mockSettings = {
      user: mockUser,
      isDeleting: true,
      showDeleteDialog: true,
      setShowDeleteDialog: vi.fn(),
      deleteConfirmation: 'DELETE',
      setDeleteConfirmation: vi.fn(),
      handleDeleteAccount: vi.fn(),
    };

    const { useSettings } = await import('../components/Settings/useSettings');
    vi.mocked(useSettings).mockReturnValue(mockSettings);

    const { default: SettingsUI } = await import('../components/Settings/SettingsUI');

    render(<Settings />);

    expect(SettingsUI).toHaveBeenCalledWith(
      expect.objectContaining({
        user: mockUser,
        isDeleting: true,
        showDeleteDialog: true,
        deleteConfirmation: 'DELETE',
      }),
      {}
    );
  });
});
