import nodemailer from 'nodemailer'

function getTransporter() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null

  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 587,
    auth: {
      user: 'resend',
      pass: key,
    },
  })
}

export async function sendAnalysisEmail(
  to: string,
  fileName: string,
  result: string,
  isPaid: boolean
) {
  const transporter = getTransporter()
  if (!transporter) return

  const from = process.env.EMAIL_FROM
  if (!from) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const subject = isPaid 
    ? `📊 Полный анализ чата "${fileName}" готов!`
    : `📊 Анализ чата "${fileName}" готов (превью)`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .result { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
    .cta { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .cta:hover { background: #059669; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Chat Analyzer</h1>
      <p style="margin: 5px 0 0 0;">Анализ чатов с помощью AI</p>
    </div>
    
    <div class="content">
      <h2>Ваш анализ готов!</h2>
      <p><strong>Файл:</strong> ${fileName}</p>
      <p><strong>Дата:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      
      ${isPaid ? `
        <div class="result">
          <h3>📋 Полный результат:</h3>
          <pre style="white-space: pre-wrap; font-family: inherit; background: #f3f4f6; padding: 15px; border-radius: 4px;">${result}</pre>
        </div>
      ` : `
        <div class="result">
          <h3>📋 Превью результата:</h3>
          <pre style="white-space: pre-wrap; font-family: inherit; background: #f3f4f6; padding: 15px; border-radius: 4px;">${result.substring(0, 800)}${result.length > 800 ? '...' : ''}</pre>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">🎁 Получите полную версию за 250₽</h3>
          <p>В полной версии вы получите:</p>
          <ul>
            <li>✓ Полный анализ всех 10 измерений</li>
            <li>✓ Профили всех участников чата</li>
            <li>✓ Карту тем и вопросов</li>
            <li>✓ 10-20 идей для контента</li>
            <li>✓ PDF-отчёт для скачивания</li>
            <li>✓ Приоритетную обработку</li>
          </ul>
          <div style="text-align: center;">
            <a href="${appUrl}/payment" class="cta">Оплатить и получить полный результат</a>
          </div>
        </div>
      `}
      
      <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0; font-size: 14px;">
          <strong>⏰ Важно:</strong> Файл и результат будут автоматически удалены через 24 часа.
        </p>
      </div>
      
      <div class="footer">
        <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
        <p>© ${new Date().getFullYear()} Chat Analyzer. Все права защищены.</p>
        <p>
          <a href="${appUrl}/privacy">Политика конфиденциальности</a> | 
          <a href="${appUrl}/terms">Пользовательское соглашение</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  })
}
