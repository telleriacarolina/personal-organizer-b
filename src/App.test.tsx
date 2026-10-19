// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

describe('App global lock sync', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('toggles the global lock without entering a repeated update cycle', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<App />);

    const lockButton = screen.getByTitle('Lock all widgets');
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByTitle('Unlock all widgets')).toBeInTheDocument();
    });

    expect(window.localStorage.getItem('organizer-global-lock')).toBe('true');
    expect(consoleErrorSpy.mock.calls.flat().join(' ')).not.toContain('Maximum update depth exceeded');

    consoleErrorSpy.mockRestore();
  });
});
