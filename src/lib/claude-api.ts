import Anthropic from '@anthropic-ai/sdk'

export async function analyzeChatWithClaude(chatText: string): Promise<{ fullResult: string; teaser: string }> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not configured')
  }

  const anthropic = new Anthropic({ apiKey })

  const prompt = `Проанализируй этот чат и предоставь детальный анализ:

${chatText}

Предоставь анализ в следующем формате:
1. Общая статистика (количество сообщений, участники)
2. Основные темы обсуждения
3. Тональность общения
4. Ключевые моменты и выводы`

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  const fullResult = message.content[0].type === 'text' ? message.content[0].text : ''
  const teaser = fullResult.split('\n').slice(0, 3).join('\n') + '...'

  return { fullResult, teaser }
}
