'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

type Edicion = {
  id: string;
  cliente: string;
  edicion_num: number;
  token: string;
  created_at: string;
  closed_at: string | null;
  expected_count: number;
};

type Resp = {
  id: string;
  participant_name: string;
  created_at: string;
  q1_aplicacion: number | null;
  q2_temas: string | null;
  q3_roleplay: number | null;
  q4_momento: string | null;
  q5_grid: Record<string, number> | null;
  q6_negocio: string | null;
  q7_diferente: string | null;
  q8_nps: number | null;
  q9_repetir: string | null;
  q10_comentarios: string | null;
};

const Q5_ROWS = [
  { key: 'dominio',         label: 'Dominio del tema' },
  { key: 'claridad',        label: 'Claridad al explicar' },
  { key: 'adaptacion',      label: 'Capacidad de adaptarse al grupo' },
  { key: 'retroalimentacion', label: 'Retroalimentación útil y concreta' },
  { key: 'presencia',       label: 'Presencia y credibilidad' },
];

const Q2_TOPICS = [
  'Manejo de la voz',
  'Lenguaje corporal y presencia',
  'Control del nerviosismo',
  'Estructura y claridad del mensaje',
  'Técnicas de roleplay',
  'Retroalimentación en tiempo real',
];

function avg(nums: (number | null)[]): number {
  const valid = nums.filter((n): n is number => n !== null && !isNaN(n));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function Bar({ value, max = 5, color = 'var(--oro)' }: { value: number; max?: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ flex: 1, height: 8, background: 'rgba(27,42,74,.1)', borderRadius: 0 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .5s' }} />
    </div>
  );
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: 'var(--oro)', letterSpacing: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < Math.round(value) ? 1 : .2 }}>★</span>
      ))}
    </span>
  );
}

function checkAuth(): boolean {
  try {
    const raw = localStorage.getItem('eval_auth');
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < 8 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function EvaluacionResultados() {
  const params = useParams();
  const token = params.token as string;

  const [ready, setReady] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [resps, setResps] = useState<Resp[]>([]);
  const [loading, setLoading] = useState(true);
  const [conclusiones, setConclusiones] = useState('');
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (!checkAuth()) { window.location.href = '/evaluacion'; return; }
    setReady(true);
    load();
  }, []);

  async function load() {
    const { data: ed } = await supabase
      .from('evaluaciones_ediciones')
      .select('*')
      .eq('token', token)
      .single();
    if (!ed) { setLoading(false); return; }
    setEdicion(ed);

    const { data: rs } = await supabase
      .from('evaluaciones_respuestas')
      .select('*')
      .eq('edicion_id', ed.id)
      .order('created_at', { ascending: true });
    setResps(rs ?? []);
    setLoading(false);
  }

  async function generarConclusiones() {
    if (!edicion || resps.length === 0) return;
    setGenerando(true);
    setConclusiones('');
    try {
      const res = await fetch('/api/evaluacion/conclusiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: edicion.cliente,
          edicionNum: edicion.edicion_num,
          n,
          nps: npsScore ?? 0,
          promotores: promoters,
          pasivos: passives,
          detractores: detractors,
          q1Avg,
          q3Avg,
          q5Avgs,
          q5Overall,
          topicos: topicCounts,
          q6: q6Counts,
          q9: q9Counts,
          comentarios4: textos4.map(t => t.text),
          comentarios7: textos7.map(t => t.text),
          comentarios10: textos10.map(t => t.text),
        }),
      });
      const data = await res.json();
      if (data.text) setConclusiones(data.text);
      else setConclusiones('Error al generar el análisis. Intenta de nuevo.');
    } catch {
      setConclusiones('Error de conexión. Intenta de nuevo.');
    }
    setGenerando(false);
  }

  if (!ready || loading) return null;
  if (!edicion) return (
    <main className="page">
      <section className="shell">
        <Header />
        <p className="muted">Edición no encontrada.</p>
      </section>
    </main>
  );

  const n = resps.length;

  // ── NPS ──
  const npsVals = resps.map(r => r.q8_nps).filter((v): v is number => v !== null);
  const promoters  = npsVals.filter(v => v >= 9).length;
  const passives   = npsVals.filter(v => v >= 7 && v <= 8).length;
  const detractors = npsVals.filter(v => v <= 6).length;
  const npsScore   = npsVals.length > 0
    ? Math.round(((promoters - detractors) / npsVals.length) * 100)
    : null;
  const npsColor = npsScore === null ? 'var(--azul)'
    : npsScore >= 50 ? '#2E7D52'
    : npsScore >= 30 ? 'var(--oro)'
    : npsScore >= 0  ? 'var(--azul)'
    : '#7A1E1E';

  // ── Promedios Q1, Q3 ──
  const q1Avg = avg(resps.map(r => r.q1_aplicacion));
  const q3Avg = avg(resps.map(r => r.q3_roleplay));

  // ── Q2 temas ──
  const topicCounts: Record<string, number> = {};
  Q2_TOPICS.forEach(t => topicCounts[t] = 0);
  resps.forEach(r => {
    if (!r.q2_temas) return;
    try {
      const selected: string[] = JSON.parse(r.q2_temas);
      selected.forEach(t => { if (topicCounts[t] !== undefined) topicCounts[t]++; });
    } catch { /* ignorar */ }
  });
  const maxTopicCount = Math.max(...Object.values(topicCounts), 1);

  // ── Q5 grid promedios ──
  const q5Avgs: Record<string, number> = {};
  Q5_ROWS.forEach(row => {
    const vals = resps.map(r => r.q5_grid?.[row.key]).filter((v): v is number => v !== undefined && v !== null);
    q5Avgs[row.key] = vals.length > 0 ? avg(vals) : 0;
  });
  const q5Overall = avg(Object.values(q5Avgs).filter(v => v > 0));

  // ── Q6 distribución ──
  const q6Counts: Record<string, number> = {};
  resps.forEach(r => { if (r.q6_negocio) q6Counts[r.q6_negocio] = (q6Counts[r.q6_negocio] ?? 0) + 1; });

  // ── Q9 distribución ──
  const q9Counts: Record<string, number> = {};
  resps.forEach(r => { if (r.q9_repetir) q9Counts[r.q9_repetir] = (q9Counts[r.q9_repetir] ?? 0) + 1; });

  // ── Textos abiertos ──
  const textos4  = resps.filter(r => r.q4_momento?.trim()).map(r => ({ name: r.participant_name, text: r.q4_momento! }));
  const textos7  = resps.filter(r => r.q7_diferente?.trim()).map(r => ({ name: r.participant_name, text: r.q7_diferente! }));
  const textos10 = resps.filter(r => r.q10_comentarios?.trim()).map(r => ({ name: r.participant_name, text: r.q10_comentarios! }));

  const printDate = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { padding: 0 !important; }
          .shell { max-width: 100% !important; }
          .card { box-shadow: none !important; border: 1px solid #ccc !important; break-inside: avoid; }
          .divider { margin: 20px 0 !important; }
          body { font-size: 12px; }
          .stat-value { font-size: 22px !important; }
        }
      `}</style>

      <main className="page">
        <section className="shell">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Header />
            <div className="nav no-print" style={{ margin: 0 }}>
              <a className="btn secondary" href="/evaluacion/admin" style={{ fontSize: 10 }}>← Panel</a>
              <button onClick={() => window.print()}>Imprimir / PDF</button>
            </div>
          </div>

          <p className="brand" style={{ marginBottom: 6 }}>Resultados</p>
          <h1 className="headline" style={{ fontSize: 24, marginBottom: 6 }}>
            {edicion.cliente} · Edición {edicion.edicion_num}
          </h1>
          <p className="small muted">
            {new Date(edicion.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            {edicion.closed_at && <> · Cerrada {new Date(edicion.closed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
            {' · '}{n} {n === 1 ? 'respuesta' : 'respuestas'}
            {edicion.expected_count > 0 && ` de ${edicion.expected_count} esperadas`}
          </p>
          <p className="small muted" style={{ marginTop: 2 }}>Reporte generado: {printDate}</p>

          {n === 0 ? (
            <div className="card" style={{ marginTop: 24 }}>
              <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>
                Aún no hay respuestas para esta edición.
              </p>
            </div>
          ) : (
            <>
              {/* ── STATS PRINCIPALES ── */}
              <div className="divider" />
              <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 8 }}>
                <div className="stat">
                  <div className="stat-value" style={{ color: npsColor, fontSize: 34 }}>
                    {npsScore !== null ? (npsScore > 0 ? `+${npsScore}` : npsScore) : '—'}
                  </div>
                  <div className="stat-label">NPS</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{q1Avg > 0 ? q1Avg.toFixed(1) : '—'}</div>
                  <div className="stat-label">Aplicación</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{q5Overall > 0 ? q5Overall.toFixed(1) : '—'}</div>
                  <div className="stat-label">Instructor</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{q3Avg > 0 ? q3Avg.toFixed(1) : '—'}</div>
                  <div className="stat-label">Roleplay</div>
                </div>
              </div>

              {/* ── NPS DETALLE ── */}
              <div className="divider" />
              <p className="section-label" style={{ marginBottom: 14 }}>Net Promoter Score (Q8)</p>
              <div className="card" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 54, lineHeight: 1, color: npsColor, marginBottom: 4 }}>
                      {npsScore !== null ? (npsScore > 0 ? `+${npsScore}` : npsScore) : '—'}
                    </p>
                    <p className="small muted">Net Promoter Score</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {[
                      { label: 'Promotores (9–10)', count: promoters, color: '#2E7D52' },
                      { label: 'Pasivos (7–8)',     count: passives,  color: 'var(--oro)' },
                      { label: 'Detractores (0–6)', count: detractors, color: '#7A1E1E' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ width: 150, fontSize: 12, opacity: .8, flexShrink: 0 }}>{row.label}</span>
                        <Bar value={row.count} max={npsVals.length} color={row.color} />
                        <span style={{ width: 32, textAlign: 'right', fontSize: 13, fontFamily: 'Georgia, serif' }}>{row.count}</span>
                        <span style={{ width: 36, textAlign: 'right', fontSize: 11, opacity: .5 }}>
                          {npsVals.length > 0 ? `${Math.round((row.count / npsVals.length) * 100)}%` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Distribución 0–10 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Array.from({ length: 11 }, (_, i) => {
                    const cnt = npsVals.filter(v => v === i).length;
                    const bg = i >= 9 ? 'rgba(46,125,82,.15)' : i >= 7 ? 'rgba(184,150,62,.15)' : 'rgba(122,30,30,.1)';
                    return (
                      <div key={i} style={{ textAlign: 'center', minWidth: 36 }}>
                        <div style={{ background: bg, border: '1px solid rgba(27,42,74,.12)', padding: '8px 6px', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, display: 'block' }}>{cnt}</span>
                          <span style={{ fontSize: 10, opacity: .5 }}>{i}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Q1: APLICACIÓN ── */}
              <div className="divider" />
              <p className="section-label" style={{ marginBottom: 14 }}>
                Sección 1 — Relevancia del contenido
              </p>
              <div className="grid">
                <div className="card">
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 14, letterSpacing: '.06em' }}>
                    Q1 · ¿Qué tanto podrías aplicar lo aprendido en conversaciones reales?
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 40, color: 'var(--azul)', lineHeight: 1 }}>
                      {q1Avg > 0 ? q1Avg.toFixed(1) : '—'}
                    </span>
                    <span style={{ opacity: .4, fontSize: 13 }}>/ 5</span>
                    <Stars value={q1Avg} />
                  </div>
                  {[5, 4, 3, 2, 1].map(v => {
                    const cnt = resps.filter(r => r.q1_aplicacion === v).length;
                    return (
                      <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                        <span style={{ width: 16, fontSize: 12, opacity: .7 }}>{v}</span>
                        <Bar value={cnt} max={n} />
                        <span style={{ width: 24, textAlign: 'right', fontSize: 12, opacity: .7 }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="card">
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 14, letterSpacing: '.06em' }}>
                    Q3 · ¿Los roleplays reflejaron situaciones reales de tu trabajo?
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 40, color: 'var(--azul)', lineHeight: 1 }}>
                      {q3Avg > 0 ? q3Avg.toFixed(1) : '—'}
                    </span>
                    <span style={{ opacity: .4, fontSize: 13 }}>/ 5</span>
                    <Stars value={q3Avg} />
                  </div>
                  {[5, 4, 3, 2, 1].map(v => {
                    const cnt = resps.filter(r => r.q3_roleplay === v).length;
                    return (
                      <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                        <span style={{ width: 16, fontSize: 12, opacity: .7 }}>{v}</span>
                        <Bar value={cnt} max={n} />
                        <span style={{ width: 24, textAlign: 'right', fontSize: 12, opacity: .7 }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Q2: TEMAS ── */}
              <div className="card" style={{ marginTop: 0 }}>
                <p style={{ fontSize: 12, opacity: .6, marginBottom: 18, letterSpacing: '.06em' }}>
                  Q2 · Temas más valiosos para los participantes (selección múltiple)
                </p>
                {Q2_TOPICS.map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ width: 220, fontSize: 13, flexShrink: 0 }}>{t}</span>
                    <Bar value={topicCounts[t]} max={maxTopicCount} />
                    <span style={{ width: 24, textAlign: 'right', fontSize: 13, fontFamily: 'Georgia, serif' }}>{topicCounts[t]}</span>
                    <span style={{ width: 36, textAlign: 'right', fontSize: 11, opacity: .45 }}>
                      {n > 0 ? `${Math.round((topicCounts[t] / n) * 100)}%` : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Q4: MOMENTOS ABIERTOS ── */}
              {textos4.length > 0 && (
                <div className="card" style={{ marginTop: 0 }}>
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 16, letterSpacing: '.06em' }}>
                    Q4 · Momentos que cambiaron su perspectiva
                  </p>
                  {textos4.map((t, i) => (
                    <blockquote key={i} style={{
                      borderLeft: '2px solid var(--oro)',
                      paddingLeft: 16,
                      margin: '0 0 16px',
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}>
                      "{t.text}"
                      <cite style={{ display: 'block', fontSize: 11, opacity: .55, fontStyle: 'normal', marginTop: 6, letterSpacing: '.1em' }}>
                        — {t.name}
                      </cite>
                    </blockquote>
                  ))}
                </div>
              )}

              {/* ── Q5: GRID INSTRUCTOR ── */}
              <div className="divider" />
              <p className="section-label" style={{ marginBottom: 14 }}>Sección 2 — Calidad del instructor</p>
              <div className="card">
                <p style={{ fontSize: 12, opacity: .6, marginBottom: 18, letterSpacing: '.06em' }}>
                  Q5 · Evaluación del instructor (escala 1–5)
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Criterio</th>
                      <th style={{ textAlign: 'center' }}>Promedio</th>
                      <th style={{ width: '40%' }}></th>
                      <th style={{ textAlign: 'center' }}>Estrellas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Q5_ROWS.map(row => (
                      <tr key={row.key}>
                        <td style={{ fontSize: 13 }}>{row.label}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 18, color: 'var(--azul)' }}>
                          {q5Avgs[row.key] > 0 ? q5Avgs[row.key].toFixed(1) : '—'}
                        </td>
                        <td><Bar value={q5Avgs[row.key]} max={5} /></td>
                        <td style={{ textAlign: 'center' }}><Stars value={q5Avgs[row.key]} /></td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid rgba(184,150,62,.3)' }}>
                      <td style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase' }}>Promedio general</td>
                      <td style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--oro)' }}>
                        {q5Overall > 0 ? q5Overall.toFixed(1) : '—'}
                      </td>
                      <td><Bar value={q5Overall} max={5} color="var(--azul)" /></td>
                      <td style={{ textAlign: 'center' }}><Stars value={q5Overall} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Q6: CONOCE EL NEGOCIO ── */}
              {Object.keys(q6Counts).length > 0 && (
                <div className="card" style={{ marginTop: 0 }}>
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 16, letterSpacing: '.06em' }}>
                    Q6 · ¿El instructor demostró conocer el contexto de su negocio?
                  </p>
                  {Object.entries(q6Counts).sort((a, b) => b[1] - a[1]).map(([label, cnt]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ minWidth: 260, fontSize: 13 }}>{label}</span>
                      <Bar value={cnt} max={n} />
                      <span style={{ width: 24, textAlign: 'right', fontSize: 13, fontFamily: 'Georgia, serif' }}>{cnt}</span>
                      <span style={{ width: 36, textAlign: 'right', fontSize: 11, opacity: .45 }}>
                        {Math.round((cnt / n) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Q7: TEXTOS ABIERTOS ── */}
              {textos7.length > 0 && (
                <div className="card" style={{ marginTop: 0 }}>
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 16, letterSpacing: '.06em' }}>
                    Q7 · ¿Qué podría hacer diferente el instructor?
                  </p>
                  {textos7.map((t, i) => (
                    <blockquote key={i} style={{
                      borderLeft: '2px solid rgba(27,42,74,.3)',
                      paddingLeft: 16,
                      margin: '0 0 16px',
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}>
                      "{t.text}"
                      <cite style={{ display: 'block', fontSize: 11, opacity: .55, fontStyle: 'normal', marginTop: 6, letterSpacing: '.1em' }}>
                        — {t.name}
                      </cite>
                    </blockquote>
                  ))}
                </div>
              )}

              {/* ── Q9: REPETIR ── */}
              <div className="divider" />
              <p className="section-label" style={{ marginBottom: 14 }}>Sección 3 — Valor percibido</p>
              {Object.keys(q9Counts).length > 0 && (
                <div className="card">
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 16, letterSpacing: '.06em' }}>
                    Q9 · ¿Participaría en una segunda edición?
                  </p>
                  {Object.entries(q9Counts).sort((a, b) => b[1] - a[1]).map(([label, cnt]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ minWidth: 180, fontSize: 13 }}>{label}</span>
                      <Bar value={cnt} max={n} />
                      <span style={{ width: 24, textAlign: 'right', fontSize: 13, fontFamily: 'Georgia, serif' }}>{cnt}</span>
                      <span style={{ width: 36, textAlign: 'right', fontSize: 11, opacity: .45 }}>
                        {Math.round((cnt / n) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Q10: COMENTARIOS FINALES ── */}
              {textos10.length > 0 && (
                <div className="card" style={{ marginTop: 0 }}>
                  <p style={{ fontSize: 12, opacity: .6, marginBottom: 16, letterSpacing: '.06em' }}>
                    Q10 · Comentarios y sugerencias finales
                  </p>
                  {textos10.map((t, i) => (
                    <blockquote key={i} style={{
                      borderLeft: '2px solid var(--oro)',
                      paddingLeft: 16,
                      margin: '0 0 16px',
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}>
                      "{t.text}"
                      <cite style={{ display: 'block', fontSize: 11, opacity: .55, fontStyle: 'normal', marginTop: 6, letterSpacing: '.1em' }}>
                        — {t.name}
                      </cite>
                    </blockquote>
                  ))}
                </div>
              )}

              {/* ── ANÁLISIS IA ── */}
              {(() => {
                const THRESHOLD = 80;
                const pctResp = edicion.expected_count > 0
                  ? Math.round((n / edicion.expected_count) * 100)
                  : 100;
                const canGenerate = pctResp >= THRESHOLD;
                const pendientes = edicion.expected_count > 0
                  ? Math.max(0, Math.ceil(edicion.expected_count * THRESHOLD / 100) - n)
                  : 0;

                return (
                  <>
                    <div className="divider" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                      <p className="section-label" style={{ margin: 0 }}>Análisis ejecutivo</p>
                      {edicion.expected_count > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 12px',
                          fontSize: 11, letterSpacing: '.1em',
                          border: `1px solid ${canGenerate ? 'rgba(46,125,82,.4)' : 'rgba(184,150,62,.4)'}`,
                          color: canGenerate ? '#2E7D52' : 'var(--oro)',
                          background: canGenerate ? 'rgba(46,125,82,.06)' : 'rgba(184,150,62,.08)',
                        }}>
                          {canGenerate
                            ? `✓ ${pctResp}% respondido — listo para generar`
                            : `${pctResp}% respondido — se habilita al ${THRESHOLD}%${pendientes > 0 ? ` (faltan ${pendientes})` : ''}`}
                        </span>
                      )}
                    </div>
                    <div className="card" style={{ borderColor: conclusiones ? 'var(--borde)' : 'rgba(27,42,74,.12)' }}>
                      {!conclusiones && !generando && (
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                          <p style={{ fontSize: 14, opacity: .7, marginBottom: 18, lineHeight: 1.7 }}>
                            Se analizan los resultados con IA y se redacta un informe ejecutivo en prosa —
                            síntesis, fortalezas, oportunidades y recomendación para RRHH.
                          </p>
                          {!canGenerate && edicion.expected_count > 0 && (
                            <p className="small" style={{ opacity: .55, marginBottom: 16 }}>
                              El botón se habilitará cuando el {THRESHOLD}% de los participantes haya respondido.
                            </p>
                          )}
                          <button
                            className="no-print"
                            onClick={generarConclusiones}
                            disabled={!canGenerate}
                            title={!canGenerate ? `Disponible al ${THRESHOLD}% de respuestas` : ''}>
                            Generar análisis con IA
                          </button>
                        </div>
                      )}
                      {generando && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <p className="muted small">Analizando resultados…</p>
                        </div>
                      )}
                      {conclusiones && (
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.85, color: 'var(--carbon)' }}>
                          {conclusiones}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* ── PARTICIPANTES ── */}
              <div className="divider" />
              <p className="section-label" style={{ marginBottom: 14 }}>Lista de participantes ({n})</p>
              <div className="card">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'center' }}>Q1</th>
                      <th style={{ textAlign: 'center' }}>Q3</th>
                      <th style={{ textAlign: 'center' }}>NPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resps.map((r, i) => (
                      <tr key={r.id}>
                        <td className="muted" style={{ fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontSize: 13 }}>{r.participant_name}</td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.q1_aplicacion ?? '—'}</td>
                        <td style={{ textAlign: 'center' }}>{r.q3_roleplay ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 500 }}>
                          <span style={{
                            color: r.q8_nps !== null
                              ? r.q8_nps >= 9 ? '#2E7D52' : r.q8_nps >= 7 ? 'var(--oro)' : '#7A1E1E'
                              : 'inherit',
                          }}>
                            {r.q8_nps ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
