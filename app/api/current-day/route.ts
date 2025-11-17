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

  // Use upsert with explicit conflict resolution
  // This should trigger a real-time UPDATE event (or INSERT if new)
  const { data, error } = await supabase
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
      { 
        onConflict: 'user_id,date',
        // Ensure we always update, not just insert
        ignoreDuplicates: false
      }
    )
    .select('updated_at, content')
    .single()

  if (error) {
    console.error('❌ API route: Failed to upsert current day content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log successful save for debugging
  console.log('✅ API route: Successfully saved content for user:', user.id, 'date:', dateKey, 'content length:', content.length)
  console.log('📤 API route: This should trigger a real-time postgres_changes event')

  return NextResponse.json({ updatedAt: data?.updated_at || updatedAt })
}

