import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromSession } from '@/lib/supabase'
import { getUserGenerationCount } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await getUserGenerationCount(userId)
    const limit = 10
    const canGenerate = count < limit

    return NextResponse.json({ 
      canGenerate,
      generationCount: count,
      limit
    })
  } catch (error: any) {
    console.error('[CheckLimit] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
