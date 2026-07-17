import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Guard global de API key: cada request debe traer la key configurada en
 * ZEUS_API_KEY, vía header `x-api-key` o `Authorization: Bearer <key>`.
 *
 * Si ZEUS_API_KEY no está definida, el guard deja pasar todo (modo
 * abierto, pensado solo para desarrollo local) y lo advierte en el log al
 * arrancar. Definir la key es requisito antes de exponer el servidor
 * fuera de localhost.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    if (!this.expectedKey()) {
      this.logger.warn(
        'ZEUS_API_KEY no está configurada — los endpoints quedan ABIERTOS. ' +
        'Solo aceptable en desarrollo local; defínela antes de exponer el servidor.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const expected = this.expectedKey();
    if (!expected) {
      return true; // modo abierto: sin key configurada no se exige nada
    }

    const provided = this.extractKey(context.switchToHttp().getRequest<Request>());
    if (!provided || !this.safeEqual(provided, expected)) {
      throw new UnauthorizedException(
        'API key inválida o ausente — envíala en el header x-api-key o como Authorization: Bearer',
      );
    }
    return true;
  }

  private expectedKey(): string | undefined {
    const key = this.config.get<string>('ZEUS_API_KEY');
    return key && key.trim().length > 0 ? key.trim() : undefined;
  }

  private extractKey(req: Request): string | undefined {
    const header = req.headers['x-api-key'];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }
    const auth = req.headers.authorization;
    if (auth?.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    return undefined;
  }

  /** Comparación en tiempo constante; el hash iguala longitudes para no filtrar la de la key real. */
  private safeEqual(a: string, b: string): boolean {
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
  }
}
