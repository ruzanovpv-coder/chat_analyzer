import * as fs from 'fs/promises'
import * as path from 'path'

const QWEN_API_URL = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
const QWEN_API_KEY = process.env.QWEN_API_KEY!

export async function analyzeChatWithQwen(chatText: string): Promise<{
  fullResult: string
  teaser: string
}> {
  // Чтение промта из файла
  const promptPath = path.join(process.cwd(), 'prompts', 'chat-analysis-prompt.txt')
  let prompt: string

  try {
    prompt = await fs.readFile(promptPath, 'utf-8')
  } catch {
    // Fallback промт если файл не найден
    prompt = `Ты — эксперт по анализу чатов. Проанализируй переписку и выдай структурированный результат.`
  }

  // Ограничение длины текста (Qwen имеет лимит токенов)
  const maxTextLength = 50000 // примерно 10000 слов
  const truncatedText = chatText.length > maxTextLength 
    ? chatText.substring(0, maxTextLength) + '\n\n[...текст обрезан из-за длины]'
    : chatText

  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-max',
      input: {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: truncatedText }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 4000,
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const fullResult = data.output?.text || 'Анализ не получен'

  // Создание teaser (первые 30% результата)
  const teaserLength = Math.floor(fullResult.length * 0.3)
  const teaser = fullResult.substring(0, teaserLength) + '\n\n[...полный результат доступен после оплаты]'

  return { fullResult, teaser }
}