import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromSession } from '@/lib/supabase'
import { getAnalysis, updateAnalysisStatus, completeAnalysis, incrementGenerationCount } from '@/lib/database'
import { downloadFile } from '@/lib/storage'
import { analyzeChat } from '@/lib/ai-analyzer'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analysisId } = await request.json()
    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId required' }, { status: 400 })
    }

    const analysis = await getAnalysis(analysisId, userId)
    if (!analysis) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (analysis.status !== 'pending') {
      return NextResponse.json({ 
        success: true, 
        status: analysis.status,
        analysisId 
      })
    }

    await updateAnalysisStatus(analysisId, userId, 'processing')

    const fileContent = await downloadFile(analysis.file_path)
    const result = await analyzeChat(fileContent)

    await completeAnalysis(analysisId, userId, result.fullResult, result.teaser)
    await incrementGenerationCount(userId)

    return NextResponse.json({ success: true, analysisId })
  } catch (error: any) {
    console.error('[Analyze] Error:', error.message)
    
    try {
      const { analysisId } = await request.json()
      const userId = await getUserIdFromSession()
      if (analysisId && userId) {
        await updateAnalysisStatus(analysisId, userId, 'failed')
      }
    } catch {}

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
