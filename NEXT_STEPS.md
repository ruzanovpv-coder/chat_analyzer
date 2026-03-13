# Следующие шаги для отладки ошибки 404

## Что произошло

Получена ошибка 404 "Not found" при попытке запустить анализ. Это значит, что запись анализа не найдена в БД.

## Что было исправлено

1. ✅ Добавлено преобразование `analysisId` в число перед отправкой на сервер
2. ✅ Добавлено подробное логирование в фронтенд и бэкенд
3. ✅ Улучшена обработка ошибок

## Что нужно сделать

### Шаг 1: Перезагрузи приложение в Vercel

1. Открой **Vercel Dashboard → Deployments**
2. Нажми на последний деплой
3. Нажми кнопку **Redeploy** (или сделай новый git push)

### Шаг 2: Открой DevTools в браузере

1. Нажми **F12** (или Ctrl+Shift+I)
2. Перейди на вкладку **Console**
3. Очисти консоль (нажми на иконку корзины)

### Шаг 3: Загрузи файл для анализа

1. Загрузи файл через форму
2. Подожди, пока файл загрузится
3. Ты должен увидеть страницу с статусом "В очереди"

### Шаг 4: Посмотри на логи в консоли

В консоли браузера (F12 → Console) ты должен увидеть логи:

```
[Frontend] Starting analysis: { analysisId: 123, token: true }
[Frontend] Response status: 404
[Frontend] Error response: { error: 'Not found' }
[Frontend] Start analysis error: Error: Not found
```

**Важно:** Запомни значение `analysisId` (например, 123)

### Шаг 5: Проверь логи Vercel

1. Открой **Vercel Dashboard → Deployments → [последний] → Logs**
2. Ищи POST запрос к `/api/analyze`
3. Ты должен увидеть логи типа:

```
[POST] Started
[POST] analysisId: 123
[POST] Got sessionUserId from cookies: user-uuid-here
[POST] Using client: Service Role Key
[POST] Fetching analysis: { analysisId: 123, sessionUserId: 'user-uuid-here' }
[POST] Fetch result: { 
  analysis: false, 
  analysisId: undefined,
  userId: undefined,
  status: undefined,
  error: null,
  errorCode: undefined
}
[POST] Analysis not found for: { analysisId: 123, sessionUserId: 'user-uuid-here' }
```

### Шаг 6: Проверь, что запись была создана в БД

1. Открой **Supabase Dashboard → SQL Editor**
2. Создай новый query:

```sql
SELECT id, user_id, file_name, status FROM analyses ORDER BY created_at DESC LIMIT 10;
```

3. Выполни query
4. Ты должен увидеть записи с анализами

**Важно:** Проверь, что:
- `id` совпадает с `analysisId` из логов (например, 123)
- `user_id` совпадает с `sessionUserId` из логов
- `status` = 'pending'

### Шаг 7: Если записи нет в БД

Это значит, что файл не был загружен. Проверь:

1. Открой **Supabase Dashboard → Storage → chat-files**
2. Ты должен увидеть папку с твоим user_id
3. В папке должны быть загруженные файлы

Если файлов нет:
- Проверь, что файл был успешно загружен (должна быть зелёная галочка)
- Проверь размер файла (макс. 10 МБ)
- Проверь формат файла (только TXT или JSON)

### Шаг 8: Если запись есть, но не найдена

Это может быть проблема с RLS политиками. Выполни SQL:

1. Открой **Supabase Dashboard → SQL Editor**
2. Создай новый query
3. Скопируй содержимое из `supabase/migrations/20260311_allow_update_analyses.sql`
4. Выполни query

Это даст приложению права на чтение и обновление записей анализа.

## Типичные проблемы и решения

### Проблема: analysisId не совпадает

**Решение:**
- Проверь, что ты используешь правильный analysisId из логов
- Убедись, что запись была создана в БД с этим ID

### Проблема: user_id не совпадает

**Решение:**
- Проверь, что ты авторизован (есть сессия в браузере)
- Убедись, что JWT токен содержит правильный user_id
- Проверь, что user_id в БД совпадает с user_id из JWT

### Проблема: RLS политики блокируют доступ

**Решение:**
- Выполни SQL из `supabase/migrations/20260311_allow_update_analyses.sql`
- Это даст приложению права на доступ к записям

## Что дальше

После выполнения всех шагов:

1. Перезагрузи страницу
2. Загрузи файл снова
3. Посмотри на логи в консоли и Vercel
4. Если всё работает — поздравляем! 🎉
5. Если ошибка остаётся — напиши точное значение `analysisId` и `sessionUserId` из логов

## Вопросы?

Если что-то не понимаешь:
1. Посмотри на `DEBUG_GUIDE.md` — там подробное руководство
2. Проверь логи Vercel — там будут точные ошибки
3. Убедись, что все переменные окружения установлены правильно
