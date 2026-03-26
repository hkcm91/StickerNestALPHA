/**
 * LoginForm — Tests
 * @module shell/components/auth
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock auth functions
vi.mock('../../../kernel/auth/auth', () => ({
  signInWithEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
  signUp: vi.fn(),
}));

// Mock auth store
vi.mock('../../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  })),
}));

import { signInWithEmail, signInWithOAuth, signUp } from '../../../kernel/auth/auth';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      isLoading: false,
      error: null,
      clearError: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    render(<LoginForm />);
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('renders Sign In button by default', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });

  it('toggles to sign-up mode and shows Display Name field', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByText('Sign Up'));
    expect(screen.getByText('Create an account')).toBeTruthy();
    expect(screen.getByPlaceholderText('Display Name')).toBeTruthy();
  });

  it('calls signInWithEmail on form submit in sign-in mode', () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Email address').closest('form')!);
    expect(signInWithEmail).toHaveBeenCalledWith('test@example.com', 'secret123');
  });

  it('calls signUp on form submit in sign-up mode', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByText('Sign Up'));
    fireEvent.change(screen.getByPlaceholderText('Display Name'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Email address').closest('form')!);
    expect(signUp).toHaveBeenCalledWith('test@example.com', 'secret123', 'Test User');
  });

  it('calls signInWithOAuth when Google button is clicked', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByText('Continue with Google'));
    expect(signInWithOAuth).toHaveBeenCalledWith('google');
  });

  it('renders dev login buttons in sign-in mode', () => {
    render(<LoginForm />);
    expect(screen.getByText('Kimber (Admin)')).toBeTruthy();
    expect(screen.getByText('Alice (Dev)')).toBeTruthy();
    expect(screen.getByText('Bob (Dev)')).toBeTruthy();
  });

  it('disables buttons when loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isLoading: true,
      error: null,
      clearError: vi.fn(),
    });
    render(<LoginForm />);
    expect(screen.getByText('Processing...')).toBeTruthy();
  });

  it('displays error when present', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isLoading: false,
      error: 'Invalid credentials',
      clearError: vi.fn(),
    });
    render(<LoginForm />);
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });
});
