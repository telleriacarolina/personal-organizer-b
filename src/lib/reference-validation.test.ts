import { validateWidgetReference } from '@/lib/reference-validation';

describe('validateWidgetReference', () => {
  const widgets = [{ id: 'tasks-a' }, { id: 'tasks-b' }];

  it('distinguishes unlinked, valid, and missing widget references', () => {
    expect(validateWidgetReference(null, widgets)).toEqual({ state: 'unlinked', targetId: null });
    expect(validateWidgetReference('tasks-a', widgets)).toEqual({
      state: 'valid',
      targetId: 'tasks-a',
      target: { id: 'tasks-a' },
    });
    expect(validateWidgetReference('missing', widgets)).toEqual({
      state: 'missing-widget',
      targetId: 'missing',
    });
  });

  it('supports explicit reassignment after deletion without silent retargeting', () => {
    const missing = validateWidgetReference('tasks-a', [{ id: 'tasks-b' }]);
    const reassigned = validateWidgetReference('tasks-b', [{ id: 'tasks-b' }]);

    expect(missing.state).toBe('missing-widget');
    expect(reassigned).toEqual({
      state: 'valid',
      targetId: 'tasks-b',
      target: { id: 'tasks-b' },
    });
  });
});
