'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { supabase, siteUrl } from '@/lib/supabase';

type Edicion = {
  id: string;
  cliente: string;
  edicion_num: number;
  token: string;
  created_at: string;
  closed_at: string | null;
  expected_count: number;
  rrhh_enabled: boolean;
  response_count?: number;
};

function genToken(): string {
  const a = Math.random().toString(36).substring(2, 8);
  const b = Math.random().toString(36).substring(2, 8);
  return a + b;
}

function checkAuth(): boolean {
  try {
    const raw = localStorage.getItem('eval_auth');
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < 8 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function EvaluacionAdmin() {
  const [ready, setReady] = useState(false);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [cliente, setCliente] = useState('');
  const [edicionNum, setEdicionNum] = useState(1);
  const [expected, setExpected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!checkAuth()) { window.location.href = '/evaluacion'; return; }
    setReady(true);
    loadEdiciones();
  }, []);

  async function loadEdiciones() {
    const { data } = await supabase
      .from('evaluaciones_ediciones')
      .select('*')
      .order('created_at', { ascending: false });
    if (!data) return;

    const withCounts = await Promise.all(data.map(async (e) => {
      const { count } = await supabase
        .from('evaluaciones_respuestas')
        .select('*', { count: 'exact', head: true })
        .eq('edicion_id', e.id);
      return { ...e, response_count: count ?? 0 };
    }));
    setEdiciones(withCounts);
  }

  async function createEdicion() {
    if (!cliente.trim()) return;
    setSaving(true);
    const token = genToken();
    const { error } = await supabase
      .from('evaluaciones_ediciones')
      .insert({ cliente: cliente.trim(), edicion_num: edicionNum, token, expected_count: expected });
    if (error) { alert(error.message); setSaving(false); return; }
    await loadEdiciones();
    setCliente('');
    setEdicionNum(edicionNum + 1);
    setExpected(0);
    setSaving(false);
  }

  async function closeEdicion(id: string) {
    if (!confirm('¿Cerrar esta edición? Ya no se podrán agregar respuestas.')) return;
    await supabase
      .from('evaluaciones_ediciones')
      .update({ closed_at: new Date().toISOString() })
      .eq('id', id);
    await loadEdiciones();
  }

  async function reopenEdicion(id: string) {
    await supabase
      .from('evaluaciones_ediciones')
      .update({ closed_at: null })
      .eq('id', id);
    await loadEdiciones();
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${siteUrl}/evaluacion/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 1800);
  }

  async function deleteEdicion(id: string, cliente: string) {
    if (!confirm(`¿Eliminar la edición de "${cliente}"? Se borrarán todas las respuestas. Esta acción no se puede deshacer.`)) return;
    await supabase.from('evaluaciones_ediciones').delete().eq('id', id);
    await loadEdiciones();
  }

  async function toggleRRHH(id: string, current: boolean) {
    await supabase
      .from('evaluaciones_ediciones')
      .update({ rrhh_enabled: !current })
      .eq('id', id);
    await loadEdiciones();
  }

  function logout() {
    localStorage.removeItem('eval_auth');
    window.location.href = '/evaluacion';
  }

  if (!ready) return null;

  return (
    <main className="page">
      <section className="shell">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Header />
          <button
            className="btn secondary"
            style={{ fontSize: 10, marginTop: 2 }}
            onClick={logout}>
            Cerrar sesión
          </button>
        </div>

        <p className="brand" style={{ marginBottom: 6 }}>Módulo de evaluación</p>
        <h1 className="headline" style={{ fontSize: 26, marginBottom: 8 }}>Panel de instructor</h1>
        <p className="small muted" style={{ marginBottom: 0, lineHeight: 1.7 }}>
          Técnicas de Actuación para Comunicar con Claridad, Seguridad y Credibilidad
        </p>

        <div className="divider" />

        <div className="grid">
          {/* Formulario nueva edición */}
          <div className="card">
            <p className="section-label" style={{ marginBottom: 16 }}>Nueva edición</p>
            <div className="field">
              <label>Nombre del cliente</label>
              <input
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createEdicion()}
                placeholder="Ej: Global Intermediario de Reaseguro"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Número de edición</label>
                <input
                  type="number" min={1} value={edicionNum}
                  onChange={e => setEdicionNum(+e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Participantes esperados</label>
                <input
                  type="number" min={0} value={expected}
                  onChange={e => setExpected(+e.target.value)} />
              </div>
            </div>
            <div className="nav" style={{ marginTop: 20 }}>
              <button onClick={createEdicion} disabled={saving || !cliente.trim()}>
                {saving ? 'Creando…' : 'Crear edición'}
              </button>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="card dark">
            <p className="section-label" style={{ marginBottom: 14 }}>Cómo funciona</p>
            <p className="small" style={{ lineHeight: 1.9, opacity: .84 }}>
              <strong>1.</strong> Crea una edición con el nombre del cliente.<br />
              <strong>2.</strong> Copia el enlace único y compártelo con los participantes (WhatsApp, correo).<br />
              <strong>3.</strong> Cada participante responde una sola vez por nombre.<br />
              <strong>4.</strong> Cierra la edición al concluir la encuesta.<br />
              <strong>5.</strong> Descarga el reporte en PDF desde "Ver resultados".
            </p>
          </div>
        </div>

        {ediciones.length > 0 && (
          <>
            <div className="divider" />
            <p className="section-label" style={{ marginBottom: 18 }}>Ediciones</p>

            {ediciones.map(e => {
              const link = `${siteUrl}/evaluacion/${e.token}`;
              const isClosed = !!e.closed_at;
              const pct = e.expected_count > 0
                ? Math.min(100, Math.round((e.response_count! / e.expected_count) * 100))
                : null;

              return (
                <div
                  key={e.id}
                  className="card"
                  style={{
                    borderColor: isClosed ? 'rgba(27,42,74,.12)' : 'var(--borde)',
                    opacity: isClosed ? .78 : 1,
                    marginBottom: 16,
                    borderLeftWidth: e.rrhh_enabled ? 3 : 1,
                    borderLeftColor: e.rrhh_enabled ? 'var(--oro)' : undefined,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div>
                      <p className="brand" style={{
                        marginBottom: 8,
                        color: isClosed ? 'rgba(27,42,74,.4)' : 'var(--oro)',
                      }}>
                        {isClosed ? 'Cerrada' : 'Activa'}
                      </p>
                      <h2 className="headline" style={{ fontSize: 18 }}>
                        {e.cliente} · Edición {e.edicion_num}
                      </h2>
                      <p className="small muted" style={{ marginTop: 6 }}>
                        {new Date(e.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                        {isClosed && e.closed_at && (
                          <> · Cerrada {new Date(e.closed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 36, fontFamily: 'Georgia, serif', color: 'var(--azul)', lineHeight: 1 }}>
                        {e.response_count}
                        {e.expected_count > 0 && (
                          <span style={{ fontSize: 16, opacity: .4 }}> / {e.expected_count}</span>
                        )}
                      </p>
                      <p className="small" style={{ opacity: .5, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 4 }}>
                        {pct !== null ? `${pct}% completado` : 'respuestas'}
                      </p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {pct !== null && (
                    <div style={{ height: 3, background: 'rgba(27,42,74,.08)', marginBottom: 16, borderRadius: 0 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--oro)', transition: 'width .4s' }} />
                    </div>
                  )}

                  <p className="small" style={{ opacity: .4, wordBreak: 'break-all', marginBottom: 16, fontFamily: 'monospace', fontSize: 12 }}>
                    {link}
                  </p>

                  <div className="nav" style={{ marginTop: 0 }}>
                    <button onClick={() => copyLink(e.token)}>
                      {copied === e.token ? '✓ Copiado' : 'Copiar enlace'}
                    </button>
                    <a className="btn secondary" href={`/evaluacion/admin/${e.token}`}>
                      Ver resultados
                    </a>
                    <button
                      className="btn secondary"
                      style={{
                        borderColor: e.rrhh_enabled ? 'rgba(46,125,82,.5)' : 'rgba(27,42,74,.25)',
                        color: e.rrhh_enabled ? '#2E7D52' : 'var(--azul)',
                      }}
                      onClick={() => toggleRRHH(e.id, e.rrhh_enabled)}>
                      {e.rrhh_enabled ? '✓ RRHH habilitado' : 'Habilitar para RRHH'}
                    </button>
                    {!isClosed ? (
                      <button
                        className="btn secondary"
                        style={{ borderColor: 'rgba(122,30,30,.35)', color: '#7A1E1E' }}
                        onClick={() => closeEdicion(e.id)}>
                        Cerrar edición
                      </button>
                    ) : (
                      <button
                        className="btn secondary"
                        onClick={() => reopenEdicion(e.id)}>
                        Reabrir
                      </button>
                    )}
                    <button
                      className="btn secondary"
                      style={{ borderColor: 'rgba(122,30,30,.3)', color: '#7A1E1E', opacity: .7 }}
                      onClick={() => deleteEdicion(e.id, e.cliente)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </main>
  );
}
