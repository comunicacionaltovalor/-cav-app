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
  response_count?: number;
};

function checkAuth(): boolean {
  try {
    const raw = localStorage.getItem('eval_auth');
    if (!raw) return false;
    const { ts, role } = JSON.parse(raw);
    return role === 'rrhh' && Date.now() - ts < 8 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function RRHHDashboard() {
  const [ready, setReady] = useState(false);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);

  useEffect(() => {
    if (!checkAuth()) { window.location.href = '/evaluacion'; return; }
    setReady(true);
    loadEdiciones();
  }, []);

  async function loadEdiciones() {
    const { data } = await supabase
      .from('evaluaciones_ediciones')
      .select('*')
      .eq('rrhh_enabled', true)
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
          <button className="btn secondary" style={{ fontSize: 10, marginTop: 2 }} onClick={logout}>
            Cerrar sesión
          </button>
        </div>

        <p className="brand" style={{ marginBottom: 6 }}>Recursos Humanos</p>
        <h1 className="headline" style={{ fontSize: 26, marginBottom: 8 }}>Resultados de evaluación</h1>
        <p className="small muted">
          Técnicas de Actuación para Comunicar con Claridad, Seguridad y Credibilidad
        </p>

        <div className="divider" />

        {ediciones.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>
              No hay evaluaciones disponibles aún. El instructor las habilitará cuando estén listas.
            </p>
          </div>
        ) : (
          ediciones.map(e => {
            const isClosed = !!e.closed_at;
            return (
              <div key={e.id} className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <p className="brand" style={{ marginBottom: 8, color: isClosed ? 'rgba(27,42,74,.4)' : 'var(--oro)' }}>
                      {isClosed ? 'Cerrada' : 'Activa'}
                    </p>
                    <h2 className="headline" style={{ fontSize: 18 }}>
                      {e.cliente} · Edición {e.edicion_num}
                    </h2>
                    <p className="small muted" style={{ marginTop: 6 }}>
                      {new Date(e.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 36, fontFamily: 'Georgia, serif', color: 'var(--azul)', lineHeight: 1 }}>
                      {e.response_count}
                    </p>
                    <p className="small muted" style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 4 }}>
                      respuestas
                    </p>
                  </div>
                </div>
                <div className="nav" style={{ marginTop: 0 }}>
                  <a className="btn" href={`/evaluacion/admin/${e.token}`}>
                    Ver resultados
                  </a>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
