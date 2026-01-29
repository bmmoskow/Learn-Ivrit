import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from './useSettings';
import { supabase } from '../../../supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

vi.mock('../../../supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    } as User,
    signOut: vi.fn(),
  }),
}));

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.user).toBeDefined();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.showDeleteDialog).toBe(false);
    expect(result.current.deleteConfirmation).toBe('');
    expect(result.current.showFAQDialog).toBe(false);
  });

  it('can toggle delete dialog', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setShowDeleteDialog(true);
    });

    expect(result.current.showDeleteDialog).toBe(true);

    act(() => {
      result.current.setShowDeleteDialog(false);
    });

    expect(result.current.showDeleteDialog).toBe(false);
  });

  it('can update delete confirmation text', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    expect(result.current.deleteConfirmation).toBe('DELETE');
  });

  it('shows error when confirmation text is not DELETE', async () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('delete');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    expect(toast.error).toHaveBeenCalledWith('Please type DELETE to confirm');
    expect(result.current.isDeleting).toBe(false);
  });

  it('does not call supabase.rpc when confirmation text is not DELETE', async () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('wrong');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('successfully deletes account when confirmation is correct', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: true },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account');
      expect(toast.success).toHaveBeenCalledWith('Account deleted successfully');
    });
  });

  it('sets isDeleting to true during deletion', async () => {
    vi.mocked(supabase.rpc).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: { success: true },
              error: null,
              count: null,
              status: 200,
              statusText: 'OK',
            } as never);
          }, 100);
        }) as never
    );

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(result.current.isDeleting).toBe(true);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('handles RPC error during deletion', async () => {
    const error = new Error('Database error');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
      count: null,
      status: 500,
      statusText: 'Internal Server Error',
    } as never);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Database error');
      expect(result.current.isDeleting).toBe(false);
    });
  });

  it('handles failed deletion result', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: false, error: 'User not found' },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('User not found');
      expect(result.current.isDeleting).toBe(false);
    });
  });

  it('handles failed deletion with generic error message', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: false },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete account');
      expect(result.current.isDeleting).toBe(false);
    });
  });

  it('handles unknown error during deletion', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue('Unknown error');

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete account');
      expect(result.current.isDeleting).toBe(false);
    });
  });

  it('resets isDeleting state on error', async () => {
    const error = new Error('Test error');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error,
      count: null,
      status: 500,
      statusText: 'Internal Server Error',
    } as never);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDeleteConfirmation('DELETE');
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });
  });

  it('can toggle FAQ dialog', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setShowFAQDialog(true);
    });

    expect(result.current.showFAQDialog).toBe(true);

    act(() => {
      result.current.setShowFAQDialog(false);
    });

    expect(result.current.showFAQDialog).toBe(false);
  });
});
