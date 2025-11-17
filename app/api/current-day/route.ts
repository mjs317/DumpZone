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
  // Use local timezone for date key (matching client-side logic)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateKey = `${year}-${month}-${day}`
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

