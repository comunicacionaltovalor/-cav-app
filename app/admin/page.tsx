'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Field } from '@/components/Input';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

type Cliente = { id: string; name: string; slug: string; created_at: string };

export default function AdminHome() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [name, setName]         = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const c = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: true });
    setClientes(c.data || []);
  }

  async function saveCliente() {
    if (!name.trim()) return;
    setSaving(true);
    const slug = slugify(name);
    const ins  = await supabase
      .from('clientes')
      .insert({ name: name.toUpperCase().trim(), slug })
      .select()
      .single();
    if (ins.error) { alert(ins.error.message); setSaving(false); return; }
    setSaving(false);
    setName('');
    await load();
  }

  return (
    <main className="page">
      <section className="shell">
        <Header />

        <h1 className="headline" style={{ fontSize: 28, marginBottom: 4 }}>Clientes</h1>
        <p className="muted small" style={{ marginBottom: 32 }}>
          Selecciona un cliente para administrar su programa
        </p>

        <div className="grid">
          {clientes.map(c => (
            <div key={c.id} className="card" style={{ margin: 0 }}>
              <p className="brand" style={{ marginBottom: 12 }}>Programa activo</p>
              <h2 className="headline" style={{ fontSize: 26, marginBottom: 10 }}>{c.name}</h2>
              <p className="small muted" style={{ marginBottom: 20 }}>/{c.slug}</p>
              <div className="nav" style={{ marginTop: 0 }}>
                <a className="btn" href={`/admin/${c.slug}`}>Misiones</a>
                <a className="btn secondary" href="/evaluacion/admin">Evaluación</a>
              </div>
            </div>
          ))}

          {/* Tarjeta nuevo cliente */}
          <div className="card" style={{ margin: 0 }}>
            <p className="brand" style={{ marginBottom: 14 }}>Nuevo cliente</p>
            <Field label="Nombre de la empresa">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: SISU, Google, Banamex"
                onKeyDown={e => e.key === 'Enter' && saveCliente()}
              />
            </Field>
            <div className="nav" style={{ marginTop: 8 }}>
              <button onClick={saveCliente} disabled={saving || !name.trim()}>
                {saving ? 'Creando…' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
