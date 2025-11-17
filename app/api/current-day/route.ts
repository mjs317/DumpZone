import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content, mutationId, clientId } = await request.json()
  const dateKey = new Date().toISOString().split('T')[0]
  const updatedAt = new Date().toISOString()

  const { error } = await supabase
    .from('current_day')
    .upsert(
      {
        user_id: user.id,
        date: dateKey,
        content,
        updated_at: updatedAt,
        client_id: clientId ?? null,
        mutation_id: mutationId ?? null,
      },
      { onConflict: 'user_id,date' }
    )

  if (error) {
    console.error('Failed to upsert current day content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updatedAt })
}

