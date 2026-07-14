import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { ConsultationRecord } from './agentic-orchestrator.service';

export interface SessionTurn {
  role: 'user' | 'assistant';
  text: string;
  consultations?: ConsultationRecord[];
  createdAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  brief: string;
  /** Historial completo en formato API — se le pasa tal cual al siguiente turno. */
  messages: Anthropic.Beta.BetaMessageParam[];
  /** Log legible para mostrar la conversación (no se envía al modelo). */
  turns: SessionTurn[];
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  brief: string;
  turnCount: number;
}

/**
 * Persistencia de sesiones multi-turno en data/sessions/<id>.json.
 * Análoga a OrchestrationStoreService pero para conversaciones que
 * se retoman en el tiempo en vez de correr una sola vez.
 */
@Injectable()
export class SessionStoreService {
  private readonly logger = new Logger(SessionStoreService.name);
  private readonly dir = join(process.cwd(), 'data', 'sessions');

  async save(session: Session): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const path = join(this.dir, `${session.id}.json`);
    await fs.writeFile(path, JSON.stringify(session, null, 2), 'utf8');
    this.logger.log(`Saved session ${session.id} (${session.turns.length} turns)`);
  }

  async get(id: string): Promise<Session | null> {
    // El id viene de la URL: solo se aceptan caracteres seguros para
    // evitar path traversal.
    if (!/^[\w-]+$/.test(id)) {
      return null;
    }
    try {
      const raw = await fs.readFile(join(this.dir, `${id}.json`), 'utf8');
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  async list(): Promise<SessionSummary[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const summaries: SessionSummary[] = [];
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(join(this.dir, file), 'utf8');
        const session = JSON.parse(raw) as Session;
        summaries.push({
          id: session.id,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          brief: session.brief.slice(0, 200),
          turnCount: session.turns.length,
        });
      } catch {
        this.logger.warn(`Skipping unreadable session file: ${file}`);
      }
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}
