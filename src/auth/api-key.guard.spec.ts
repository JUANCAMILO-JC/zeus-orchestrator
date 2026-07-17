import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function makeContext(headers: Record<string, string> = {}, isPublic = false) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
  return { reflector, context };
}

function makeGuard(apiKey: string | undefined, reflector: unknown) {
  const config = { get: jest.fn().mockReturnValue(apiKey) };
  return new ApiKeyGuard(config as never, reflector as never);
}

describe('ApiKeyGuard', () => {
  it('sin ZEUS_API_KEY configurada, deja pasar todo (modo abierto)', () => {
    const { reflector, context } = makeContext();
    const guard = makeGuard(undefined, reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('una key configurada pero vacía cuenta como no configurada', () => {
    const { reflector, context } = makeContext();
    const guard = makeGuard('   ', reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite endpoints @Public() sin key', () => {
    const { reflector, context } = makeContext({}, true);
    const guard = makeGuard('secreta', reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('acepta la key correcta vía x-api-key', () => {
    const { reflector, context } = makeContext({ 'x-api-key': 'secreta' });
    const guard = makeGuard('secreta', reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('acepta la key correcta vía Authorization: Bearer', () => {
    const { reflector, context } = makeContext({ authorization: 'Bearer secreta' });
    const guard = makeGuard('secreta', reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza requests sin key con 401', () => {
    const { reflector, context } = makeContext();
    const guard = makeGuard('secreta', reflector);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rechaza una key incorrecta con 401', () => {
    const { reflector, context } = makeContext({ 'x-api-key': 'otra' });
    const guard = makeGuard('secreta', reflector);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rechaza una key de distinta longitud sin lanzar errores internos', () => {
    const { reflector, context } = makeContext({
      'x-api-key': 'una-key-muchisimo-mas-larga-que-la-real',
    });
    const guard = makeGuard('corta', reflector);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
