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
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
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
  // Try Cohere first (most reliable)
  try {
    const { CohereClient } = await import('cohere-ai')
    const apiKey = process.env.COHERE_API_KEY
    if (apiKey) {
      const cohere = new CohereClient({ token: apiKey })
      const response = await cohere.generate({
        prompt: `Проанализируй этот чат и дай подробный анализ:\n\n${chatText}\n\nВерни результат в формате JSON:\n{\n  "fullResult": "полный детальный анализ",\n  "teaser": "краткое превью (2-3 предложения)"\n}`,
        maxTokens: 2000
      })
      const text = response.generations[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    }
  } catch (e: any) {
    console.warn('Cohere failed:', e.message)
  }

  // Fallback to Gemini
  try {
    return await analyzeWithGemini(chatText)
  } catch (error: any) {
    throw new Error(`Analysis failed: ${error.message}`)
  }
}
