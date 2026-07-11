import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { OrchestrationResult } from './orchestrator.service';

export interface OrchestrationSummary {
  id: string;
  createdAt: string;
  brief: string;
}

/**
 * Persistencia simple en disco: cada orquestación se guarda como un
 * archivo JSON en data/orchestrations/ para poder auditarla después.
 */
@Injectable()
export class OrchestrationStoreService {
  private readonly logger = new Logger(OrchestrationStoreService.name);
  private readonly dir = join(process.cwd(), 'data', 'orchestrations');

  async save(result: OrchestrationResult): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const path = join(this.dir, `${result.id}.json`);
    await fs.writeFile(path, JSON.stringify(result, null, 2), 'utf8');
    this.logger.log(`Saved orchestration ${result.id}`);
  }

  async list(): Promise<OrchestrationSummary[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const summaries: OrchestrationSummary[] = [];
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(join(this.dir, file), 'utf8');
        const result = JSON.parse(raw) as OrchestrationResult;
        summaries.push({
          id: result.id,
          createdAt: result.createdAt,
          brief: result.brief.slice(0, 200),
        });
      } catch {
        this.logger.warn(`Skipping unreadable orchestration file: ${file}`);
      }
    }
    return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<OrchestrationResult | null> {
    // El id viene de la URL: solo se aceptan caracteres seguros para
    // evitar path traversal.
    if (!/^[\w-]+$/.test(id)) {
      return null;
    }
    try {
      const raw = await fs.readFile(join(this.dir, `${id}.json`), 'utf8');
      return JSON.parse(raw) as OrchestrationResult;
    } catch {
      return null;
    }
  }
}
