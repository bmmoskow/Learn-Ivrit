import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import Contact from './Contact';
import * as AuthContext from '@/contexts/AuthContext/AuthContext';

const mockGetSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

vi.mock('@/contexts/AuthContext/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('Contact', () => {
  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const renderContact = () => {
    return render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser as User,
      isGuest: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInAsGuest: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
    });
  });

  it('renders contact form with all fields', () => {
    renderContact();

    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('displays description text', () => {
    renderContact();

    expect(
      screen.getByText(/have a bug to report, feature to suggest, or question to ask/i)
    ).toBeInTheDocument();
  });

  it('requires all fields to be filled', () => {
    renderContact();

    expect(screen.getByLabelText(/name/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/^message$/i)).toHaveAttribute('required');
  });

  it('email field has email type', () => {
    renderContact();

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('has submit button', () => {
    renderContact();

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('renders message type select field', () => {
    renderContact();

    expect(screen.getByLabelText(/message type/i)).toBeInTheDocument();
  });

  it('textarea has proper rows attribute', () => {
    renderContact();

    const messageTextarea = screen.getByLabelText(/^message$/i);
    expect(messageTextarea).toHaveAttribute('rows', '6');
  });

  it('displays proper placeholders', () => {
    renderContact();

    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tell us more...')).toBeInTheDocument();
  });

  it('submits form successfully via edge function', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    renderContact();

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByLabelText(/message type/i));
    await user.click(screen.getByRole('option', { name: /bug report/i }));
    await user.type(screen.getByLabelText(/^message$/i), 'Test message');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/send-contact-email'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
          body: expect.stringContaining('John Doe'),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Message Sent',
        description: 'Thank you for your feedback! We will review it shortly.',
      });
    });
  });

  it('shows error when form submission fails', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Server error' }),
    });
    global.fetch = mockFetch;

    renderContact();

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByLabelText(/message type/i));
    await user.click(screen.getByRole('option', { name: /bug report/i }));
    await user.type(screen.getByLabelText(/^message$/i), 'Test message');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Submission Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    });
  });

  it('validates email format using browser validation', async () => {
    renderContact();

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
  });

  it('validates all fields are required', () => {
    renderContact();

    expect(screen.getByLabelText(/name/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/^message$/i)).toHaveAttribute('required');
  });

  it('disables form inputs while submitting', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );
    global.fetch = mockFetch;

    renderContact();

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByLabelText(/message type/i));
    await user.click(screen.getByRole('option', { name: /bug report/i }));
    await user.type(screen.getByLabelText(/^message$/i), 'Test message');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    expect(screen.getByLabelText(/name/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/^message$/i)).toBeDisabled();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it('clears form fields after successful submission', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    renderContact();

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const messageInput = screen.getByLabelText(/^message$/i) as HTMLTextAreaElement;

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.click(screen.getByLabelText(/message type/i));
    await user.click(screen.getByRole('option', { name: /bug report/i }));
    await user.type(messageInput, 'Test message');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
      expect(messageInput.value).toBe('');
    });
  });
});
