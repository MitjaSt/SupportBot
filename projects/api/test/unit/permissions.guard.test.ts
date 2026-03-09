/**
 * Unit tests for PermissionsGuard.
 *
 * Isolated from JWT concerns — tests pure permission-check logic only.
 */

import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { PERMISSIONS_KEY } from '@/modules/auth/auth.constants';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

function makeContext(user: AuthUser | null, requiredPerms: string[]): ExecutionContext {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(requiredPerms) };
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

// Confirm the guard reads from the correct metadata key
it('reads permissions metadata using PERMISSIONS_KEY', () => {
  const reflector = new Reflector();
  const spy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
  const guard = new PermissionsGuard(reflector);
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1', permissions: [] } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  guard.canActivate(ctx);
  expect(spy).toHaveBeenCalledWith(PERMISSIONS_KEY, [expect.anything(), expect.anything()]);
});

describe('PermissionsGuard.canActivate()', () => {
  it('allows access when user has the required permission', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(guard.canActivate(makeContext({ sub: 'u1', permissions: ['analytics:read'] }, ['analytics:read']))).toBe(true);
  });

  it('allows access when user has all required permissions', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(
      guard.canActivate(
        makeContext({ sub: 'u1', permissions: ['analytics:read', 'pipeline:write'] }, ['analytics:read', 'pipeline:write']),
      ),
    ).toBe(true);
  });

  it('allows access when no permissions are required on the route', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(guard.canActivate(makeContext({ sub: 'u1', permissions: [] }, []))).toBe(true);
  });

  it('throws ForbiddenException when the required permission is absent', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(() =>
      guard.canActivate(makeContext({ sub: 'u1', permissions: ['pipeline:write'] }, ['analytics:read'])),
    ).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no permissions at all', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(() => guard.canActivate(makeContext({ sub: 'u1', permissions: [] }, ['analytics:read']))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when req.user is null', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(() => guard.canActivate(makeContext(null, ['analytics:read']))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when only some required permissions are present', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(() =>
      guard.canActivate(
        makeContext({ sub: 'u1', permissions: ['analytics:read'] }, ['analytics:read', 'pipeline:write']),
      ),
    ).toThrow(ForbiddenException);
  });
});
