import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';

describe('App global lock render regression', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('toggles global lock once without hitting maximum update depth and reflects updated state', async () => {
    window.localStorage.clear();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    fireEvent.click(screen.getByTitle('Lock all widgets'));

    await waitFor(() => {
      expect(screen.getByTitle('Unlock all widgets')).toBeInTheDocument();
    });

    const maximumDepthErrors = consoleErrorSpy.mock.calls.filter(([firstArg]) =>
      typeof firstArg === 'string' && firstArg.includes('Maximum update depth exceeded')
    );

    expect(maximumDepthErrors).toHaveLength(0);
  });
});
