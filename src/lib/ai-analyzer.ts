import { GoogleGenerativeAI } from '@google/generative-ai'

export interface AnalysisResult {
  fullResult: string
  teaser: string
}

async function analyzeWithGemini(chatText: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
  })

  const prompt = `Проанализируй этот чат и дай подробный анализ:

${chatText}

Верни результат в формате JSON:
{
  "fullResult": "полный детальный анализ",
  "teaser": "краткое превью (2-3 предложения)"
}`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')
  
  return JSON.parse(jsonMatch[0])
}

export async function analyzeChat(chatText: string): Promise<AnalysisResult> {
  try {
    return await analyzeWithGemini(chatText)
  } catch (error: any) {
    throw new Error(`Analysis failed: ${error.message}`)
  }
}
