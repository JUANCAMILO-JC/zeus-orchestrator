#!/usr/bin/env node
/**
 * Script rápido para probar el orquestador desde la línea de comandos.
 * Uso: node test-brief.js
 */

const brief = `
# BRIEF PARA ZEUS

## Proyecto
La Reina Films - Agencia de publicidad y productora

## Contexto
MiPyme colombiana naciendo, dos fundadores: un Director Creativo con
conocimiento en producción y un Productor. Tienen contactos y profesionales
para tercerizar otros aspectos.

## El problema
No tienen nada estructurado aún. Los fundadores son muy buenos en lo que
hacen pero un negocio escalable necesita más que talento. No hay plan
estratégico, ni visión de herramientas, automatización o IA.

## Restricciones
Presupuesto limitado.

## Resultado esperado
Aconsejar a La Reina Films con un análisis que tenga valor real para ellos.
`;

async function main() {
  const url = 'http://localhost:3000/orchestrate';
  console.log('🏛️  Sending brief to ZEUS orchestrator...\n');
  const t0 = Date.now();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief }),
  });

  if (!res.ok) {
    console.error(`❌ Error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ Done in ${Date.now() - t0}ms\n`);
  console.log('═══ DECOMPOSITION ═══');
  console.log(JSON.stringify(data.decomposition, null, 2));
  console.log('\n═══ ATLAS OUTPUT ═══');
  console.log(data.atlasOutput || '[skipped]');
  console.log('\n═══ HERMES OUTPUT ═══');
  console.log(data.hermesOutput || '[skipped]');
  console.log('\n═══ FINAL SYNTHESIS ═══');
  console.log(data.synthesis);
  console.log('\n═══ METRICS ═══');
  console.log(JSON.stringify(data.metrics, null, 2));
}

main().catch((err) => {
  console.error('💥 Failed:', err.message);
  process.exit(1);
});
