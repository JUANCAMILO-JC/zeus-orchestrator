import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { SessionsService } from './sessions.service';
import { Session, SessionSummary } from './session-store.service';
import { BriefDto } from './brief.dto';
import { MessageDto } from './message.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  /**
   * POST /sessions
   * Body: { "brief": "..." }
   *
   * Crea una nueva sesión y corre el primer turno agéntico completo
   * (ZEUS puede consultar a ATLAS, HERMES y buscar en la web).
   */
  @Post()
  async create(@Body() dto: BriefDto): Promise<Session> {
    return this.sessions.createSession(dto.brief);
  }

  /**
   * POST /sessions/stream
   * Igual que POST /sessions, pero con streaming SSE de las acciones
   * del agente (eventos `agent`) y un evento `result` final.
   */
  @Post('stream')
  async createStream(@Body() dto: BriefDto, @Res() res: Response): Promise<void> {
    this.streamSession(res, () =>
      this.sessions.createSession(dto.brief, (e) => this.send(res, 'agent', e)),
    );
  }

  /**
   * POST /sessions/:id/messages
   * Body: { "message": "..." }
   *
   * Envía un mensaje de seguimiento a una sesión existente. ZEUS ve todo
   * el historial previo y decide si necesita re-consultar a un
   * arquitecto o si puede responder con lo ya discutido.
   */
  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: MessageDto,
  ): Promise<Session> {
    return this.sessions.sendMessage(id, dto.message);
  }

  /**
   * POST /sessions/:id/messages/stream
   * Versión SSE de sendMessage.
   */
  @Post(':id/messages/stream')
  async sendMessageStream(
    @Param('id') id: string,
    @Body() dto: MessageDto,
    @Res() res: Response,
  ): Promise<void> {
    this.streamSession(res, () =>
      this.sessions.sendMessage(id, dto.message, (e) => this.send(res, 'agent', e)),
    );
  }

  /**
   * GET /sessions
   * Lista las sesiones persistidas (id, fechas, brief truncado, nº de turnos).
   */
  @Get()
  async list(): Promise<SessionSummary[]> {
    return this.sessions.list();
  }

  /**
   * GET /sessions/:id
   * Devuelve la sesión completa: historial de mensajes y log de turnos.
   */
  @Get(':id')
  async get(@Param('id') id: string): Promise<Session> {
    return this.sessions.get(id);
  }

  private async streamSession(res: Response, run: () => Promise<Session>): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const session = await run();
      this.send(res, 'result', session);
    } catch (err) {
      this.send(res, 'error', { message: err instanceof Error ? err.message : String(err) });
    } finally {
      res.end();
    }
  }

  private send(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
