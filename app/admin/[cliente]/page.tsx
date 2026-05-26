'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { Field } from '@/components/Input';
import { supabase, siteUrl } from '@/lib/supabase';
import { slugify, todayISO, csv } from '@/lib/utils';

type Cliente  = { id: string; name: string; slug: string };
type Mission  = { id: string; day_number: number; title: string; slug: string; publish_date: string; tip: string; question: string; open_field: boolean };
type Student  = { id: string; name: string; email: string; phone: string; group_name: string; slug: string };

export default function AdminCliente() {
  const params      = useParams();
  const clienteSlug = params.cliente as string;

  const [cliente,   setCliente]   = useState<Cliente | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [missions,  setMissions]  = useState<Mission[]>([]);
  const [students,  setStudents]  = useState<Student[]>([]);
  const [responses,  setResponses]  = useState<any[]>([]);
  const [respCounts, setRespCounts] = useState<Record<string, number>>({});
  const [saving,    setSaving]    = useState(false);
  const [editing,     setEditing]     = useState<Mission | null>(null);
  const [editOptions, setEditOptions] = useState('');
  const [savingEdit,  setSavingEdit]  = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  const [mission, setMission] = useState({
    day_number:   1,
    title:        '',
    publish_date: todayISO(),
    tip:          '',
    question:     '',
    options:      '',
    open_field:   true,
  });

  const [student, setStudent] = useState({
    name: '', email: '', phone: '', group_name: 'Grupo 1',
  });

  useEffect(() => { init(); }, [clienteSlug]);
  useEffect(() => {
    if (editing) editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing]);

  async function init() {
    const c = await supabase
      .from('clientes')
      .select('*')
      .eq('slug', clienteSlug)
      .single();
    if (!c.data) { setNotFound(true); return; }
    setCliente(c.data);
    await loadData(c.data.id);
  }

  async function loadData(clienteId: string) {
    const [m, s, r] = await Promise.all([
      supabase.from('misiones').select('*').eq('cliente_id', clienteId).order('publish_date', { ascending: false }),
      supabase.from('alumnos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
      supabase.from('respuestas_detalle').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
    ]);
    setMissions(m.data || []);
    setStudents(s.data || []);
    // Contar misiones completadas por alumno
    if (s.data && s.data.length > 0) {
      const ids = s.data.map(st => st.id);
      const { data: counts } = await supabase
        .from('respuestas').select('student_id').in('student_id', ids);
      const map: Record<string, number> = {};
      (counts || []).forEach(c => { if (c.student_id) map[c.student_id] = (map[c.student_id] || 0) + 1; });
      setRespCounts(map);
    }
    setResponses(r.data || []);
  }

  async function saveMission() {
    if (!cliente) return;
    setSaving(true);
    const slug = slugify(mission.title);
    const { options, ...missionData } = mission;
    const ins  = await supabase
      .from('misiones')
      .insert({ ...missionData, slug, cliente_id: cliente.id })
      .select()
      .single();
    if (ins.error) { alert(ins.error.message); setSaving(false); return; }
    const opts = options
      .split('\n').filter(Boolean)
      .map((label, i) => ({ mission_id: ins.data.id, label, position: i + 1 }));
    if (opts.length) await supabase.from('opciones_mision').insert(opts);
    await loadData(cliente.id);
    setSaving(false);
    setMission({ day_number: missions.length + 2, title: '', publish_date: todayISO(), tip: '', question: '', options: '', open_field: true });
    alert('Misión publicada correctamente.');
  }

  async function saveStudent() {
    if (!cliente) return;
    const slug = slugify(student.name);
    const ins  = await supabase
      .from('alumnos')
      .insert({ ...student, slug, cliente_id: cliente.id })
      .select()
      .single();
    if (ins.error) { alert(ins.error.message); return; }
    await loadData(cliente.id);
    setStudent({ name: '', email: '', phone: '', group_name: 'Grupo 1' });
  }

  async function startEditing(m: Mission) {
    const o = await supabase
      .from('opciones_mision')
      .select('label')
      .eq('mission_id', m.id)
      .order('position');
    setEditOptions((o.data || []).map(x => x.label).join('\n'));
    setEditing(m);
  }

  async function updateMission() {
    if (!editing || !cliente) return;
    setSavingEdit(true);
    const slug = slugify(editing.title);
    const { error } = await supabase
      .from('misiones')
      .update({
        day_number:   editing.day_number,
        title:        editing.title,
        slug,
        publish_date: editing.publish_date,
        tip:          editing.tip,
        question:     editing.question,
        open_field:   editing.open_field,
      })
      .eq('id', editing.id);
    if (error) { alert(error.message); setSavingEdit(false); return; }
    // Reemplazar opciones
    await supabase.from('opciones_mision').delete().eq('mission_id', editing.id);
    const opts = editOptions.split('\n').filter(Boolean)
      .map((label, i) => ({ mission_id: editing.id, label, position: i + 1 }));
    if (opts.length) await supabase.from('opciones_mision').insert(opts);
    await loadData(cliente.id);
    setSavingEdit(false);
    setEditing(null);
  }

  async function deleteResponse(id: string) {
    if (!confirm('¿Eliminar esta observación?')) return;
    await supabase.from('respuestas_opciones').delete().eq('response_id', id);
    await supabase.from('respuestas').delete().eq('id', id);
    if (cliente) await loadData(cliente.id);
  }

  function exportCsv() {
    const blob = new Blob([csv(responses)], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `respuestas-${clienteSlug}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── pantallas de estado ── */
  if (notFound) return (
    <main className="page">
      <section className="shell">
        <Header />
        <div className="card">
          <p className="muted">Cliente no encontrado.</p>
          <div className="nav"><a className="btn" href="/admin">← Volver</a></div>
        </div>
      </section>
    </main>
  );

  if (!cliente) return (
    <main className="page">
      <section className="shell">
        <Header />
        <p className="muted" style={{ marginTop: 40 }}>Cargando…</p>
      </section>
    </main>
  );

  const active    = missions.find(m => m.publish_date === todayISO()) || missions[0];
  const dailyLink = active ? `${siteUrl}/mision/${clienteSlug}/${active.slug}` : '';
  const waMsg     = active
    ? encodeURIComponent(
        `Comunicación Alto Valor — ${cliente.name}\n\nTu misión de hoy está lista.\n\nDía ${active.day_number} · ${active.title}\n\n${dailyLink}`
      )
    : '';

  return (
    <main className="page">
      <section className="shell">
        <Header />

        {/* Cabecera con navegación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
          <a
            href="/admin"
            className="btn secondary"
            style={{ padding: '6px 14px', fontSize: 10, letterSpacing: '.12em' }}
          >
            ← Clientes
          </a>
          <h1 className="headline" style={{ fontSize: 28 }}>{cliente.name}</h1>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>Panel de gestión del programa</p>

        {/* Estadísticas */}
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{missions.length}</div>
            <div className="stat-label">Misiones</div>
          </div>
          <div className="stat">
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Alumnos</div>
          </div>
          <div className="stat">
            <div className="stat-value">{responses.length}</div>
            <div className="stat-label">Respuestas</div>
          </div>
        </div>

        <div className="divider" />

        {/* ── MISIONES ── */}
        <p className="section-label">Misiones</p>

        <div className="grid">
          <div className="card">
            <h2 className="headline" style={{ fontSize: 15, marginBottom: 20 }}>Nueva misión</h2>

            <Field label="Día">
              <input type="number" min={1} value={mission.day_number}
                onChange={e => setMission({ ...mission, day_number: +e.target.value })} />
            </Field>
            <Field label="Fecha de publicación">
              <input type="date" value={mission.publish_date}
                onChange={e => setMission({ ...mission, publish_date: e.target.value })} />
            </Field>
            <Field label="Título">
              <input value={mission.title}
                onChange={e => setMission({ ...mission, title: e.target.value })} />
            </Field>
            <Field label="Tip del día">
              <textarea value={mission.tip}
                onChange={e => setMission({ ...mission, tip: e.target.value })} />
            </Field>
            <Field label="Pregunta de observación">
              <input value={mission.question}
                onChange={e => setMission({ ...mission, question: e.target.value })} />
            </Field>
            <Field label="Opciones de respuesta — una por línea">
              <textarea value={mission.options} style={{ minHeight: 100 }}
                onChange={e => setMission({ ...mission, options: e.target.value })} />
            </Field>

            <label className="check" style={{ marginTop: 6, marginBottom: 4 }}>
              <input type="checkbox" checked={mission.open_field}
                onChange={e => setMission({ ...mission, open_field: e.target.checked })} />
              <span>Incluir campo de respuesta libre</span>
            </label>

            <div className="nav">
              <button onClick={saveMission} disabled={saving || !mission.title.trim()}>
                {saving ? 'Publicando…' : 'Publicar misión'}
              </button>
            </div>
          </div>

          <div className="card dark">
            <h2 className="headline" style={{ fontSize: 15, marginBottom: 20 }}>Enlace del día</h2>
            {active ? (
              <>
                <p className="gold" style={{ letterSpacing: '.10em', fontSize: 12, marginBottom: 8 }}>
                  DÍA {active.day_number}
                </p>
                <p style={{ fontSize: 17, marginBottom: 18, lineHeight: 1.35 }}>{active.title}</p>
                <p className="small muted"
                  style={{ wordBreak: 'break-all', marginBottom: 22, fontFamily: 'Georgia' }}>
                  {dailyLink}
                </p>
                <div className="nav" style={{ marginTop: 0 }}>
                  <button onClick={() => navigator.clipboard.writeText(dailyLink)}>Copiar enlace</button>
                  <a className="btn secondary"
                    href={`https://wa.me/?text=${waMsg}`}
                    target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </div>
              </>
            ) : (
              <p className="muted">No hay misiones. Crea una arriba.</p>
            )}
          </div>
        </div>

        {missions.length > 0 && (
          <div className="card">
            <h2 className="headline" style={{ fontSize: 14, marginBottom: 18 }}>Historial</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Día</th><th>Título</th><th>Ejercicio</th><th>Fecha</th><th></th></tr>
                </thead>
                <tbody>
                  {missions.map(m => {
                    const mLink = `${siteUrl}/mision/${clienteSlug}/${m.slug}`;
                    const mWa   = encodeURIComponent(
                      `Comunicación Alto Valor — ${cliente.name}\n\nTu misión de hoy está lista.\n\nDía ${m.day_number} · ${m.title}\n\n${mLink}`
                    );
                    return (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--oro)', fontFamily: 'Georgia', whiteSpace: 'nowrap' }}>{m.day_number}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {m.title}
                        {m.publish_date === todayISO() && (
                          <span className="small" style={{ marginLeft: 10, color: 'var(--oro)', fontSize: 10, letterSpacing: '.10em' }}>
                            HOY
                          </span>
                        )}
                      </td>
                      <td className="muted small" style={{ maxWidth: 320, lineHeight: 1.5 }}>
                        {m.tip}
                      </td>
                      <td className="muted small" style={{ whiteSpace: 'nowrap' }}>{m.publish_date}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigator.clipboard.writeText(mLink)}>
                            Copiar
                          </button>
                          <a className="btn secondary"
                            href={`https://wa.me/?text=${mWa}`}
                            target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                          <button
                            className="btn secondary"
                            onClick={() => startEditing(m)}>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FORMULARIO DE EDICIÓN ── */}
        {editing && (
          <div ref={editRef} className="card" style={{ borderColor: 'var(--oro)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="headline" style={{ fontSize: 15 }}>Editando — Día {editing.day_number}</h2>
              <button className="btn secondary" style={{ padding: '5px 12px', fontSize: 10 }} onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>

            <Field label="Día">
              <input type="number" min={1} value={editing.day_number}
                onChange={e => setEditing({ ...editing, day_number: +e.target.value })} />
            </Field>
            <Field label="Fecha de publicación">
              <input type="date" value={editing.publish_date}
                onChange={e => setEditing({ ...editing, publish_date: e.target.value })} />
            </Field>
            <Field label="Título">
              <input value={editing.title}
                onChange={e => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="Tip del día">
              <textarea value={editing.tip}
                onChange={e => setEditing({ ...editing, tip: e.target.value })} />
            </Field>
            <Field label="Pregunta de observación">
              <input value={editing.question}
                onChange={e => setEditing({ ...editing, question: e.target.value })} />
            </Field>
            <Field label="Opciones de respuesta — una por línea">
              <textarea value={editOptions} style={{ minHeight: 100 }}
                onChange={e => setEditOptions(e.target.value)} />
            </Field>

            <label className="check" style={{ marginTop: 6, marginBottom: 4 }}>
              <input type="checkbox" checked={editing.open_field}
                onChange={e => setEditing({ ...editing, open_field: e.target.checked })} />
              <span>Incluir campo de respuesta libre</span>
            </label>

            <div className="nav">
              <button onClick={updateMission} disabled={savingEdit || !editing.title.trim()}>
                {savingEdit ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        <div className="divider" />

        {/* ── ALUMNOS ── */}
        <p className="section-label">Alumnos</p>

        <div className="grid">
          <div className="card">
            <h2 className="headline" style={{ fontSize: 15, marginBottom: 20 }}>Nuevo alumno</h2>
            <Field label="Nombre completo">
              <input value={student.name} onChange={e => setStudent({ ...student, name: e.target.value })} />
            </Field>
            <Field label="Correo electrónico">
              <input type="email" value={student.email} onChange={e => setStudent({ ...student, email: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={student.phone} onChange={e => setStudent({ ...student, phone: e.target.value })} />
            </Field>
            <Field label="Grupo">
              <input value={student.group_name} onChange={e => setStudent({ ...student, group_name: e.target.value })} />
            </Field>
            <div className="nav">
              <button onClick={saveStudent} disabled={!student.name.trim()}>Registrar alumno</button>
            </div>
          </div>

          <div className="card">
            <h2 className="headline" style={{ fontSize: 15, marginBottom: 18 }}>
              {students.length > 0
                ? `${students.length} Alumno${students.length !== 1 ? 's' : ''}`
                : 'Alumnos'}
            </h2>
            {students.length === 0 ? (
              <p className="muted small">No hay alumnos registrados.</p>
            ) : (
              <table>
                <thead><tr><th>Nombre</th><th>Grupo</th><th></th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td>
                        {s.name}
                        {s.email && <><br /><span className="small muted">{s.email}</span></>}
                      </td>
                      <td className="muted small">{s.group_name}</td>
                      <td>
                        <button
                          disabled={!active}
                          title={active ? 'Copiar enlace personalizado' : 'Sin misión activa'}
                          onClick={() => navigator.clipboard.writeText(
                            `${dailyLink}?alumno=${s.slug}`
                          )}>
                          Copiar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── RANKING ── */}
        {students.length > 1 && (
          <div className="card" style={{ marginTop: 0 }}>
            <h2 className="headline" style={{ fontSize: 14, marginBottom: 18 }}>Ranking del grupo</h2>
            <table>
              <thead>
                <tr><th>#</th><th>Alumno</th><th>Grupo</th><th>Misiones</th></tr>
              </thead>
              <tbody>
                {[...students]
                  .sort((a, b) => (respCounts[b.id] || 0) - (respCounts[a.id] || 0))
                  .map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--oro)', fontFamily: 'Georgia', whiteSpace: 'nowrap' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td>{s.name}</td>
                      <td className="muted small">{s.group_name}</td>
                      <td style={{ fontFamily: 'Georgia', color: 'var(--azul)' }}>
                        {respCounts[s.id] || 0}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="divider" />

        {/* ── RESPUESTAS ── */}
        <p className="section-label">Respuestas</p>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <h2 className="headline" style={{ fontSize: 14 }}>Registro de observaciones</h2>
            <button onClick={exportCsv} disabled={responses.length === 0}>Exportar CSV</button>
          </div>
          {responses.length === 0 ? (
            <p className="muted small">No hay respuestas registradas.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Alumno</th><th>Grupo</th><th>Misión</th><th>Opciones</th><th>Texto</th><th></th></tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td>{r.alumno}</td>
                      <td className="small muted">{r.grupo || '—'}</td>
                      <td className="small">{r.mision}</td>
                      <td className="small muted">{r.opciones}</td>
                      <td className="small">{r.open_answer}</td>
                      <td>
                        <button
                          className="btn secondary"
                          style={{ padding: '5px 10px', fontSize: 10, borderColor: 'rgba(122,30,30,.4)', color: '#7A1E1E' }}
                          onClick={() => deleteResponse(r.id)}>
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
