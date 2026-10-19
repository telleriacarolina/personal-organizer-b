// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';

describe('App global lock regression', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const originalConsoleError = console.error;

  beforeEach(() => {
    window.localStorage.clear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      originalConsoleError(...args);
    });
  });

  afterEach(() => {
    errorSpy.mockRestore();
    window.localStorage.clear();
  });

  it('toggles global lock without hitting a maximum update depth loop', async () => {
    render(<App />);

    fireEvent.click(screen.getByTitle('Lock all widgets'));

    await waitFor(() => {
      expect(screen.getByTitle('Unlock all widgets')).toBeInTheDocument();
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    expect(
      errorSpy.mock.calls.some((call) =>
        call.some((arg) => String(arg).includes('Maximum update depth exceeded'))
      )
    ).toBe(false);
  });
});
