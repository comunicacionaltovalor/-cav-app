'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

type Mission = {
  id: string; day_number: number; title: string;
  tip: string; question: string; open_field: boolean;
};
type Option = { id: string; label: string };

function MissionContent() {
  const params      = useParams();
  const clienteSlug = params.cliente as string;
  const slug        = params.slug as string;
  const qs          = useSearchParams();
  const alumnoSlug  = qs.get('alumno');

  const [mission,   setMission]   = useState<Mission | null>(null);
  const [options,   setOptions]   = useState<Option[]>([]);
  const [student,   setStudent]   = useState<any>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [selected,  setSelected]  = useState<string[]>([]);
  const [answer,    setAnswer]    = useState('');
  const [name,      setName]      = useState('');
  const [done,      setDone]      = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [notFound,  setNotFound]  = useState(false);
  const [sending,   setSending]   = useState(false);
  const [rankInfo,  setRankInfo]  = useState<{ position: number; total: number } | null>(null);

  useEffect(() => { load(); }, [slug, clienteSlug, alumnoSlug]);

  async function load() {
    // Buscar el cliente
    const c = await supabase
      .from('clientes')
      .select('id')
      .eq('slug', clienteSlug)
      .maybeSingle();
    if (!c.data) { setNotFound(true); return; }
    const clienteId = c.data.id;
    setClienteId(clienteId);

    // Buscar misión por slug
    let m = await supabase
      .from('misiones')
      .select('*')
      .eq('slug', slug)
      .eq('cliente_id', clienteId)
      .maybeSingle();

    // Si no encuentra por slug, intenta por fecha
    if (!m.data) {
      m = await supabase
        .from('misiones')
        .select('*')
        .eq('publish_date', slug)
        .eq('cliente_id', clienteId)
        .maybeSingle();
    }

    if (!m.data) { setNotFound(true); return; }
    setMission(m.data);

    // Opciones de la misión
    const o = await supabase
      .from('opciones_mision')
      .select('*')
      .eq('mission_id', m.data.id)
      .order('position');
    setOptions(o.data || []);

    // Alumno y detección de duplicado
    if (alumnoSlug) {
      const s = await supabase
        .from('alumnos')
        .select('*')
        .eq('slug', alumnoSlug)
        .eq('cliente_id', clienteId)
        .maybeSingle();
      setStudent(s.data);
      if (s.data) {
        const r = await supabase
          .from('respuestas')
          .select('id')
          .eq('mission_id', m.data.id)
          .eq('student_id', s.data.id)
          .maybeSingle();
        setDuplicate(!!r.data);
      }
    }
  }

  async function calcRanking(studentId: string, groupName: string, cId: string) {
    const { data: groupStudents } = await supabase
      .from('alumnos')
      .select('id')
      .eq('group_name', groupName)
      .eq('cliente_id', cId);
    if (!groupStudents || groupStudents.length < 2) return;
    const ids = groupStudents.map(s => s.id);
    const { data: resps } = await supabase
      .from('respuestas')
      .select('student_id')
      .in('student_id', ids);
    const counts: Record<string, number> = {};
    ids.forEach(id => { counts[id] = 0; });
    (resps || []).forEach(r => { if (r.student_id) counts[r.student_id]++; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const position = sorted.findIndex(([id]) => id === studentId) + 1;
    setRankInfo({ position, total: sorted.length });
  }

  function toggle(id: string) {
    setSelected(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  async function submit() {
    if (!mission) return;
    if (alumnoSlug && !student) {
      alert('No se encontró el alumno. Revisa el enlace.');
      return;
    }
    setSending(true);
    const r = await supabase
      .from('respuestas')
      .insert({ mission_id: mission.id, student_id: student?.id || null, open_answer: answer, respondent_name: name.trim() || null })
      .select()
      .single();
    if (r.error) { alert(r.error.message); setSending(false); return; }
    if (selected.length) {
      await supabase
        .from('respuestas_opciones')
        .insert(selected.map(option_id => ({ response_id: r.data.id, option_id })));
    }
    setSending(false);
    setDone(true);
    if (student?.id && student?.group_name && clienteId) {
      calcRanking(student.id, student.group_name, clienteId);
    }
  }

  /* ── pantallas de estado ── */
  if (done) return (
    <main className="page dark" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <section className="shell" style={{ maxWidth: 580 }}>
        <Header />
        <div className="card">
          <p className="brand" style={{ marginBottom: 18 }}>Observación registrada</p>
          <h1 className="headline" style={{ fontSize: 28, marginBottom: 16 }}>Gracias.</h1>
          <p style={{ lineHeight: 1.75, opacity: .8 }}>
            Tu observación ha sido registrada. Mañana recibirás una nueva misión.
          </p>

          {rankInfo && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(184,150,62,.3)' }}>
              <p className="brand" style={{ marginBottom: 10 }}>Tu posición en el grupo</p>
              {rankInfo.position === 1 ? (
                <p style={{ fontSize: 18, lineHeight: 1.6, opacity: .9 }}>
                  Lideras tu grupo. <span style={{ color: 'var(--oro)' }}>#1</span> de {rankInfo.total} participantes.
                </p>
              ) : rankInfo.position <= 3 ? (
                <p style={{ fontSize: 18, lineHeight: 1.6, opacity: .9 }}>
                  Estás entre los 3 más constantes.<br />
                  Posición <span style={{ color: 'var(--oro)' }}>#{rankInfo.position}</span> de {rankInfo.total}.
                </p>
              ) : (
                <p style={{ fontSize: 18, lineHeight: 1.6, opacity: .9 }}>
                  Vas en el puesto <span style={{ color: 'var(--oro)' }}>#{rankInfo.position}</span> de {rankInfo.total} en tu grupo.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );

  if (duplicate) return (
    <main className="page">
      <section className="shell" style={{ maxWidth: 580 }}>
        <Header />
        <div className="card success">
          <p className="brand" style={{ marginBottom: 16, color: 'var(--azul)' }}>Ya registrada</p>
          <h1 className="headline" style={{ fontSize: 22, marginBottom: 14 }}>
            Esta misión ya fue completada.
          </h1>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Regresa mañana para tu próxima misión.
          </p>
        </div>
      </section>
    </main>
  );

  if (notFound) return (
    <main className="page">
      <section className="shell" style={{ maxWidth: 580 }}>
        <Header />
        <div className="card">
          <p className="muted">Esta misión no está disponible o el enlace es incorrecto.</p>
        </div>
      </section>
    </main>
  );

  if (!mission) return (
    <main className="page">
      <section className="shell" style={{ maxWidth: 580 }}>
        <Header />
        <p className="muted" style={{ marginTop: 40 }}>Cargando misión…</p>
      </section>
    </main>
  );

  return (
    <main className="page">
      <section className="shell" style={{ maxWidth: 680 }}>
        <Header />

        {/* Bloque de información */}
        <div className="card dark">
          <p className="brand" style={{ marginBottom: 14 }}>Día {mission.day_number}</p>
          <h1 className="headline" style={{ fontSize: 'clamp(22px, 4vw, 30px)', marginBottom: 24 }}>
            {mission.title}
          </h1>
          <div className="tip-block">
            <p className="tip-text">{mission.tip}</p>
          </div>
        </div>

        {/* Bloque de respuesta */}
        <div className="card">
          <h2 className="headline" style={{ fontSize: 14, marginBottom: 14 }}>Observación</h2>

          {!student && (
            <div style={{ marginBottom: 24 }}>
              <p className="small" style={{
                marginBottom: 8, letterSpacing: '.12em',
                textTransform: 'uppercase', fontSize: 10.5, opacity: .72,
                fontFamily: "'Gill Sans MT','Trebuchet MS',sans-serif",
              }}>
                Nombre y apellido
              </p>
              <input
                placeholder="Tu nombre completo"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <p style={{ marginBottom: 22, lineHeight: 1.72, fontSize: 16 }}>{mission.question}</p>

          {options.map(o => (
            <label className="check" key={o.id}>
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
              />
              <span style={{ lineHeight: 1.55 }}>{o.label}</span>
            </label>
          ))}

          {mission.open_field && (
            <div style={{ marginTop: 22 }}>
              <p className="small" style={{
                marginBottom: 8, letterSpacing: '.12em',
                textTransform: 'uppercase', fontSize: 10.5, opacity: .72,
                fontFamily: "'Gill Sans MT','Trebuchet MS',sans-serif",
              }}>
                Escribe en una frase qué notaste
              </p>
              <textarea
                placeholder="Tu observación…"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
              />
            </div>
          )}

          <div className="nav">
            <button onClick={submit} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar observación'}
            </button>
          </div>
        </div>

        {student && (
          <p className="small muted" style={{ textAlign: 'center', marginTop: 4 }}>
            {student.name}
          </p>
        )}
      </section>
    </main>
  );
}

function Loading() {
  return (
    <main className="page">
      <section className="shell" style={{ maxWidth: 680 }}>
        <Header />
        <p className="muted" style={{ marginTop: 40 }}>Cargando misión…</p>
      </section>
    </main>
  );
}

export default function MissionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MissionContent />
    </Suspense>
  );
}
