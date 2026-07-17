/* ZEUS Web UI — chat sobre los endpoints de sesiones multi-turno (SSE). */
'use strict';

// ── Estado ───────────────────────────────────────────────────────────────────

let sessionId = null;
let busy = false;
let apiKey = localStorage.getItem('zeus_api_key') || '';

const $ = (sel) => document.querySelector(sel);
const chat = $('#chat');
const input = $('#input');
const sendBtn = $('#btn-send');

const TOOL_LABELS = {
  consult_atlas: ['ATLAS (técnico)', 't-atlas'],
  consult_hermes: ['HERMES (negocio)', 't-hermes'],
  consult_apolo: ['APOLO (marketing)', 't-apolo'],
  web_search: ['búsqueda web', 't-web'],
};

const TEMPLATE = `## Contexto
(Quién eres, en qué negocio o proyecto estás, en qué etapa)

## Objetivo / decisión a tomar
(Qué necesitas decidir o resolver — una decisión concreta funciona mejor que un tema amplio)

## Presupuesto y plazo
(Dinero disponible y horizonte de tiempo)

## Mercado
(Dónde operas: ciudad/país, cliente objetivo)

## Restricciones
(Lo que no es negociable: equipo, tecnología, regulación, etc.)
`;

// ── HTTP + SSE ───────────────────────────────────────────────────────────────

function headers(extra = {}) {
  return apiKey ? { ...extra, 'x-api-key': apiKey } : extra;
}

async function getJson(path) {
  const res = await fetch(path, { headers: headers() });
  if (!res.ok) throw await httpError(res);
  return res.json();
}

async function httpError(res) {
  const body = await res.text().catch(() => '');
  if (res.status === 401) {
    openKeyPanel();
    return new Error('El server exige API key (401) — guárdala con el botón 🔑.');
  }
  let message = body;
  try {
    const parsed = JSON.parse(body);
    message = Array.isArray(parsed.message) ? parsed.message.join('; ') : parsed.message;
  } catch { /* texto plano */ }
  return new Error(`HTTP ${res.status}: ${(message || '').slice(0, 300)}`);
}

async function* sseEvents(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try { yield { event, data: JSON.parse(data) }; } catch { yield { event, data }; }
    }
  }
}

async function postStream(path, body, onAgentEvent) {
  const res = await fetch(path, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
    throw await httpError(res);
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

// ── Markdown mínimo (escapado primero, sin HTML crudo) ───────────────────────

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
}

function mdToHtml(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inlineMd(c.trim()));

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const level = Math.min(h[1].length + 1, 4); // # → h2 … #### → h4
      out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*(-{3,}|—{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(inlineMd(lines[i].replace(/^\s*>\s?/, '')));
        i++;
      }
      out.push(`<blockquote>${buf.join('<br>')}</blockquote>`);
      continue;
    }

    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]));
      const thead = `<tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr>`;
      const tbody = rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    const liUl = /^\s*[-*]\s+/;
    const liOl = /^\s*\d+[.)]\s+/;
    if (liUl.test(line) || liOl.test(line)) {
      const ordered = liOl.test(line);
      const re = ordered ? liOl : liUl;
      const buf = [];
      while (i < lines.length && re.test(lines[i])) {
        buf.push(`<li>${inlineMd(lines[i].replace(re, ''))}</li>`);
        i++;
      }
      out.push(ordered ? `<ol>${buf.join('')}</ol>` : `<ul>${buf.join('')}</ul>`);
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !liUl.test(lines[i]) && !liOl.test(lines[i]) &&
      !(isRow(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1]))
    ) {
      buf.push(inlineMd(lines[i]));
      i++;
    }
    out.push(`<p>${buf.join('<br>')}</p>`);
  }
  return out.join('\n');
}

// ── Render del chat ──────────────────────────────────────────────────────────

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function addUserMsg(text) {
  const msg = el('div', 'msg msg-user');
  msg.append(el('div', 'who', 'Tú'));
  const bubble = el('div', 'bubble');
  bubble.textContent = text;
  msg.append(bubble);
  chat.append(msg);
  scrollToBottom();
}

function addZeusMsg(markdown, consultations = []) {
  const msg = el('div', 'msg msg-zeus');
  msg.append(el('div', 'who', '⚡ Síntesis del consejo'));
  msg.append(el('div', 'bubble', mdToHtml(markdown)));
  if (consultations.length > 0) {
    const chips = el('div', 'chips');
    for (const q of consultations) {
      const [label] = TOOL_LABELS[q.tool] || [q.tool];
      const time = q.elapsedMs ? ` · ${(q.elapsedMs / 1000).toFixed(1)}s` : '';
      chips.append(el('span', 'chip', `${esc(label)}${q.error ? ' · falló' : time}`));
    }
    msg.append(chips);
  }
  chat.append(msg);
  scrollToBottom();
}

function addErrorMsg(text) {
  const msg = el('div', 'msg');
  const box = el('div', 'error-box');
  box.textContent = text;
  msg.append(box);
  chat.append(msg);
  scrollToBottom();
}

function eventHtml(e) {
  const [label, cls] = TOOL_LABELS[e.tool] || [e.tool, ''];
  const short = (s, n = 140) => esc(s && s.length > n ? s.slice(0, n) + '…' : s || '');
  switch (e.type) {
    case 'iteration':
      return { cls: 'ev', html: `· iteración ${e.iteration}` };
    case 'commentary':
      return { cls: 'ev ev-zeus', html: `ZEUS: ${short(e.text.replace(/\s+/g, ' '), 240)}` };
    case 'tool_call':
      return { cls: 'ev ev-call', html: `→ Consultando <span class="${cls}">${esc(label)}</span>: “${short(e.query)}”` };
    case 'tool_result':
      return { cls: 'ev', html: `✓ <span class="${cls}">${esc(label)}</span> respondió en ${(e.elapsedMs / 1000).toFixed(1)}s` };
    case 'tool_error':
      return { cls: 'ev ev-err', html: `✗ ${esc(label)} falló — ZEUS continúa sin esa perspectiva` };
    case 'web_search':
      return { cls: 'ev', html: `⌕ <span class="t-web">Búsqueda web</span>: “${short(e.query)}”` };
    case 'compaction':
      return { cls: 'ev', html: `⊜ contexto compactado${e.succeeded === false ? ' (falló, sin efecto)' : ''}` };
    default:
      return null;
  }
}

function startLiveBox() {
  const msg = el('div', 'msg');
  const box = el('div', 'live');
  const status = el('div', 'ev', `<span class="spinner"></span>el consejo está deliberando…`);
  box.append(status);
  msg.append(box);
  chat.append(msg);
  scrollToBottom();
  return {
    add(e) {
      const line = eventHtml(e);
      if (!line) return;
      box.insertBefore(el('div', line.cls, line.html), status);
      scrollToBottom();
    },
    setStatus(html) {
      status.innerHTML = html;
      scrollToBottom();
    },
    done(elapsedMs) {
      status.innerHTML = `✔ turno completado en ${(elapsedMs / 1000).toFixed(1)}s`;
    },
    fail() {
      status.innerHTML = `✗ el turno falló`;
    },
  };
}

// ── Recuperación de turnos ───────────────────────────────────────────────────
//
// El stream puede morir sin que el turno se haya perdido: corte de red,
// refresh accidental, o el proceso del server cayéndose justo después de
// persistir la sesión. Antes de declarar el fallo, verificamos contra la
// API si el turno quedó guardado y, si está, lo mostramos normalmente.

async function findPersistedTurn(sentText) {
  let id = sessionId;
  if (!id) {
    // Sesión nueva: el id nunca llegó. Se busca por el brief (el resumen
    // del listado lo trunca a 200 chars, comparamos igual).
    const sessions = await getJson('/sessions');
    const match = sessions.find((s) => s.brief === sentText.slice(0, 200));
    if (!match) return null;
    id = match.id;
  }
  const session = await getJson(`/sessions/${id}`);
  const last = session.turns[session.turns.length - 1];
  const prev = session.turns[session.turns.length - 2];
  if (last?.role === 'assistant' && prev?.role === 'user' && prev.text === sentText) {
    return session;
  }
  return null;
}

async function tryRecoverTurn(sentText) {
  // Si el server sigue vivo pero el stream murió, el turno puede tardar
  // en persistirse — se reintenta un par de veces antes de rendirse.
  for (const delay of [0, 5000, 15000]) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const session = await findPersistedTurn(sentText);
      if (session) return session;
    } catch {
      // server inaccesible en este intento — probar de nuevo
    }
  }
  return null;
}

// ── Sesiones ─────────────────────────────────────────────────────────────────

async function refreshSessions() {
  try {
    const sessions = await getJson('/sessions');
    const list = $('#session-list');
    list.innerHTML = '';
    for (const s of sessions) {
      const item = el('button', 'session-item' + (s.id === sessionId ? ' active' : ''));
      item.append(el('div', 's-brief', esc(s.brief)));
      const date = new Date(s.updatedAt || s.createdAt).toLocaleString('es-CO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      item.append(el('div', 's-meta', `${date} · ${s.turnCount} turnos`));
      item.addEventListener('click', () => openSession(s.id));
      list.append(item);
    }
  } catch (err) {
    console.warn('No se pudo listar sesiones:', err.message);
  }
}

function setSessionBadge() {
  const badge = $('#session-badge');
  if (sessionId) {
    badge.textContent = `sesión ${sessionId.slice(0, 8)}`;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function showEmptyState() {
  chat.innerHTML = '';
  chat.append(
    el(
      'div',
      'empty-state',
      `<h2>⚡ Consulta al consejo</h2>
       <p>Describe tu brief abajo — o usa el botón <strong>Plantilla</strong> para
       partir de una estructura con lo que los arquitectos necesitan saber.
       ZEUS decidirá a quién consultar: ATLAS (técnico), HERMES (negocio),
       APOLO (marketing), y buscará en la web si hace falta.</p>`,
    ),
  );
}

async function openSession(id) {
  if (busy) return;
  try {
    const session = await getJson(`/sessions/${id}`);
    sessionId = session.id;
    chat.innerHTML = '';
    for (const turn of session.turns) {
      if (turn.role === 'user') addUserMsg(turn.text);
      else addZeusMsg(turn.text, turn.consultations || []);
    }
    setSessionBadge();
    refreshSessions();
    $('#sidebar').classList.remove('open');
    input.placeholder = 'Pregunta de seguimiento para el consejo…';
  } catch (err) {
    addErrorMsg(`No se pudo cargar la sesión: ${err.message}`);
  }
}

function newSession() {
  if (busy) return;
  sessionId = null;
  setSessionBadge();
  showEmptyState();
  input.value = '';
  input.placeholder = 'Escribe tu brief para el consejo…';
  refreshSessions();
  $('#sidebar').classList.remove('open');
  input.focus();
}

// ── Envío ────────────────────────────────────────────────────────────────────

async function send() {
  const text = input.value.trim();
  if (!text || busy) return;

  busy = true;
  sendBtn.disabled = true;
  sendBtn.textContent = 'Deliberando…';
  if (!sessionId) chat.innerHTML = '';
  addUserMsg(text);
  input.value = '';
  const live = startLiveBox();
  const t0 = Date.now();

  const showResult = (session) => {
    sessionId = session.id;
    const last = [...session.turns].reverse().find((t) => t.role === 'assistant');
    addZeusMsg(last ? last.text : '(sin respuesta)', last ? last.consultations || [] : []);
    setSessionBadge();
    refreshSessions();
    input.placeholder = 'Pregunta de seguimiento para el consejo…';
  };

  try {
    const session = sessionId
      ? await postStream(`/sessions/${sessionId}/messages/stream`, { message: text }, live.add)
      : await postStream('/sessions/stream', { brief: text }, live.add);
    live.done(Date.now() - t0);
    showResult(session);
  } catch (err) {
    live.setStatus('<span class="spinner"></span>stream cortado — verificando si el turno se guardó…');
    const recovered = await tryRecoverTurn(text);
    if (recovered) {
      live.setStatus(`✔ turno recuperado (el stream se cortó, pero el servidor lo completó y lo guardó)`);
      showResult(recovered);
    } else {
      live.fail();
      addErrorMsg(
        `Error: ${err.message} — si el server sigue corriendo, el turno puede ` +
        `aparecer en la barra lateral cuando termine.`,
      );
      input.value = text; // no perder el brief escrito
    }
  } finally {
    busy = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Enviar al consejo';
  }
}

// ── API key ──────────────────────────────────────────────────────────────────

function openKeyPanel() {
  $('#key-panel').hidden = false;
  $('#key-input').value = apiKey;
}

function saveKey() {
  apiKey = $('#key-input').value.trim();
  if (apiKey) localStorage.setItem('zeus_api_key', apiKey);
  else localStorage.removeItem('zeus_api_key');
  $('#key-panel').hidden = true;
  refreshSessions();
}

// ── Wiring ───────────────────────────────────────────────────────────────────

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    send();
  }
});
$('#btn-new').addEventListener('click', newSession);
$('#btn-template').addEventListener('click', () => {
  input.value = input.value.trim() ? input.value : TEMPLATE;
  input.focus();
});
$('#btn-key').addEventListener('click', () => {
  const panel = $('#key-panel');
  panel.hidden ? openKeyPanel() : (panel.hidden = true);
});
$('#btn-key-save').addEventListener('click', saveKey);
$('#btn-sidebar').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

showEmptyState();
refreshSessions();
