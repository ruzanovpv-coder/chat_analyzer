# Руководство по отладке ошибки анализа

## Текущее состояние

Исправлены следующие проблемы:
- ✅ Добавлена поддержка JWT токенов в Authorization header
- ✅ Добавлена поддержка Service Role Key для backend операций
- ✅ Улучшено логирование для отладки
- ✅ Добавлена цепочка fallback для AI API (Gemini → Cohere → Qwen)

## Что проверить в Vercel

### 1. Переменные окружения

Перейди в **Vercel Dashboard → Settings → Environment Variables** и убедись, что установлены:

**Обязательные:**
- `NEXT_PUBLIC_SUPABASE_URL` — URL твоего Supabase проекта
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key из Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Service Role Key (Secret key `sb_secret_...`)

**AI API (нужен хотя бы один):**
- `QWEN_API_KEY` — ключ Qwen API (рекомендуется)
- `GEMINI_API_KEY` — ключ Google Gemini (опционально)
- `COHERE_API_KEY` — ключ Cohere API (опционально)

**Email:**
- `RESEND_API_KEY` — ключ Resend для отправки писем
- `EMAIL_FROM` — адрес отправителя

**Платежи:**
- `YOOKASSA_SHOP_ID` — ID магазина YooKassa
- `YOOKASSA_SECRET_KEY` — Secret key YooKassa

### 2. Проверка логов

1. Открой **Vercel Dashboard → Deployments → [последний деплой] → Logs**
2. Нажми на POST запрос к `/api/analyze`
3. Ищи строки с `[POST]` — они покажут:
   - Получен ли `analysisId`
   - Получен ли `sessionUserId` (из cookies или JWT)
   - Какой AI API был использован (Gemini/Cohere/Qwen)
   - Какая ошибка произошла

### 3. Проверка RLS политик

Если видишь ошибку про RLS или UPDATE, выполни SQL в Supabase:

1. Открой **Supabase Dashboard → SQL Editor**
2. Создай новый query
3. Скопируй содержимое из `supabase/migrations/20260311_allow_update_analyses.sql`
4. Выполни query

Это даст приложению права на обновление статуса анализа.

## Типичные ошибки и решения

### Ошибка: "Unauthorized" (401)

**Причина:** Не удалось получить sessionUserId

**Решение:**
1. Проверь, что пользователь авторизован (есть сессия в браузере)
2. Проверь, что `SUPABASE_SERVICE_ROLE_KEY` установлена в Vercel
3. Проверь логи Vercel — ищи `[POST] Got sessionUserId`

### Ошибка: "Not found" (404)

**Причина:** Analysis запись не найдена в БД

**Решение:**
1. Проверь, что файл был успешно загружен (должна быть запись в таблице `analyses`)
2. Проверь, что `user_id` в JWT токене совпадает с `user_id` в таблице `analyses`
3. Проверь RLS политики (выполни SQL из `supabase/migrations/20260311_allow_update_analyses.sql`)

### Ошибка: "Gemini API error: 401"

**Причина:** Неверный или отсутствующий GEMINI_API_KEY

**Решение:**
1. Проверь, что `GEMINI_API_KEY` установлена в Vercel
2. Убедись, что ключ валидный (скопируй из Google Cloud Console)
3. Если ключ неверный, удали его и используй Qwen или Cohere вместо этого

### Ошибка: "Qwen API error: 401"

**Причина:** Неверный или отсутствующий QWEN_API_KEY

**Решение:**
1. Проверь, что `QWEN_API_KEY` установлена в Vercel
2. Убедись, что ключ валидный (скопируй из Alibaba Cloud Console)
3. Если ключ неверный, удали его и используй Gemini или Cohere вместо этого

## Процесс отладки

1. **Загрузи файл** — проверь, что файл успешно загружен (должна быть запись в БД)
2. **Открой DevTools** (F12 в браузере) → Console
3. **Посмотри на ошибку** — скопируй текст ошибки
4. **Проверь логи Vercel** — ищи соответствующий POST запрос
5. **Сравни логи** — посмотри, какой шаг не прошел

## Если ничего не помогает

1. Удали все AI API ключи из Vercel (оставь только Supabase)
2. Перезагрузи страницу
3. Попробуй загрузить файл снова
4. Посмотри на ошибку в логах Vercel
5. Добавь один AI API ключ (рекомендуется Qwen)
6. Перезагрузи страницу
7. Попробуй снова

## Получение бесплатных API ключей

### Qwen API (рекомендуется)
1. Зарегистрируйся на https://dashscope.aliyuncs.com
2. Создай новый API key
3. Скопируй ключ в Vercel переменную `QWEN_API_KEY`

### Google Gemini API
1. Зарегистрируйся на https://ai.google.dev
2. Создай новый API key
3. Скопируй ключ в Vercel переменную `GEMINI_API_KEY`

### Cohere API
1. Зарегистрируйся на https://cohere.com
2. Создай новый API key
3. Скопируй ключ в Vercel переменную `COHERE_API_KEY`

## Что дальше

После исправления ошибки:
1. Перезагрузи страницу
2. Попробуй загрузить файл снова
3. Проверь, что анализ запустился (статус должен измениться с "В очереди" на "Обрабатывается")
4. Подожди 2-5 минут, пока анализ завершится
5. Проверь результат
