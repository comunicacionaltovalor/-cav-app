export function slugify(text:string){return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}
export function todayISO(){return new Date().toISOString().slice(0,10)}
export function csv(rows:any[]){if(!rows.length)return '';const h=Object.keys(rows[0]);return [h.join(','),...rows.map(r=>h.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n')}
