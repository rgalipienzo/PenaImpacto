// Función de Supabase "aceptar-invitacion".
// Solo la puede usar un administrador. Acepta o rechaza una solicitud de alta.
// Al aceptar, Supabase manda al invitado un correo para entrar y poner su contraseña.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ¿Quién llama? Tiene que ser un socio administrador.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: who } = await admin.auth.getUser(jwt)
    if (!who?.user) return reply(401, { error: 'Tienes que entrar en la app.' })
    const { data: socio } = await admin.from('socios').select('es_admin').eq('id', who.user.id).single()
    if (!socio?.es_admin) return reply(403, { error: 'Solo un administrador puede aceptar invitaciones.' })

    const { id, accion, redirectTo } = await req.json()
    const { data: inv } = await admin.from('invitaciones').select('*').eq('id', id).single()
    if (!inv) return reply(404, { error: 'No existe esa invitación.' })
    if (inv.estado !== 'solicitada') return reply(400, { error: 'Esta invitación no está pendiente de aceptar.' })

    if (accion === 'aceptar') {
      const { error } = await admin.auth.admin.inviteUserByEmail(inv.email, {
        redirectTo,
        data: { nombre: inv.nombre_solicitud || inv.nombre || '' },
      })
      if (error) return reply(400, { error: error.message })
    }

    await admin
      .from('invitaciones')
      .update({ estado: accion === 'aceptar' ? 'aceptada' : 'rechazada', resuelta_at: new Date().toISOString(), resuelta_por: who.user.id })
      .eq('id', id)

    return reply(200, { ok: true })
  } catch (err) {
    return reply(500, { error: String(err?.message || err) })
  }
})
