#!/usr/bin/env node
/**
 * Script rápido para probar el orquestador desde la línea de comandos.
 * Uso: node test-brief.js
 */

const brief = `
# BRIEF PARA ZEUS

## Proyecto
LUNKORA — Agencia Digital IA-First para MiPymes colombianas. Ofrece 
servicios de marketing digital, producción audiovisual, automatización 
e integración de IA para pequeñas y medianas empresas.

## Contexto
LUNKORA está en etapa de fundación con dos socios operativos. El modelo 
de negocio es retainer productizado (paquetes mensuales por vertical) 
complementado con proyectos flagship y white-label para agencias US/EU. 
Ya se definió Notion como cerebro operativo interno (CRM, proyectos, 
SOPs, wiki). Ahora se necesita definir Google Drive como el Centro de 
Información Corporativo: el repositorio maestro de archivos, assets, 
entregables y documentación formal de la empresa.

Drive debe cumplir tres funciones simultáneas:
1. Almacén interno de la operación (contratos, finanzas, plantillas, SOPs)
2. Repositorio de producción por cliente (assets, entregables, versiones)
3. Punto de entrega al cliente (links compartidos, carpetas controladas)

El stack actual incluye: Notion (gestión), Alegra (facturación), Canva Pro 
(diseño), Claude Pro (IA), Make.com (automatización), Gmail corporativo, 
Google Meet, Cal.com. Google Drive es gratuito (15 GB) con proyección de 
migrar a Google Workspace Business cuando haya 5+ clientes activos.

## El problema o decisión
Definir la estructura completa de carpetas en Google Drive que funcione 
como arquitectura documental corporativa. La estructura debe:

- Escalar de 0 a 25+ clientes sin reorganización
- Separar claramente lo interno (operación) de lo externo (clientes)
- Manejar versionado de entregables sin caos de archivos
- Permitir compartir carpetas específicas con clientes sin exponer 
  información interna
- Integrarse con el workflow de Notion (cada cliente en Notion apunta 
  a su carpeta en Drive)
- Soportar la operación de múltiples verticales (B2B SaaS, D2C, EdTech)
- Incluir nomenclatura estandarizada para archivos y carpetas
- Considerar los límites del plan gratuito y la futura migración a 
  Workspace

Además necesito definir:
- Convenciones de nombrado de archivos (naming conventions)
- Política de permisos (quién ve qué, qué se comparte al cliente)
- Flujo de lifecycle de un asset (borrador → revisión → aprobado → entregado)
- Qué vive en Drive vs qué vive en Notion vs qué vive en Canva

## Lo que ya intentaste o ya sabes
- Notion es el cerebro operativo pero no sirve para almacenamiento pesado 
  de archivos multimedia (video, fotografía, diseño de alta resolución)
- Canva almacena los diseños en progreso pero los entregables finales 
  necesitan un repositorio permanente fuera de Canva
- Los clientes colombianos MiPyme esperan recibir archivos por link de 
  Drive o WhatsApp, no por plataformas que requieran registro
- El plan gratuito de Drive (15 GB) se comparte entre Gmail y Drive, 
  lo cual obliga a ser eficiente con el almacenamiento desde el inicio

## Restricciones reales
- Presupuesto mínimo: plan gratuito de Google Drive por ahora
- Dos personas administrando todo — la estructura debe ser autoexplicativa 
  para que un tercero (freelancer) la entienda sin capacitación
- Los freelancers que tercerizan NO deben tener acceso a carpetas de 
  otros clientes ni a la información financiera o administrativa interna
- Archivos pesados de video (gigabytes) llegarán pronto — la estructura 
  debe contemplar una estrategia de archivado o almacenamiento externo
- Nomenclatura en español (los clientes son colombianos)

## Resultado esperado
Una arquitectura documental completa en Google Drive con:
1. Árbol de carpetas completo (con nombres reales, no genéricos)
2. Convenciones de nombrado de archivos estandarizadas
3. Matriz de permisos (quién accede a qué)
4. Flujo de vida del archivo (draft → revisión → final → entregado)
5. Reglas de qué va en Drive vs Notion vs Canva
6. Estrategia de almacenamiento para cuando los 15 GB se agoten
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
