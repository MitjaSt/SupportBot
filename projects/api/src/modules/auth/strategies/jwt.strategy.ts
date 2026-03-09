import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@/config/config.service';
import { MetricsService } from '@/modules/metrics/metrics.service';
import type { AuthUser, ZitadelJwtPayload } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(config: ConfigService, private readonly metrics: MetricsService) {
    const logger = new Logger(JwtStrategy.name);
    const secretProvider = passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: config.zitadel.jwksUri,
    });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: config.zitadel.audience,
      issuer: config.zitadel.issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: (
        request: unknown,
        rawToken: string,
        done: (err: Error | null, key?: string | Buffer) => void,
      ) => {
        secretProvider(request, rawToken, (err: Error | null, key?: string | Buffer) => {
          if (err) {
            logger.warn(`JWKS fetch failed: ${err.message}`);
            metrics.authJwksFetchTotal.inc({ result: 'error' });
          } else {
            metrics.authJwksFetchTotal.inc({ result: 'success' });
          }
          done(err, key);
        });
      },
    });
  }

  validate(payload: ZitadelJwtPayload): AuthUser {
    // Prefer the custom permissions claim (populated by the addPermissionsToToken Action).
    // Fall back to the native Zitadel role assertion claim when the action returns empty.
    const permissions =
      payload.permissions && payload.permissions.length > 0
        ? payload.permissions
        : Object.keys(payload['urn:zitadel:iam:org:project:roles'] ?? {});

    const user: AuthUser = { sub: payload.sub, permissions };
    this.metrics.authJwtVerifiedTotal.inc({ result: 'success' });
    this.logger.debug(`JWT verified: sub=${payload.sub} permissions=[${permissions.join(',')}]`);
    return user;
  }
}
