/**
 * Unit tests for JwtAuthGuard, JwtStrategy, and PermissionsGuard.
 *
 * Prerequisites: npm install @nestjs/passport passport passport-jwt jwks-rsa
 * (Milestone 1 packages). The tests will fail to import until those are installed.
 *
 * No live Zitadel needed — jwks-rsa is mocked; a real RSA keypair is generated
 * inline so JWT signing/verification uses actual crypto.
 */

import { generateKeyPairSync } from 'node:crypto';
import { describe, it, expect, vi, beforeAll } from 'vitest';

// ── JWKS mock (hoisted before any imports that trigger jwks-rsa) ──────────────
// publicKey is populated in beforeAll; the mock closure captures the variable.
let publicKeyPem: string;

// Mock passportJwtSecret as a named export. It's called during strategy construction
// and must return a secretOrKeyProvider function. When passport calls the provider
// during token verification it passes (request, rawJwtToken, done).
vi.mock('jwks-rsa', () => ({
  passportJwtSecret: vi.fn().mockReturnValue(
    (_request: unknown, _rawToken: string, done: (err: null, key: string) => void) => {
      done(null, publicKeyPem);
    },
  ),
}));

// ── Imports (after mock is set up) ────────────────────────────────────────────
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { OPTIONAL_AUTH_KEY, PERMISSIONS_KEY } from '@/modules/auth/auth.constants';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

// ── Helpers ───────────────────────────────────────────────────────────────────

let privateKeyPem: string;

/** Stub ConfigService — only the zitadel slice is read by JwtStrategy. */
const mockConfig = {
  zitadel: {
    jwksUri: 'https://zitadel.example.com/oauth/v2/keys',
    issuer: 'https://zitadel.example.com',
    audience: 'macular-society-api',
    enabled: true,
  },
};

/** Stub MetricsService — only the auth counters are used by JwtStrategy and JwtAuthGuard. */
const mockMetrics = {
  authJwtVerifiedTotal: { inc: vi.fn() },
  authJwksFetchTotal: { inc: vi.fn() },
};

function signToken(
  payload: Record<string, unknown>,
  options: jwt.SignOptions = {},
): string {
  return jwt.sign(
    {
      iss: mockConfig.zitadel.issuer,
      aud: mockConfig.zitadel.audience,
      sub: 'user-123',
      permissions: [],
      ...payload,
    },
    privateKeyPem,
    { algorithm: 'RS256', keyid: 'test-kid', expiresIn: '1h', ...options },
  );
}

/** Build a minimal ExecutionContext for guard tests. */
function makeContext(options: {
  authHeader?: string;
  handlerMetadata?: Record<string, unknown>;
}): ExecutionContext {
  const reflector = new Reflector();

  const get = vi.fn().mockImplementation((key: string) => {
    return options.handlerMetadata?.[key];
  });

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: options.authHeader
          ? { authorization: options.authHeader }
          : {},
        user: undefined as AuthUser | null | undefined,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    // Attach a reflector stub directly used by our guards
    __reflector: { get },
  } as unknown as ExecutionContext;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
});

// ── JwtStrategy.validate() ────────────────────────────────────────────────────

describe('JwtStrategy.validate()', () => {
  it('maps ZitadelJwtPayload to AuthUser', () => {
    const strategy = new JwtStrategy(mockConfig as never, mockMetrics as never);
    const result = strategy.validate({
      sub: 'user-abc',
      iss: mockConfig.zitadel.issuer,
      aud: [mockConfig.zitadel.audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      permissions: ['analytics:read', 'chunks:debug'],
    });
    expect(result).toEqual({ sub: 'user-abc', permissions: ['analytics:read', 'chunks:debug'] });
  });

  it('maps payload with no permissions to empty array', () => {
    const strategy = new JwtStrategy(mockConfig as never, mockMetrics as never);
    const result = strategy.validate({
      sub: 'user-xyz',
      iss: mockConfig.zitadel.issuer,
      aud: [mockConfig.zitadel.audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      permissions: undefined as never,
    });
    expect(result).toEqual({ sub: 'user-xyz', permissions: [] });
  });
});

// ── PermissionsGuard ──────────────────────────────────────────────────────────

describe('PermissionsGuard', () => {
  function makePermissionsContext(user: AuthUser | null, requiredPerms: string[]): ExecutionContext {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(requiredPerms) };
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access when user has the required permission', () => {
    const guard = new PermissionsGuard(new Reflector());
    const ctx = makePermissionsContext(
      { sub: 'u1', permissions: ['analytics:read'] },
      ['analytics:read'],
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user has multiple permissions including the required one', () => {
    const guard = new PermissionsGuard(new Reflector());
    const ctx = makePermissionsContext(
      { sub: 'u1', permissions: ['analytics:read', 'pipeline:write'] },
      ['analytics:read'],
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when required permission is absent', () => {
    const guard = new PermissionsGuard(new Reflector());
    const ctx = makePermissionsContext(
      { sub: 'u1', permissions: ['pipeline:write'] },
      ['analytics:read'],
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no permissions at all', () => {
    const guard = new PermissionsGuard(new Reflector());
    const ctx = makePermissionsContext(
      { sub: 'u1', permissions: [] },
      ['analytics:read'],
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when req.user is null (optional-auth route, no token)', () => {
    const guard = new PermissionsGuard(new Reflector());
    const ctx = makePermissionsContext(null, ['analytics:read']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('passes through when no permissions are required on the route', () => {
    const guard = new PermissionsGuard(new Reflector());
    const ctx = makePermissionsContext({ sub: 'u1', permissions: [] }, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

// ── JwtAuthGuard — required mode ──────────────────────────────────────────────

describe('JwtAuthGuard (required mode)', () => {
  it('accepts a valid RS256 token and populates req.user', async () => {
    const token = signToken({ permissions: ['analytics:read'] });
    const guard = new JwtAuthGuard(new Reflector(), mockConfig as never, mockMetrics as never);

    const req = { headers: { authorization: `Bearer ${token}` }, user: undefined };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toMatchObject({ sub: 'user-123', permissions: ['analytics:read'] });
  });

  it('throws UnauthorizedException for an expired token', async () => {
    const token = signToken({}, { expiresIn: -1 });
    const guard = new JwtAuthGuard(new Reflector(), mockConfig as never, mockMetrics as never);

    const req = { headers: { authorization: `Bearer ${token}` }, user: undefined };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('throws UnauthorizedException with no Authorization header', async () => {
    const guard = new JwtAuthGuard(new Reflector(), mockConfig as never, mockMetrics as never);

    const req = { headers: {}, user: undefined };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});

// ── JwtAuthGuard — optional mode (@OptionalAuth) ──────────────────────────────

describe('JwtAuthGuard (optional mode)', () => {
  function makeOptionalContext(authHeader?: string): { ctx: ExecutionContext; req: { headers: object; user: AuthUser | null | undefined } } {
    const reflector = new Reflector();
    // Simulate @OptionalAuth() metadata on the handler
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === OPTIONAL_AUTH_KEY) return true;
      return undefined;
    });

    const req = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: undefined as AuthUser | null | undefined,
    };

    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
      __reflector: reflector,
    } as unknown as ExecutionContext;

    return { ctx, req };
  }

  it('allows request with no token — sets req.user = null', async () => {
    const guard = new JwtAuthGuard(new Reflector(), mockConfig as never, mockMetrics as never);
    const { ctx, req } = makeOptionalContext();

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeNull();
  });

  it('allows request with an expired token — sets req.user = null instead of throwing', async () => {
    const token = signToken({}, { expiresIn: -1 });
    const guard = new JwtAuthGuard(new Reflector(), mockConfig as never, mockMetrics as never);
    const { ctx, req } = makeOptionalContext(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeNull();
  });

  it('populates req.user when a valid token is provided', async () => {
    const token = signToken({ permissions: ['chunks:debug'] });
    const guard = new JwtAuthGuard(new Reflector(), mockConfig as never, mockMetrics as never);
    const { ctx, req } = makeOptionalContext(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toMatchObject({ sub: 'user-123', permissions: ['chunks:debug'] });
  });
});
