# Comunicación Alto Valor — MVP

## Instalación
1. Crea un proyecto en Supabase.
2. Ejecuta `supabase/schema.sql` en SQL Editor.
3. Copia `.env.example` a `.env.local` y coloca tus llaves.
4. Instala y corre:

```bash
npm install
npm run dev
```

Admin: http://localhost:3000/admin
Misión: http://localhost:3000/mision/la-pausa-antes-de-la-cifra

## Nota de seguridad
Este MVP deja el panel admin abierto para avanzar rápido. Para producción, agrega Supabase Auth y políticas RLS privadas para el administrador.
