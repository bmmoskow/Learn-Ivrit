import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsUI from './SettingsUI';
import type { User } from '@supabase/supabase-js';
import { APP_CONFIG } from '@/config/app';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

const getByText = (container: HTMLElement, text: string | RegExp): HTMLElement | null => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;
    const content = node.textContent || '';
    if (text instanceof RegExp ? text.test(content) : content.includes(text)) {
      return parent;
    }
  }
  return null;
};

const getByRole = (container: HTMLElement, role: string, options?: { name?: RegExp }): HTMLElement | null => {
  const selector = role === 'link' ? 'a' : role === 'button' ? 'button' : `[role="${role}"]`;
  const elements = container.querySelectorAll(selector);
  if (!options?.name) return elements[0] as HTMLElement || null;
  for (const el of elements) {
    const text = el.textContent || el.getAttribute('aria-label') || '';
    if (options.name.test(text)) return el as HTMLElement;
  }
  return null;
};

const getByDisplayValue = (container: HTMLElement, value: string): HTMLInputElement | null => {
  const inputs = container.querySelectorAll('input');
  for (const input of inputs) {
    if (input.value === value) return input;
  }
  return null;
};

const getByPlaceholderText = (container: HTMLElement, placeholder: string): HTMLInputElement | null => {
  return container.querySelector(`input[placeholder="${placeholder}"]`) as HTMLInputElement;
};

const renderSettingsUI = (props: Partial<React.ComponentProps<typeof SettingsUI>> = {}) => {
  const defaultProps = {
    user: mockUser,
    isDeleting: false,
    showDeleteDialog: false,
    setShowDeleteDialog: vi.fn(),
    deleteConfirmation: '',
    setDeleteConfirmation: vi.fn(),
    handleDeleteAccount: vi.fn(),
    ...props,
  };

  return render(
    <MemoryRouter>
      <SettingsUI {...defaultProps} />
    </MemoryRouter>
  );
};

describe('SettingsUI', () => {
  it('renders account information', () => {
    const { container } = renderSettingsUI();

    expect(getByText(container, 'Account Settings')).toBeInTheDocument();
    expect(getByText(container, 'Account Information')).toBeInTheDocument();
    expect(getByDisplayValue(container, 'test@example.com')).toBeInTheDocument();
  });

  it('email input is disabled', () => {
    const { container } = renderSettingsUI();

    const emailInput = getByDisplayValue(container, 'test@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('renders help and support section', () => {
    const { container } = renderSettingsUI();

    expect(getByText(container, 'Help & Support')).toBeInTheDocument();
    expect(getByText(container, APP_CONFIG.supportEmail)).toBeInTheDocument();
  });

  it('renders danger zone with delete account button', () => {
    const { container } = renderSettingsUI();

    expect(getByText(container, 'To Delete Your Account')).toBeInTheDocument();
    expect(getByText(container, /This action cannot be undone/i)).toBeInTheDocument();
    expect(getByRole(container, 'button', { name: /Delete Account/i })).toBeInTheDocument();
  });

  it('lists what will be deleted', () => {
    const { container } = renderSettingsUI();

    expect(getByText(container, /All vocabulary words and definitions/i)).toBeInTheDocument();
    expect(getByText(container, /Test history and statistics/i)).toBeInTheDocument();
    expect(getByText(container, /Progress tracking and confidence scores/i)).toBeInTheDocument();
    expect(getByText(container, /All bookmarks and folders/i)).toBeInTheDocument();
    expect(getByText(container, /Your profile and account information/i)).toBeInTheDocument();
  });

  it('opens delete dialog when delete button is clicked', async () => {
    const setShowDeleteDialog = vi.fn();
    const user = userEvent.setup();

    const { container } = renderSettingsUI({ setShowDeleteDialog });

    const deleteButton = getByRole(container, 'button', { name: /Delete Account/i });
    await user.click(deleteButton!);

    expect(setShowDeleteDialog).toHaveBeenCalledWith(true);
  });

  it('delete button is disabled when isDeleting is true', () => {
    const { container } = renderSettingsUI({ isDeleting: true });

    const deleteButton = getByRole(container, 'button', { name: /Delete Account/i });
    expect(deleteButton).toBeDisabled();
  });

  it('shows confirmation dialog when showDeleteDialog is true', () => {
    renderSettingsUI({ showDeleteDialog: true });

    expect(getByText(document.body, 'Are you absolutely sure?')).toBeInTheDocument();
    expect(
      getByText(document.body, /This action cannot be undone. This will permanently delete your account/i)
    ).toBeInTheDocument();
  });

  it('confirmation dialog has input field requiring DELETE to be typed', () => {
    renderSettingsUI({ showDeleteDialog: true });

    expect(getByText(document.body, /Type/i)).toBeInTheDocument();
    expect(getByText(document.body, 'DELETE')).toBeInTheDocument();
    expect(getByPlaceholderText(document.body, 'DELETE')).toBeInTheDocument();
  });

  it('updates delete confirmation when typing in input', async () => {
    const setDeleteConfirmation = vi.fn();
    const user = userEvent.setup();

    renderSettingsUI({ showDeleteDialog: true, setDeleteConfirmation });

    const input = getByPlaceholderText(document.body, 'DELETE');
    await user.type(input!, 'D');

    expect(setDeleteConfirmation).toHaveBeenCalledWith('D');
  });

  it('delete confirmation button is disabled when confirmation text is not DELETE', () => {
    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'delete' });

    const dialog = document.body.querySelector('[role="alertdialog"]');
    const confirmButton = getByRole(dialog as HTMLElement, 'button', { name: /Delete Account/i });
    expect(confirmButton).toBeDisabled();
  });

  it('delete confirmation button is enabled when confirmation text is DELETE', () => {
    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'DELETE' });

    const confirmButton = getByRole(document.body, 'button', { name: /Delete Account/i });
    expect(confirmButton).not.toBeDisabled();
  });

  it('delete confirmation button is disabled when isDeleting is true', () => {
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true, deleteConfirmation: 'DELETE' });

    const confirmButton = getByRole(document.body, 'button', { name: /Deleting.../i });
    expect(confirmButton).toBeDisabled();
  });

  it('shows Deleting... text when isDeleting is true', () => {
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true, deleteConfirmation: 'DELETE' });

    expect(getByText(document.body, 'Deleting...')).toBeInTheDocument();
  });

  it('calls handleDeleteAccount when confirmation button is clicked', async () => {
    const handleDeleteAccount = vi.fn();
    const user = userEvent.setup();

    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'DELETE', handleDeleteAccount });

    const dialog = document.body.querySelector('[role="alertdialog"]');
    const confirmButton = getByRole(dialog as HTMLElement, 'button', { name: /Delete Account/i });
    await user.click(confirmButton!);

    expect(handleDeleteAccount).toHaveBeenCalled();
  });

  it('has cancel button in confirmation dialog', () => {
    renderSettingsUI({ showDeleteDialog: true });

    expect(getByRole(document.body, 'button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('clears confirmation text when cancel button is clicked', async () => {
    const setDeleteConfirmation = vi.fn();
    const user = userEvent.setup();

    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'DELETE', setDeleteConfirmation });

    const cancelButton = getByRole(document.body, 'button', { name: /Cancel/i });
    await user.click(cancelButton!);

    expect(setDeleteConfirmation).toHaveBeenCalledWith('');
  });

  it('cancel button is disabled when isDeleting is true', () => {
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true });

    const cancelButton = getByRole(document.body, 'button', { name: /Cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  it('confirmation input is disabled when isDeleting is true', () => {
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true });

    const input = getByPlaceholderText(document.body, 'DELETE');
    expect(input).toBeDisabled();
  });

  it('renders View FAQ link', () => {
    const { container } = renderSettingsUI();

    expect(getByRole(container, 'link', { name: /View FAQ/i })).toBeInTheDocument();
  });

  it('renders FAQ link that navigates to /faq', () => {
    const { container } = renderSettingsUI({});

    const faqLink = container.querySelector('a[href="/faq"]');
    expect(faqLink).toBeInTheDocument();
    expect(faqLink).toHaveTextContent('View FAQ');
  });
});
