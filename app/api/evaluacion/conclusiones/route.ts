import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    const topicosStr = Object.entries(d.topicos as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `• ${k}: ${v} mención(es)`)
      .join('\n');

    const q5Str = Object.entries(d.q5Avgs as Record<string, number>)
      .map(([k, v]) => `• ${k}: ${v.toFixed(1)}/5`)
      .join('\n');

    const q6Str = Object.entries(d.q6 as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `• "${k}": ${v}`)
      .join('\n');

    const q9Str = Object.entries(d.q9 as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `• "${k}": ${v}`)
      .join('\n');

    const c4 = (d.comentarios4 as string[]).map((t, i) => `${i + 1}. "${t}"`).join('\n') || 'Ninguno';
    const c7 = (d.comentarios7 as string[]).map((t, i) => `${i + 1}. "${t}"`).join('\n') || 'Ninguno';
    const c10 = (d.comentarios10 as string[]).map((t, i) => `${i + 1}. "${t}"`).join('\n') || 'Ninguno';

    const npsLabel = d.nps >= 50 ? 'excelente' : d.nps >= 30 ? 'muy bueno' : d.nps >= 0 ? 'positivo' : 'negativo';

    const prompt = `Eres un consultor senior de desarrollo organizacional especializado en comunicación ejecutiva y capital humano. Tu tarea es redactar un análisis ejecutivo profesional en prosa sobre el desempeño de un instructor, basado en los resultados reales de una evaluación de participantes.

PROGRAMA: Técnicas de Actuación para Comunicar con Claridad, Seguridad y Credibilidad
CLIENTE: ${d.cliente} — Edición ${d.edicionNum}
PARTICIPANTES QUE RESPONDIERON: ${d.n}

═══ RESULTADOS CUANTITATIVOS ═══

NPS (Net Promoter Score): ${d.nps > 0 ? '+' : ''}${d.nps} (${npsLabel})
  - Promotores (9-10): ${d.promotores} personas
  - Pasivos (7-8): ${d.pasivos} personas
  - Detractores (0-6): ${d.detractores} personas

Aplicabilidad del contenido (Q1, escala 1-5): ${d.q1Avg.toFixed(1)}
Calidad de los roleplays (Q3, escala 1-5): ${d.q3Avg.toFixed(1)}
Desempeño del instructor (Q5, promedio general): ${d.q5Overall.toFixed(1)}/5
  Detalle por criterio:
${q5Str}

Temas más valiosos para los participantes (Q2):
${topicosStr}

¿El instructor conoció el contexto del negocio? (Q6):
${q6Str}

¿Participarían en una segunda edición? (Q9):
${q9Str}

═══ RESPUESTAS ABIERTAS ═══

Momentos que cambiaron su perspectiva (Q4):
${c4}

¿Qué podría hacer diferente el instructor? (Q7):
${c7}

Comentarios finales (Q10):
${c10}

═══ INSTRUCCIONES DE REDACCIÓN ═══

Redacta en español formal y ejecutivo. El análisis será leído por el área de RRHH y la dirección de la empresa. Estructura tu respuesta en EXACTAMENTE cuatro párrafos sin títulos ni viñetas:

1. SÍNTESIS GENERAL: Describe el impacto general del programa en el grupo, menciona el NPS y lo que refleja sobre la percepción del valor.

2. FORTALEZAS DEL INSTRUCTOR: Con base en los datos de Q5, Q6 y los comentarios positivos, describe los puntos fuertes del instructor de forma concreta y específica.

3. ÁREAS DE OPORTUNIDAD: Con base en las calificaciones más bajas de Q5, los comentarios de Q7 y el NPS (si tiene detractores), señala qué aspectos puede mejorar. Si todo es sobresaliente, reconócelo brevemente y menciona una recomendación de continuidad.

4. VALOR PARA LA EMPRESA Y RECOMENDACIÓN: Conecta los resultados con el impacto organizacional (comunicación, liderazgo, presencia ejecutiva) y emite una recomendación clara sobre si continuar, ampliar o ajustar el programa.

No uses frases vacías. No inventes datos. Sé directo, específico y útil.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
