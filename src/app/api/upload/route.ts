import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromSession } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'
import { createAnalysis } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const filePath = await uploadFile(userId, file)
    const analysisId = await createAnalysis(userId, file.name, filePath, file.size)

    return NextResponse.json({ 
      success: true, 
      analysisId,
      userId 
    })
  } catch (error: any) {
    console.error('[Upload] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
