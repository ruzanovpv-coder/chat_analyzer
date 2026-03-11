import * as fs from 'fs/promises'
import * as path from 'path'

const QWEN_API_URL =
  process.env.QWEN_API_URL ||
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

const QWEN_API_KEY = process.env.QWEN_API_KEY

function localFallbackAnalysis(chatText: string) {
  const text = String(chatText || '')
  const chars = text.length
  const lines = text.split(/\r?\n/).length
  const words = (text.match(/\S+/g) || []).length

  let jsonInfo = ''
  try {
    const parsed: any = JSON.parse(text)
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : null
    if (messages) {
      const total = messages.length
      const participants = new Set<string>()
      let firstDate: string | null = null
      let lastDate: string | null = null

      for (const m of messages) {
        if (typeof m?.from === 'string') participants.add(m.from)
        const d = typeof m?.date === 'string' ? m.date : null
        if (d) {
          if (!firstDate || d < firstDate) firstDate = d
          if (!lastDate || d > lastDate) lastDate = d
        }
      }

      jsonInfo =
        `\n\nTelegram JSON:` +
        `\n- сообщений: ${total}` +
        `\n- участников: ${participants.size}` +
        (firstDate && lastDate ? `\n- период: ${firstDate} — ${lastDate}` : '')
    }
  } catch {
    // ignore
  }

  return (
    `AI-анализ пока не настроен (нет QWEN_API_KEY).` +
    `\n\nБыстрая статистика по файлу:` +
    `\n- символов: ${chars}` +
    `\n- слов: ${words}` +
    `\n- строк: ${lines}` +
    jsonInfo +
    `\n\nЧтобы включить полноценный анализ, добавь переменную окружения QWEN_API_KEY в Vercel.`
  )
}

export async function analyzeChatWithQwen(chatText: string): Promise<{
  fullResult: string
  teaser: string
}> {
  if (!QWEN_API_KEY) {
    const fullResult = localFallbackAnalysis(chatText)
    return { fullResult, teaser: fullResult }
  }

  const promptPath = path.join(process.cwd(), 'prompts', 'chat-analysis-prompt.txt')
  let prompt: string

  try {
    prompt = await fs.readFile(promptPath, 'utf-8')
  } catch {
    prompt = 'Ты — эксперт по анализу чатов. Проанализируй переписку и выдай структурированный результат.'
  }

  const maxTextLength = 50000
  const truncatedText =
    chatText.length > maxTextLength
      ? chatText.substring(0, maxTextLength) + '\n\n[...текст обрезан из-за длины]'
      : chatText

  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${QWEN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-max',
      input: {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: truncatedText },
        ],
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 4000,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`)
  }

  const data: any = await response.json().catch(() => ({}))
  const fullResult: string = data.output?.text || 'Анализ не получен'

  // Free mode: return full text everywhere.
  return { fullResult, teaser: fullResult }
}

