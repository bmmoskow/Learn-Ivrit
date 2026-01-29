import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
<<<<<<< HEAD
import { MemoryRouter } from 'react-router-dom';
=======
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
import SettingsUI from './SettingsUI';
import type { User } from '@supabase/supabase-js';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

<<<<<<< HEAD
const renderSettingsUI = (props: Partial<React.ComponentProps<typeof SettingsUI>> = {}) => {
  const defaultProps = {
    user: mockUser,
    isDeleting: false,
    showDeleteDialog: false,
    setShowDeleteDialog: vi.fn(),
    deleteConfirmation: '',
    setDeleteConfirmation: vi.fn(),
    handleDeleteAccount: vi.fn(),
    showFAQDialog: false,
    setShowFAQDialog: vi.fn(),
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
    renderSettingsUI();
=======
describe('SettingsUI', () => {
  it('renders account information', () => {
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('email input is disabled', () => {
<<<<<<< HEAD
    renderSettingsUI();
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const emailInput = screen.getByDisplayValue('test@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('renders help and support section', () => {
<<<<<<< HEAD
    renderSettingsUI();
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText('Help & Support')).toBeInTheDocument();
    expect(screen.getByText('support@yourapp.com')).toBeInTheDocument();
  });

  it('renders danger zone with delete account button', () => {
<<<<<<< HEAD
    renderSettingsUI();

    expect(screen.getByText('To Delete Your Account')).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );

    expect(screen.getByText('To Delete Your Account')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
    expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
  });

  it('lists what will be deleted', () => {
<<<<<<< HEAD
    renderSettingsUI();
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText(/All vocabulary words and definitions/i)).toBeInTheDocument();
    expect(screen.getByText(/Test history and statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress tracking and confidence scores/i)).toBeInTheDocument();
    expect(screen.getByText(/All bookmarks and folders/i)).toBeInTheDocument();
    expect(screen.getByText(/Your profile and account information/i)).toBeInTheDocument();
  });

  it('opens delete dialog when delete button is clicked', async () => {
    const setShowDeleteDialog = vi.fn();
    const user = userEvent.setup();

<<<<<<< HEAD
    renderSettingsUI({ setShowDeleteDialog });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={setShowDeleteDialog}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    await user.click(deleteButton);

    expect(setShowDeleteDialog).toHaveBeenCalledWith(true);
  });

  it('delete button is disabled when isDeleting is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ isDeleting: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={true}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    expect(deleteButton).toBeDisabled();
  });

  it('shows confirmation dialog when showDeleteDialog is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone. This will permanently delete your account/i)
    ).toBeInTheDocument();
  });

  it('confirmation dialog has input field requiring DELETE to be typed', () => {
<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText(/Type/i)).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
  });

  it('updates delete confirmation when typing in input', async () => {
    const setDeleteConfirmation = vi.fn();
    const user = userEvent.setup();

<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true, setDeleteConfirmation });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={setDeleteConfirmation}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const input = screen.getByPlaceholderText('DELETE');
    await user.type(input, 'D');

    expect(setDeleteConfirmation).toHaveBeenCalledWith('D');
  });

  it('delete confirmation button is disabled when confirmation text is not DELETE', () => {
<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'delete' });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation="delete"
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const confirmButton = screen.getByRole('button', { name: /Delete Account/i });
    expect(confirmButton).toBeDisabled();
  });

  it('delete confirmation button is enabled when confirmation text is DELETE', () => {
<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'DELETE' });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation="DELETE"
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const confirmButton = screen.getByRole('button', { name: /Delete Account/i });
    expect(confirmButton).not.toBeDisabled();
  });

  it('delete confirmation button is disabled when isDeleting is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true, deleteConfirmation: 'DELETE' });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={true}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation="DELETE"
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const confirmButton = screen.getByRole('button', { name: /Deleting.../i });
    expect(confirmButton).toBeDisabled();
  });

  it('shows Deleting... text when isDeleting is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true, deleteConfirmation: 'DELETE' });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={true}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation="DELETE"
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('calls handleDeleteAccount when confirmation button is clicked', async () => {
    const handleDeleteAccount = vi.fn();
    const user = userEvent.setup();

<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'DELETE', handleDeleteAccount });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation="DELETE"
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={handleDeleteAccount}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const confirmButton = screen.getByRole('button', { name: /Delete Account/i });
    await user.click(confirmButton);

    expect(handleDeleteAccount).toHaveBeenCalled();
  });

  it('has cancel button in confirmation dialog', () => {
<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('clears confirmation text when cancel button is clicked', async () => {
    const setDeleteConfirmation = vi.fn();
    const user = userEvent.setup();

<<<<<<< HEAD
    renderSettingsUI({ showDeleteDialog: true, deleteConfirmation: 'DELETE', setDeleteConfirmation });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation="DELETE"
        setDeleteConfirmation={setDeleteConfirmation}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(setDeleteConfirmation).toHaveBeenCalledWith('');
  });

  it('cancel button is disabled when isDeleting is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={true}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  it('confirmation input is disabled when isDeleting is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ isDeleting: true, showDeleteDialog: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={true}
        showDeleteDialog={true}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const input = screen.getByPlaceholderText('DELETE');
    expect(input).toBeDisabled();
  });

  it('renders View FAQ button', () => {
<<<<<<< HEAD
    renderSettingsUI();
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByRole('button', { name: /View FAQ/i })).toBeInTheDocument();
  });

  it('opens FAQ dialog when View FAQ button is clicked', async () => {
    const setShowFAQDialog = vi.fn();
    const user = userEvent.setup();

<<<<<<< HEAD
    renderSettingsUI({ setShowFAQDialog });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={false}
        setShowFAQDialog={setShowFAQDialog}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    const faqButton = screen.getByRole('button', { name: /View FAQ/i });
    await user.click(faqButton);

    expect(setShowFAQDialog).toHaveBeenCalledWith(true);
  });

  it('renders FAQ dialog when showFAQDialog is true', () => {
<<<<<<< HEAD
    renderSettingsUI({ showFAQDialog: true });
=======
    render(
      <SettingsUI
        user={mockUser}
        isDeleting={false}
        showDeleteDialog={false}
        setShowDeleteDialog={vi.fn()}
        deleteConfirmation=""
        setDeleteConfirmation={vi.fn()}
        handleDeleteAccount={vi.fn()}
        showFAQDialog={true}
        setShowFAQDialog={vi.fn()}
      />
    );
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });
});
