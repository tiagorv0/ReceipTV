import TransportStream from 'winston-transport';
import type { Pool } from 'pg';
import { getStore } from '../utils/request-store.js';

interface LogEntry {
  level: string;
  message: string;
  service?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
  timestamp?: string;
}

const ALLOWED_LEVELS = new Set(['info', 'warn', 'error']);
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60_000;

export class SupabaseTransport extends TransportStream {
  private readonly pool: Pool;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval>;
  private failureCount = 0;
  private suspendedUntil = 0;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.flushTimer = setInterval(() => {
      this.flush().catch((err: unknown) => {
        console.error('[SupabaseTransport] Erro no flush periódico:', err);
      });
    }, FLUSH_INTERVAL_MS);
    // Não bloquear o processo no shutdown
    this.flushTimer.unref?.();
  }

  log(
    info: Record<string, unknown>,
    callback: () => void,
  ): void {
    const level = typeof info['level'] === 'string' ? info['level'] : '';

    // Filtrar: apenas info, warn, error
    if (!ALLOWED_LEVELS.has(level)) {
      callback();
      return;
    }

    // Enriquecer com dados do AsyncLocalStorage
    const store = getStore();
    const entry: LogEntry = {
      level,
      message: typeof info['message'] === 'string' ? info['message'] : String(info['message']),
      service: typeof info['service'] === 'string' ? info['service'] : 'receiptv-api',
      source: typeof info['source'] === 'string' ? info['source'] : undefined,
      metadata: this.extractMetadata(info),
      requestId: store?.requestId,
      userId: store?.userId,
      ip: store?.ip,
      userAgent: store?.userAgent,
      timestamp: typeof info['timestamp'] === 'string' ? info['timestamp'] : undefined,
    };

    // Circuit breaker: descartar enquanto suspenso
    if (Date.now() < this.suspendedUntil) {
      callback();
      return;
    }

    // Buffer cheio: descartar entradas mais antigas (FIFO)
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }

    this.buffer.push(entry);

    // Flush imediato ao atingir batchSize
    if (this.buffer.length >= BATCH_SIZE) {
      this.flush().catch((err: unknown) => {
        console.error('[SupabaseTransport] Erro no flush por batch:', err);
      });
    }

    callback();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    // Circuit breaker: suspender se necessário
    if (Date.now() < this.suspendedUntil) return;

    const entries = this.buffer.splice(0, this.buffer.length);

    // Montar INSERT em lote com parâmetros posicionais dinâmicos
    const values: unknown[] = [];
    const rows = entries.map((entry, i) => {
      const base = i * 9;
      values.push(
        entry.level,
        entry.message,
        JSON.stringify(entry.metadata ?? {}),
        entry.service ?? 'receiptv-api',
        entry.userId ?? null,
        entry.requestId ?? null,
        entry.source ?? null,
        entry.ip ?? null,
        entry.userAgent ?? null,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    });

    const sql = `
      INSERT INTO app_logs
        (level, message, metadata, service, user_id, request_id, source, ip_address, user_agent)
      VALUES
        ${rows.join(', ')}
    `;

    try {
      await this.pool.query(sql, values);
      // Sucesso: resetar contador de falhas
      this.failureCount = 0;
    } catch (err: unknown) {
      console.error('[SupabaseTransport] Falha ao persistir logs no Supabase:', err);
      this.failureCount += 1;

      if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        this.suspendedUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
        console.error(
          `[SupabaseTransport] Circuit breaker ativado — suspendendo por ${CIRCUIT_BREAKER_RESET_MS / 1000}s após ${this.failureCount} falhas consecutivas`,
        );
        this.failureCount = 0;
      }
    }
  }

  close(): void {
    clearInterval(this.flushTimer);
    this.flush().catch((err: unknown) => {
      console.error('[SupabaseTransport] Erro no flush do close():', err);
    });
  }

  private extractMetadata(
    info: Record<string, unknown>,
  ): Record<string, unknown> {
    const reserved = new Set([
      'level',
      'message',
      'timestamp',
      'service',
      'source',
      'splat',
      Symbol.for('level'),
      Symbol.for('splat'),
    ]);
    const meta: Record<string, unknown> = {};
    for (const key of Object.keys(info)) {
      if (!reserved.has(key)) {
        meta[key] = info[key];
      }
    }
    return meta;
  }
}
