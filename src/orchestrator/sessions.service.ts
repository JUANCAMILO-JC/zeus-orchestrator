import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { AgenticOrchestratorService, AgenticListener } from './agentic-orchestrator.service';
import { SessionStoreService, Session } from './session-store.service';

/**
 * Conversación multi-turno con el Consejo: cada turno reutiliza el mismo
 * loop agéntico (AgenticOrchestratorService.runTurn), pero encadenando el
 * historial de mensajes en vez de arrancar de cero. ZEUS decide en cada
 * turno si necesita volver a consultar a un arquitecto o si puede
 * responder con lo ya discutido.
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly agentic: AgenticOrchestratorService,
    private readonly store: SessionStoreService,
  ) {}

  async createSession(brief: string, onEvent?: AgenticListener): Promise<Session> {
    const initialMessages: Anthropic.Beta.BetaMessageParam[] = [
      { role: 'user', content: `BRIEF DEL USUARIO:\n\n${brief}` },
    ];

    this.logger.log('═══ Starting new session ═══');
    const turn = await this.agentic.runTurn(initialMessages, onEvent);
    const now = new Date().toISOString();

    const session: Session = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      brief,
      messages: turn.messages,
      turns: [
        { role: 'user', text: brief, createdAt: now },
        {
          role: 'assistant',
          text: turn.synthesis,
          consultations: turn.consultations,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await this.store.save(session);
    this.logger.log(`Session ${session.id} created`);
    return session;
  }

  async sendMessage(
    sessionId: string,
    userMessage: string,
    onEvent?: AgenticListener,
  ): Promise<Session> {
    const session = await this.store.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...session.messages,
      { role: 'user', content: userMessage },
    ];

    this.logger.log(`═══ Continuing session ${sessionId} (turn ${session.turns.length + 1}) ═══`);
    const turn = await this.agentic.runTurn(messages, onEvent);

    session.messages = turn.messages;
    session.updatedAt = new Date().toISOString();
    session.turns.push({ role: 'user', text: userMessage, createdAt: session.updatedAt });
    session.turns.push({
      role: 'assistant',
      text: turn.synthesis,
      consultations: turn.consultations,
      createdAt: new Date().toISOString(),
    });

    await this.store.save(session);
    return session;
  }

  async get(id: string): Promise<Session> {
    const session = await this.store.get(id);
    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }
    return session;
  }

  async list() {
    return this.store.list();
  }
}
