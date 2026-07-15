#!/usr/bin/env node
/**
 * CLI de chat para el ZEUS Orchestrator.
 *
 * Conversa con el Consejo de Arquitectos desde la terminal usando los
 * endpoints de sesiones multi-turno (/sessions). Muestra en vivo las
 * acciones del loop agéntico (consultas a ATLAS/HERMES/APOLO, búsquedas
 * web) y la síntesis final de cada turno.
 *
 * Uso:
 *   node zeus.js                    # chat interactivo (nueva sesión)
 *   node zeus.js --resume <id>      # retoma una sesión existente
 *   node zeus.js --list             # lista sesiones y sale
 *   node zeus.js --brief "..."      # one-shot: un turno y sale
 *   node zeus.js --resume <id> --brief "..."  # one-shot sobre sesión existente
 *
 * Config: ZEUS_URL (default http://localhost:3000)
 */
'use strict';

const readline = require('node:readline');

const BASE_URL = (process.env.ZEUS_URL || 'http://localhost:3000').replace(/\/+$/, '');

// ── Colores ANSI (desactivados si no hay TTY o NO_COLOR) ────────────────────

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const c = {
  bold: paint('1'),
  dim: paint('2'),
  red: paint('31'),
  green: paint('32'),
  yellow: paint('33'),
  magenta: paint('35'),
  cyan: paint('36'),
  gray: paint('90'),
};

const TOOL_LABELS = {
  consult_atlas: 'ATLAS (técnico)',
  consult_hermes: 'HERMES (negocio)',
  consult_apolo: 'APOLO (marketing)',
};

const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');

// ── HTTP + SSE ───────────────────────────────────────────────────────────────

async function getJson(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${truncate(await res.text(), 300)}`);
  }
  return res.json();
}

/** Itera los eventos SSE de una respuesta fetch (event/data por bloque). */
async function* sseEvents(res) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        yield { event, data: JSON.parse(data) };
      } catch {
        yield { event, data };
      }
    }
  }
}

/** POST a un endpoint SSE; emite eventos `agent` y devuelve el `result` final. */
async function postStream(path, body, onAgentEvent) {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('text/event-stream')) {
    throw new Error(`HTTP ${res.status}: ${truncate(await res.text(), 300)}`);
  }

  let result = null;
  for await (const { event, data } of sseEvents(res)) {
    if (event === 'agent') onAgentEvent(data);
    else if (event === 'result') result = data;
    else if (event === 'error') throw new Error(data.message || 'error del servidor');
  }
  if (!result) throw new Error('el stream terminó sin resultado');
  return result;
}

// ── Render ───────────────────────────────────────────────────────────────────

function printAgentEvent(e) {
  const label = TOOL_LABELS[e.tool] || e.tool;
  switch (e.type) {
    case 'iteration':
      console.log(c.dim(`  · iteración ${e.iteration}`));
      break;
    case 'commentary':
      console.log(c.gray(`  ZEUS: ${truncate(e.text.replace(/\s+/g, ' '), 200)}`));
      break;
    case 'tool_call':
      console.log(`  ${c.yellow('→')} Consultando ${c.bold(label)}: ${c.dim(`"${truncate(e.query, 110)}"`)}`);
      break;
    case 'tool_result':
      console.log(`  ${c.green('✓')} ${label} respondió en ${fmtMs(e.elapsedMs)}`);
      break;
    case 'tool_error':
      console.log(`  ${c.red('✗')} ${label} falló (${e.error}) — ZEUS continúa sin esa perspectiva`);
      break;
    case 'web_search':
      console.log(`  ${c.cyan('⌕')} Búsqueda web: ${c.dim(`"${truncate(e.query, 110)}"`)}`);
      break;
    case 'compaction':
      console.log(c.dim(`  ⊜ contexto compactado${e.succeeded === false ? ' (falló, sin efecto)' : ''}`));
      break;
  }
}

/** Markdown mínimo → ANSI: negrilla, headers y separadores. Sin dependencias. */
function renderMarkdown(text) {
  return text
    .split('\n')
    .map((line) => {
      if (/^#{1,4}\s/.test(line)) return c.bold(c.cyan(line.replace(/^#+\s*/, '')));
      if (/^\*\*\[.+\]\*\*\s*$/.test(line)) return c.bold(c.magenta(line.replace(/\*\*/g, '')));
      return line.replace(/\*\*(.+?)\*\*/g, (_, s) => c.bold(s));
    })
    .join('\n');
}

function lastSynthesis(session) {
  const turn = [...session.turns].reverse().find((t) => t.role === 'assistant');
  return turn ? turn.text : '';
}

function printSynthesis(session, elapsedMs) {
  const turn = [...session.turns].reverse().find((t) => t.role === 'assistant');
  const consultations = (turn && turn.consultations) || [];
  console.log('');
  console.log(c.bold(c.magenta('═══ SÍNTESIS DEL CONSEJO ═══')));
  console.log('');
  console.log(renderMarkdown(turn ? turn.text : '(sin respuesta)'));
  console.log('');
  console.log(
    c.dim(
      `── turno completado en ${fmtMs(elapsedMs)} · ${consultations.length} consulta(s) · sesión ${session.id}`,
    ),
  );
  console.log('');
}

// ── Turnos ───────────────────────────────────────────────────────────────────

async function runTurn(sessionId, text) {
  const t0 = Date.now();
  console.log('');
  console.log(c.dim(sessionId ? '  continuando sesión…' : '  creando sesión…'));
  const session = sessionId
    ? await postStream(`/sessions/${sessionId}/messages/stream`, { message: text }, printAgentEvent)
    : await postStream('/sessions/stream', { brief: text }, printAgentEvent);
  printSynthesis(session, Date.now() - t0);
  return session;
}

async function listSessions() {
  const sessions = await getJson('/sessions');
  if (sessions.length === 0) {
    console.log(c.dim('No hay sesiones guardadas todavía.'));
    return;
  }
  console.log(c.bold('Sesiones guardadas:'));
  for (const s of sessions) {
    const turns = s.turnCount ?? s.turns ?? '?';
    console.log(
      `  ${c.cyan(s.id)}  ${c.dim(s.updatedAt || s.createdAt)}  (${turns} turnos)\n    ${truncate(s.brief, 90)}`,
    );
  }
}

// ── Input interactivo ────────────────────────────────────────────────────────

/**
 * Lee un bloque de texto: líneas acumuladas hasta una línea vacía (Enter
 * dos veces envía). Una primera línea que empieza con "/" es un comando y
 * se devuelve de inmediato. Devuelve null si stdin se cierra.
 */
function readBlock(rl, promptText) {
  return new Promise((resolve) => {
    const lines = [];
    const cleanup = () => {
      rl.removeListener('line', onLine);
      rl.removeListener('close', onClose);
    };
    const onClose = () => {
      cleanup();
      resolve(null);
    };
    const onLine = (line) => {
      const trimmed = line.trim();
      if (lines.length === 0 && trimmed.startsWith('/')) {
        cleanup();
        resolve(trimmed);
        return;
      }
      if (trimmed === '') {
        if (lines.length === 0) {
          rl.prompt();
          return;
        }
        cleanup();
        resolve(lines.join('\n').trim());
        return;
      }
      lines.push(line);
    };
    rl.on('line', onLine);
    rl.on('close', onClose);
    rl.setPrompt(promptText);
    rl.prompt();
  });
}

const HELP = `
Comandos:
  /sesiones      lista las sesiones guardadas
  /cargar <id>   retoma una sesión existente
  /nueva         empieza una sesión nueva (el próximo mensaje crea otra)
  /id            muestra el id de la sesión actual
  /ayuda         esta ayuda
  /salir         termina el chat

Escribe tu mensaje y presiona Enter dos veces para enviarlo.
`;

async function chat(initialSessionId) {
  let sessionId = initialSessionId || null;

  console.log(c.bold(c.cyan('\n⚡ ZEUS — Consejo de Arquitectos AI')));
  console.log(c.dim(`   servidor: ${BASE_URL}`));
  if (sessionId) {
    const session = await getJson(`/sessions/${sessionId}`);
    console.log(c.dim(`   sesión retomada: ${sessionId} (${session.turns.length} turnos)`));
    console.log('');
    console.log(c.dim('Última síntesis:'));
    console.log(renderMarkdown(lastSynthesis(session)));
  }
  console.log(c.dim('   /ayuda para ver comandos · Enter dos veces envía el mensaje\n'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  for (;;) {
    const promptText = c.bold(sessionId ? 'tú> ' : 'brief> ');
    const input = await readBlock(rl, promptText);
    if (input === null) break; // stdin cerrado (Ctrl+C / EOF)

    if (input.startsWith('/')) {
      const [cmd, ...args] = input.split(/\s+/);
      try {
        if (cmd === '/salir' || cmd === '/exit' || cmd === '/q') break;
        else if (cmd === '/ayuda' || cmd === '/help') console.log(HELP);
        else if (cmd === '/sesiones') await listSessions();
        else if (cmd === '/id') console.log(sessionId ? `Sesión actual: ${sessionId}` : 'Sin sesión activa aún.');
        else if (cmd === '/nueva') {
          sessionId = null;
          console.log('Listo — el próximo mensaje crea una sesión nueva.');
        } else if (cmd === '/cargar') {
          const id = args[0];
          if (!id) console.log('Uso: /cargar <id>');
          else {
            const session = await getJson(`/sessions/${id}`);
            sessionId = session.id;
            console.log(`Sesión ${id} cargada (${session.turns.length} turnos). Última síntesis:\n`);
            console.log(renderMarkdown(lastSynthesis(session)));
          }
        } else console.log(`Comando desconocido: ${cmd} (usa /ayuda)`);
      } catch (err) {
        console.error(c.red(`Error: ${err.message}`));
      }
      continue;
    }

    try {
      const session = await runTurn(sessionId, input);
      sessionId = session.id;
    } catch (err) {
      console.error(c.red(`\nError en el turno: ${err.message}\n`));
    }
  }

  rl.close();
  console.log(c.dim(sessionId ? `\nHasta luego. Retoma con: node zeus.js --resume ${sessionId}\n` : '\nHasta luego.\n'));
}

// ── Main ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--list') args.list = true;
    else if (argv[i] === '--resume') args.resume = argv[++i];
    else if (argv[i] === '--brief') args.brief = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    else args._.push(argv[i]);
  }
  return args;
}

async function serverIsUp() {
  try {
    const res = await fetch(`${BASE_URL}/orchestrate/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP);
    console.log('Flags: --list · --resume <id> · --brief "..." · ZEUS_URL para cambiar el servidor');
    return;
  }

  if (!(await serverIsUp())) {
    console.error(c.red(`No hay servidor en ${BASE_URL}.`));
    console.error(c.dim('Arráncalo en otra terminal con: npm run start:dev'));
    console.error(c.dim('(o define ZEUS_URL si corre en otra dirección)'));
    process.exitCode = 1;
    return;
  }

  if (args.list) {
    await listSessions();
    return;
  }

  if (args.brief) {
    // One-shot: un turno (nueva sesión o sobre --resume) y salir.
    const session = await runTurn(args.resume || null, args.brief);
    console.log(c.dim(`Continúa la conversación con: node zeus.js --resume ${session.id}`));
    return;
  }

  await chat(args.resume);
}

main().catch((err) => {
  console.error(c.red(`Error: ${err.message}`));
  process.exitCode = 1;
});
