import * as fs from 'fs/promises'
import * as path from 'path'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses'

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
        `\n- messages: ${total}` +
        `\n- participants: ${participants.size}` +
        (firstDate && lastDate ? `\n- period: ${firstDate} - ${lastDate}` : '')
    }
  } catch {
    // ignore
  }

  return (
    `AI analysis is not configured (missing OPENAI_API_KEY).` +
    `\n\nQuick file stats:` +
    `\n- chars: ${chars}` +
    `\n- words: ${words}` +
    `\n- lines: ${lines}` +
    jsonInfo +
    `\n\nTo enable full analysis, add OPENAI_API_KEY in Vercel Environment Variables and redeploy.`
  )
}

function getTelegramMessageText(text: any): string {
  if (typeof text === 'string') return text
  if (!Array.isArray(text)) return ''
  return text
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text
      return ''
    })
    .join('')
}

function buildSampleFromLines(lines: string[], maxLines = 600) {
  if (lines.length <= maxLines) return lines.join('\n')

  const headCount = Math.min(200, Math.floor(maxLines / 3))
  const tailCount = Math.min(200, Math.floor(maxLines / 3))
  const head = lines.slice(0, headCount)
  const tail = lines.slice(-tailCount)

  const middleNeeded = Math.max(0, maxLines - head.length - tail.length)
  const middleStart = head.length
  const middleEnd = Math.max(middleStart, lines.length - tail.length)
  const middleSize = Math.max(0, middleEnd - middleStart)

  const middle: string[] = []
  if (middleNeeded > 0 && middleSize > 0) {
    for (let i = 0; i < middleNeeded; i++) {
      const idx = middleStart + Math.floor((i * middleSize) / middleNeeded)
      middle.push(lines[idx])
    }
  }

  return [...head, '... (middle messages omitted) ...', ...middle, '... (middle messages omitted) ...', ...tail].join('\n')
}

function prepareChatForModel(chatText: string) {
  const text = String(chatText || '')

  const baseMeta = [
    `raw_chars=${text.length}`,
  ]

  const trimmed = text.trimStart()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    // Not JSON, treat as plain text.
    const maxChars = 120_000
    const content = text.length > maxChars ? text.slice(0, maxChars) + '\n\n[...truncated]' : text
    return {
      meta: `Chat meta:\n- type: text\n- ${baseMeta.join('\n- ')}`,
      content,
    }
  }

  try {
    const parsed: any = JSON.parse(text)
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : null
    if (!messages) {
      const maxChars = 120_000
      const content = text.length > maxChars ? text.slice(0, maxChars) + '\n\n[...truncated]' : text
      return {
        meta: `Chat meta:\n- type: json\n- ${baseMeta.join('\n- ')}`,
        content,
      }
    }

    const participants = new Map<string, number>()
    let firstDate: string | null = null
    let lastDate: string | null = null
    const lines: string[] = []

    for (const m of messages) {
      if (m?.type && m.type !== 'message') continue
      const from = typeof m?.from === 'string' ? m.from : 'Unknown'
      const date = typeof m?.date === 'string' ? m.date : ''
      const msgText = getTelegramMessageText(m?.text).replace(/\s+/g, ' ').trim()
      if (!msgText) continue

      participants.set(from, (participants.get(from) || 0) + 1)
      if (date) {
        if (!firstDate || date < firstDate) firstDate = date
        if (!lastDate || date > lastDate) lastDate = date
      }

      const safeText = msgText.length > 400 ? msgText.slice(0, 400) + '…' : msgText
      lines.push(`${date} ${from}: ${safeText}`)
    }

    const topParticipants = [...participants.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => `${name} (${count})`)

    const sample = buildSampleFromLines(lines, 700)

    return {
      meta:
        `Chat meta:\n- type: telegram-json` +
        `\n- messages_total: ${messages.length}` +
        `\n- messages_text: ${lines.length}` +
        `\n- participants: ${participants.size}` +
        (firstDate && lastDate ? `\n- period: ${firstDate} - ${lastDate}` : '') +
        (topParticipants.length ? `\n- top_participants: ${topParticipants.join(', ')}` : ''),
      content: sample,
    }
  } catch {
    const maxChars = 120_000
    const content = text.length > maxChars ? text.slice(0, maxChars) + '\n\n[...truncated]' : text
    return {
      meta: `Chat meta:\n- type: json\n- ${baseMeta.join('\n- ')}`,
      content,
    }
  }
}

async function readPrompt() {
  const promptPath = path.join(process.cwd(), 'prompts', 'chat-analysis-prompt.txt')
  try {
    return await fs.readFile(promptPath, 'utf-8')
  } catch {
    return 'You are an expert in chat analysis. Analyze the conversation and return a structured result.'
  }
}

function extractOutputText(data: any): string {
  const direct = typeof data?.output_text === 'string' ? data.output_text : ''
  if (direct && direct.trim()) return direct.trim()

  const output = Array.isArray(data?.output) ? data.output : []
  const parts: string[] = []
  for (const item of output) {
    if (item?.type !== 'message') continue
    if (item?.role !== 'assistant') continue
    const content = Array.isArray(item?.content) ? item.content : []
    for (const c of content) {
      if (c?.type === 'output_text' && typeof c?.text === 'string') parts.push(c.text)
    }
  }
  return parts.join('\n').trim()
}

export async function analyzeChatWithOpenAI(chatText: string): Promise<{
  fullResult: string
  teaser: string
}> {
  if (!OPENAI_API_KEY) {
    const fullResult = localFallbackAnalysis(chatText)
    return { fullResult, teaser: fullResult }
  }

  const prompt = await readPrompt()
  const prepared = prepareChatForModel(chatText)

  const userContent = `${prepared.meta}\n\nChat sample:\n${prepared.content}`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'developer', content: prompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_output_tokens: 4000,
      text: { format: { type: 'text' } },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data: any = await response.json().catch(() => ({}))
  const fullResult = extractOutputText(data) || 'No analysis output'

  // Free mode: return full text everywhere.
  return { fullResult, teaser: fullResult }
}

