export type ReferenceValidationState =
  | 'unlinked'
  | 'valid'
  | 'missing-widget'
  | 'missing-item'
  | 'unavailable-target';

export type ReferenceValidationResult<TTarget> =
  | { state: 'unlinked'; targetId: null }
  | { state: 'valid'; targetId: string; target: TTarget }
  | { state: 'missing-widget'; targetId: string }
  | { state: 'missing-item'; targetId: string }
  | { state: 'unavailable-target'; targetId: string; target?: TTarget };

interface ValidateReferenceOptions<TTarget> {
  targetId?: string | null;
  targets: readonly TTarget[];
  getId: (target: TTarget) => string;
  missingState: Extract<ReferenceValidationState, 'missing-widget' | 'missing-item'>;
  isUnavailable?: (target: TTarget) => boolean;
}

export function validateReference<TTarget>({
  targetId,
  targets,
  getId,
  missingState,
  isUnavailable,
}: ValidateReferenceOptions<TTarget>): ReferenceValidationResult<TTarget> {
  if (!targetId) {
    return { state: 'unlinked', targetId: null };
  }

  const target = targets.find((candidate) => getId(candidate) === targetId);
  if (!target) {
    return { state: missingState, targetId };
  }

  if (isUnavailable?.(target)) {
    return { state: 'unavailable-target', targetId, target };
  }

  return { state: 'valid', targetId, target };
}

export function validateWidgetReference<TTarget extends { id: string }>(
  targetId: string | null | undefined,
  targets: readonly TTarget[],
  isUnavailable?: (target: TTarget) => boolean,
) {
  return validateReference({
    targetId,
    targets,
    getId: (target) => target.id,
    missingState: 'missing-widget',
    isUnavailable,
  });
}

export function validateItemReference<TTarget extends { id: string }>(
  targetId: string | null | undefined,
  targets: readonly TTarget[],
  isUnavailable?: (target: TTarget) => boolean,
) {
  return validateReference({
    targetId,
    targets,
    getId: (target) => target.id,
    missingState: 'missing-item',
    isUnavailable,
  });
}
