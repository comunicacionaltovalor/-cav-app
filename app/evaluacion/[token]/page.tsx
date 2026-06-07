'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

type Edicion = {
  id: string;
  cliente: string;
  edicion_num: number;
  closed_at: string | null;
};

const Q2_TOPICS = [
  'Manejo de la voz',
  'Lenguaje corporal y presencia',
  'Control del nerviosismo',
  'Estructura y claridad del mensaje',
  'Técnicas de roleplay',
  'Retroalimentación en tiempo real',
];

const Q5_ROWS = [
  { key: 'dominio',           label: 'Dominio del tema' },
  { key: 'claridad',          label: 'Claridad al explicar' },
  { key: 'adaptacion',        label: 'Capacidad de adaptarse al grupo' },
  { key: 'retroalimentacion', label: 'Retroalimentación útil y concreta' },
  { key: 'presencia',         label: 'Presencia y credibilidad' },
];

const Q6_OPTIONS = [
  'Sí, dominó el contexto de nuestro negocio',
  'En su mayoría, con algunos momentos de desconexión',
  'Parcialmente, le costó adaptarse',
  'No, el contenido fue muy genérico',
];

const Q9_OPTIONS = [
  'Definitivamente sí',
  'Probablemente sí',
  'Probablemente no',
  'Definitivamente no',
];

function ScaleInput({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
      {[1, 2, 3, 4, 5].map(v => (
        <label key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <span style={{ fontSize: 10, opacity: .55, letterSpacing: '.08em' }}>
            {v === 1 ? 'Nada' : v === 5 ? 'Mucho' : ''}
          </span>
          <div onClick={() => onChange(v)} style={{
            width: 46, height: 46,
            border: `1px solid ${value === v ? 'var(--azul)' : 'rgba(27,42,74,.2)'}`,
            background: value === v ? 'var(--azul)' : 'transparent',
            color: value === v ? '#fff' : 'var(--azul)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontFamily: 'Georgia, serif',
            cursor: 'pointer', transition: 'all .15s', userSelect: 'none',
          }}>{v}</div>
        </label>
      ))}
    </div>
  );
}

function RadioInput({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginTop: 8 }}>
      {options.map(opt => (
        <label key={opt} className="check" style={{ cursor: 'pointer', display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(27,42,74,.07)', alignItems: 'center' }}>
          <div onClick={() => onChange(opt)} style={{
            width: 18, height: 18, minWidth: 18,
            border: `1.5px solid ${value === opt ? 'var(--azul)' : 'rgba(27,42,74,.3)'}`,
            borderRadius: '50%',
            background: value === opt ? 'var(--azul)' : 'transparent',
            flexShrink: 0, position: 'relative', cursor: 'pointer',
          }}>
            {value === opt && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />}
          </div>
          <span style={{ fontSize: 14, lineHeight: 1.55, cursor: 'pointer' }} onClick={() => onChange(opt)}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function SectionHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div style={{ margin: '32px 0 20px', paddingTop: 8, borderTop: '1px solid var(--borde)' }}>
      <p className="brand" style={{ marginBottom: 6 }}>Sección {num}</p>
      <h2 className="headline" style={{ fontSize: 17, marginBottom: 6 }}>{title}</h2>
      <p className="small muted">{sub}</p>
    </div>
  );
}

function Q({ num, text, optional, children }: { num: string; text: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span className="brand" style={{ fontSize: 10 }}>{num}</span>
        {optional && <span className="small muted" style={{ fontSize: 11 }}>Opcional</span>}
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.65, marginBottom: 4 }}>{text}</p>
      {children}
    </div>
  );
}

// Modal de registro duplicado
function DuplicateModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(27,42,74,.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: 'var(--blanco)',
        maxWidth: 440, width: '100%',
        padding: '36px 32px',
        boxShadow: '0 24px 64px rgba(27,42,74,.28)',
      }}>
        <p className="brand" style={{ marginBottom: 12 }}>Registro existente</p>
        <h2 className="headline" style={{ fontSize: 20, marginBottom: 16 }}>
          Ya tenemos un registro con este nombre
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, fontFamily: 'Georgia, serif', marginBottom: 24, opacity: .82 }}>
          Encontramos una respuesta registrada con el mismo nombre y apellidos.
          Si crees que es un error o necesitas hacer una corrección, por favor comunícate
          con la persona de Recursos Humanos de tu organización.
        </p>
        <button onClick={onClose}>Entendido</button>
      </div>
    </div>
  );
}

export default function EvaluacionForm() {
  const params = useParams();
  const token = params.token as string;

  const [edicion, setEdicion]       = useState<Edicion | null>(null);
  const [loading, setLoading]       = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState<string[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Campos de nombre
  const [nombres, setNombres]               = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');

  const [q1, setQ1] = useState<number | null>(null);
  const [q2, setQ2] = useState<string[]>([]);
  const [q3, setQ3] = useState<number | null>(null);
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState<Record<string, number | null>>({
    dominio: null, claridad: null, adaptacion: null, retroalimentacion: null, presencia: null,
  });
  const [q6, setQ6] = useState('');
  const [q7, setQ7] = useState('');
  const [q8, setQ8] = useState<number | null>(null);
  const [q9, setQ9] = useState('');
  const [q10, setQ10] = useState('');

  const fullName = [nombres, apellidoPaterno, apellidoMaterno]
    .map(s => s.trim()).filter(Boolean).join(' ');

  useEffect(() => {
    const key = `eval_done_${token}`;
    if (localStorage.getItem(key)) { setAlreadyDone(true); setLoading(false); return; }
    loadEdicion();
  }, []);

  async function loadEdicion() {
    const { data } = await supabase
      .from('evaluaciones_ediciones')
      .select('id, cliente, edicion_num, closed_at')
      .eq('token', token)
      .single();
    setEdicion(data ?? null);
    setLoading(false);
  }

  async function checkDuplicate(): Promise<boolean> {
    if (!fullName || !edicion) return false;
    const { count } = await supabase
      .from('evaluaciones_respuestas')
      .select('*', { count: 'exact', head: true })
      .eq('edicion_id', edicion.id)
      .ilike('participant_name', fullName);
    return (count ?? 0) > 0;
  }

  function toggleQ2(topic: string) {
    setQ2(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!nombres.trim())        errs.push('Escribe tu(s) nombre(s).');
    if (!apellidoPaterno.trim()) errs.push('Escribe tu apellido paterno.');
    if (!apellidoMaterno.trim()) errs.push('Escribe tu apellido materno.');
    if (!q1)  errs.push('P1: Selecciona una opción.');
    if (q2.length === 0) errs.push('P2: Selecciona al menos un tema.');
    if (!q3)  errs.push('P3: Selecciona una opción.');
    Q5_ROWS.forEach(r => { if (!q5[r.key]) errs.push(`P5: Califica "${r.label}".`); });
    if (!q6)  errs.push('P6: Selecciona una opción.');
    if (q8 === null) errs.push('P8: Selecciona un número del 0 al 10.');
    if (!q9)  errs.push('P9: Selecciona una opción.');
    return errs;
  }

  async function submit() {
    const errs = validate();
    if (errs.length) { setErrors(errs); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrors([]);
    setSubmitting(true);

    // Verificar duplicado en BD (funciona desde cualquier dispositivo)
    const isDuplicate = await checkDuplicate();
    if (isDuplicate) {
      setShowDuplicateModal(true);
      setSubmitting(false);
      return;
    }

    const payload = {
      edicion_id:       edicion!.id,
      participant_name: fullName,
      q1_aplicacion:    q1,
      q2_temas:         JSON.stringify(q2),
      q3_roleplay:      q3,
      q4_momento:       q4.trim() || null,
      q5_grid:          q5,
      q6_negocio:       q6,
      q7_diferente:     q7.trim() || null,
      q8_nps:           q8,
      q9_repetir:       q9,
      q10_comentarios:  q10.trim() || null,
    };

    const { error } = await supabase.from('evaluaciones_respuestas').insert(payload);
    if (error) {
      setErrors(['Ocurrió un error al enviar. Intenta de nuevo.']);
      setSubmitting(false);
      return;
    }

    localStorage.setItem(`eval_done_${token}`, '1');
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) return (
    <main className="page dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p className="muted" style={{ color: 'var(--marfil)' }}>Cargando…</p>
    </main>
  );

  if (!edicion) return (
    <main className="page dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <section className="shell" style={{ maxWidth: 500, margin: '0 auto' }}>
        <Header />
        <div className="card">
          <p className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>
            Este enlace no existe o ya no está disponible.
          </p>
        </div>
      </section>
    </main>
  );

  if (edicion.closed_at) return (
    <main className="page dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <section className="shell" style={{ maxWidth: 500, margin: '0 auto' }}>
        <Header />
        <div className="card">
          <p className="brand" style={{ marginBottom: 14 }}>Evaluación cerrada</p>
          <h1 className="headline" style={{ fontSize: 20, marginBottom: 10 }}>{edicion.cliente}</h1>
          <p className="small muted">Esta evaluación ya no está recibiendo respuestas. Gracias por tu interés.</p>
        </div>
      </section>
    </main>
  );

  if (alreadyDone || submitted) return (
    <main className="page dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <section className="shell" style={{ maxWidth: 500, margin: '0 auto' }}>
        <Header />
        <div className="card">
          <p className="brand" style={{ marginBottom: 14 }}>Evaluación completada</p>
          <h1 className="headline" style={{ fontSize: 22, marginBottom: 14 }}>Gracias por tu respuesta</h1>
          <p style={{ lineHeight: 1.75, fontSize: 15, fontFamily: 'Georgia, serif', opacity: .85 }}>
            Tu evaluación para <strong>{edicion.cliente}</strong> ha sido registrada.
            Tus comentarios son valiosos para seguir mejorando el programa.
          </p>
          <div style={{
            marginTop: 24, padding: '16px 20px',
            borderLeft: '2px solid var(--oro)',
            fontFamily: 'Georgia, serif', fontStyle: 'italic',
            fontSize: 14, lineHeight: 1.75, color: 'rgba(26,26,26,.72)',
          }}>
            "La comunicación es la habilidad de liderazgo más poderosa y la menos entrenada."
          </div>
        </div>
      </section>
    </main>
  );

  return (
    <>
      {showDuplicateModal && <DuplicateModal onClose={() => setShowDuplicateModal(false)} />}

      <main className="page">
        <section className="shell" style={{ maxWidth: 720, margin: '0 auto' }}>
          <Header />

          <p className="brand" style={{ marginBottom: 8 }}>Evaluación del programa</p>
          <h1 className="headline" style={{ fontSize: 22, marginBottom: 6 }}>{edicion.cliente}</h1>
          <p className="small" style={{ opacity: .6, marginBottom: 0, lineHeight: 1.7 }}>
            Edición {edicion.edicion_num} · Técnicas de Actuación para Comunicar con Claridad, Seguridad y Credibilidad
          </p>
          <p className="small muted" style={{ marginTop: 8 }}>
            Tiempo estimado: 5 minutos · Todas las respuestas son confidenciales.
          </p>

          {errors.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(122,30,30,.4)', background: 'rgba(122,30,30,.04)', marginTop: 20 }}>
              <p className="small danger" style={{ fontWeight: 600, marginBottom: 8 }}>Por favor corrige lo siguiente:</p>
              {errors.map((e, i) => <p key={i} className="small danger">· {e}</p>)}
            </div>
          )}

          <div className="card" style={{ marginTop: 24 }}>

            {/* ── IDENTIFICACIÓN ── */}
            <p className="section-label" style={{ marginBottom: 16 }}>Datos del participante</p>
            <div className="field">
              <label>Nombre(s) *</label>
              <input
                value={nombres}
                onChange={e => setNombres(e.target.value)}
                placeholder="Ej: María Elena"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Apellido paterno *</label>
                <input
                  value={apellidoPaterno}
                  onChange={e => setApellidoPaterno(e.target.value)}
                  placeholder="Ej: González"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Apellido materno *</label>
                <input
                  value={apellidoMaterno}
                  onChange={e => setApellidoMaterno(e.target.value)}
                  placeholder="Ej: Ramírez"
                />
              </div>
            </div>

            {/* ─── SECCIÓN 1 ─── */}
            <SectionHeader num="1" title="Relevancia del contenido"
              sub="Las siguientes preguntas evalúan qué tan útil fue el programa para tu trabajo." />

            <Q num="P1" text="¿Qué tanto podrías aplicar lo aprendido en tus conversaciones y presentaciones reales?">
              <ScaleInput value={q1} onChange={setQ1} />
            </Q>

            <Q num="P2" text="¿Cuáles fueron los temas más valiosos para ti? (Selecciona todos los que apliquen)">
              <div style={{ marginTop: 8 }}>
                {Q2_TOPICS.map(topic => (
                  <label key={topic} className="check">
                    <input type="checkbox" checked={q2.includes(topic)} onChange={() => toggleQ2(topic)} />
                    <span style={{ fontSize: 14 }}>{topic}</span>
                  </label>
                ))}
              </div>
            </Q>

            <Q num="P3" text="¿Los ejercicios de roleplay reflejaron situaciones reales de tu trabajo?">
              <ScaleInput value={q3} onChange={setQ3} />
            </Q>

            <Q num="P4" text="¿Hubo un momento específico que cambió tu perspectiva sobre cómo comunicas? Descríbelo." optional>
              <textarea value={q4} onChange={e => setQ4(e.target.value)}
                placeholder="(Opcional) Describe ese momento…" style={{ marginTop: 8 }} />
            </Q>

            {/* ─── SECCIÓN 2 ─── */}
            <SectionHeader num="2" title="Calidad del instructor"
              sub="Evalúa el desempeño del instructor durante el programa." />

            <Q num="P5" text="Califica al instructor en cada uno de los siguientes criterios (1 = deficiente · 5 = excelente):">
              <div style={{ marginTop: 12, overflowX: 'auto' }}>
                <table style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Criterio</th>
                      {[1, 2, 3, 4, 5].map(v => <th key={v} style={{ textAlign: 'center', width: '11%' }}>{v}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Q5_ROWS.map(row => (
                      <tr key={row.key}>
                        <td style={{ fontSize: 13 }}>{row.label}</td>
                        {[1, 2, 3, 4, 5].map(v => (
                          <td key={v} style={{ textAlign: 'center', padding: '12px 6px' }}>
                            <div onClick={() => setQ5(prev => ({ ...prev, [row.key]: v }))} style={{
                              width: 34, height: 34, margin: '0 auto',
                              border: `1.5px solid ${q5[row.key] === v ? 'var(--azul)' : 'rgba(27,42,74,.22)'}`,
                              background: q5[row.key] === v ? 'var(--azul)' : 'transparent',
                              color: q5[row.key] === v ? '#fff' : 'var(--azul)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontFamily: 'Georgia, serif',
                              cursor: 'pointer', transition: 'all .15s', userSelect: 'none',
                            }}>{v}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Q>

            <Q num="P6" text="¿El instructor demostró conocer el contexto y necesidades específicas de tu negocio?">
              <RadioInput options={Q6_OPTIONS} value={q6} onChange={setQ6} />
            </Q>

            <Q num="P7" text="¿Qué podría hacer diferente el instructor para mejorar el programa?" optional>
              <textarea value={q7} onChange={e => setQ7(e.target.value)}
                placeholder="(Opcional) Tu sugerencia…" style={{ marginTop: 8 }} />
            </Q>

            {/* ─── SECCIÓN 3 ─── */}
            <SectionHeader num="3" title="Valor percibido"
              sub="Ayúdanos a entender el impacto general del programa." />

            <Q num="P8" text="¿Qué tan probable es que recomiendes este programa a un colega o conocido? (0 = nada probable · 10 = muy probable)">
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small muted">Nada probable</span>
                  <span className="small muted">Muy probable</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {Array.from({ length: 11 }, (_, i) => {
                    const isSelected = q8 === i;
                    const bg = isSelected ? (i >= 9 ? '#2E7D52' : i >= 7 ? 'var(--oro)' : '#7A1E1E') : 'transparent';
                    const borderCol = isSelected ? bg : (i >= 9 ? 'rgba(46,125,82,.4)' : i >= 7 ? 'rgba(184,150,62,.5)' : 'rgba(122,30,30,.3)');
                    return (
                      <div key={i} onClick={() => setQ8(i)} style={{
                        width: 44, height: 44,
                        border: `1.5px solid ${borderCol}`,
                        background: bg,
                        color: isSelected ? '#fff' : 'var(--carbon)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontFamily: 'Georgia, serif',
                        cursor: 'pointer', transition: 'all .15s', userSelect: 'none', flexShrink: 0,
                      }}>{i}</div>
                    );
                  })}
                </div>
                {q8 !== null && (
                  <p className="small" style={{ marginTop: 8, opacity: .6 }}>
                    {q8 >= 9 ? 'Promotor — ¡gracias por tu confianza!' : q8 >= 7 ? 'Pasivo — valoramos tu opinión.' : 'Detractor — tus comentarios nos ayudan a mejorar.'}
                  </p>
                )}
              </div>
            </Q>

            <Q num="P9" text="Si se ofreciera una segunda edición del programa, ¿participarías?">
              <RadioInput options={Q9_OPTIONS} value={q9} onChange={setQ9} />
            </Q>

            <Q num="P10" text="¿Hay algo más que quieras compartir sobre tu experiencia?" optional>
              <textarea value={q10} onChange={e => setQ10(e.target.value)}
                placeholder="(Opcional) Comentarios adicionales…" style={{ marginTop: 8 }} />
            </Q>

            <div style={{ borderTop: '1px solid var(--borde)', paddingTop: 24, marginTop: 8 }}>
              <p className="small muted" style={{ marginBottom: 16 }}>
                Al enviar confirmas que tus respuestas son honestas y que solo estás respondiendo una vez.
              </p>
              <div className="nav">
                <button onClick={submit} disabled={submitting}>
                  {submitting ? 'Verificando…' : 'Enviar evaluación'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
