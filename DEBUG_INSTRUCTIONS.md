# Инструкция по отладке проблемы 404

## Что было добавлено

Добавлено подробное логирование во все ключевые точки:

1. **`/api/upload`** — логирует user_id при создании записи
2. **`/api/analyze`** — логирует:
   - user_id из сессии/JWT
   - Проверку существования записи БЕЗ фильтра по user_id
   - Проверку существования записи С фильтром по user_id
3. **Фронтенд** — логирует user_id при загрузке страницы и при запуске анализа

## Что нужно сделать

### Шаг 1: Закоммить и запушить изменения

```bash
git add .
git commit -m "Add detailed logging for 404 debug"
git push
```

Vercel автоматически перезагрузит приложение.

### Шаг 2: Загрузить файл заново

1. Открой приложение в браузере
2. Открой DevTools (F12) → Console
3. Загрузи файл для анализа
4. Посмотри на логи в консоли

**Ожидаемые логи в консоли браузера:**
```
[Result Page] User ID: <USER_ID_BROWSER>
[Result Page] Analysis ID: <ANALYSIS_ID>
[Result Page] Analysis found: { id: <ANALYSIS_ID>, user_id: <USER_ID_BROWSER>, status: 'pending' }
[Frontend] Starting analysis: { analysisId: <ANALYSIS_ID>, token: true, userId: <USER_ID_BROWSER> }
[Frontend] Response status: 404
[Frontend] Error response: { error: 'Not found' }
```

**Запомни USER_ID_BROWSER из логов!**

### Шаг 3: Проверить логи Vercel

1. Открой **Vercel Dashboard → Deployments → [последний] → Logs**
2. Ищи POST запрос к `/api/upload`
3. Посмотри на логи:

```
[Upload] User ID: <USER_ID_UPLOAD>
[Upload] Created analysis: { id: <ANALYSIS_ID>, user_id: <USER_ID_UPLOAD> }
```

**Запомни USER_ID_UPLOAD из логов!**

4. Ищи POST запрос к `/api/analyze`
5. Посмотри на логи:

```
[POST] Got sessionUserId from cookies: <USER_ID_ANALYZE>
[POST] Using client: Service Role Key
[POST] Checking if analysis exists: <ANALYSIS_ID>
[POST] Analysis exists check: { found: true, analysisUserId: '<USER_ID_FROM_DB>', status: 'pending' }
[POST] Fetching analysis: { analysisId: <ANALYSIS_ID>, sessionUserId: '<USER_ID_ANALYZE>' }
[POST] Fetch result: { analysis: false, ... }
[POST] Analysis not found for: { analysisId: <ANALYSIS_ID>, sessionUserId: '<USER_ID_ANALYZE>' }
```

**Запомни:**
- USER_ID_ANALYZE — user_id, который используется для запроса
- USER_ID_FROM_DB — user_id, который хранится в БД

### Шаг 4: Сравнить user_id

Сравни все три значения:
1. USER_ID_BROWSER (из консоли браузера)
2. USER_ID_UPLOAD (из логов Vercel при загрузке)
3. USER_ID_ANALYZE (из логов Vercel при анализе)
4. USER_ID_FROM_DB (из логов Vercel, поле analysisUserId)

**Если они все одинаковые** — проблема с RLS политиками.

**Если они разные** — проблема с аутентификацией.

## Возможные сценарии

### Сценарий 1: Все user_id одинаковые

**Проблема:** RLS политики блокируют доступ

**Решение:**
1. Открой **Supabase Dashboard → SQL Editor**
2. Выполни SQL из `supabase/migrations/20260311_allow_update_analyses.sql`
3. Попробуй загрузить файл снова

### Сценарий 2: USER_ID_UPLOAD ≠ USER_ID_ANALYZE

**Проблема:** При загрузке используется один user_id, при анализе — другой

**Возможные причины:**
- Пользователь разлогинился и залогинился снова между загрузкой и анализом
- Проблема с сессией в cookies
- JWT токен содержит другой user_id

**Решение:**
1. Проверь, что пользователь не разлогинивался
2. Проверь, что сессия не истекла
3. Попробуй очистить cookies и залогиниться заново

### Сценарий 3: USER_ID_FROM_DB ≠ USER_ID_ANALYZE

**Проблема:** В БД записан один user_id, а при запросе используется другой

**Это означает:**
- Запись была создана с одним user_id
- Запрос идёт с другим user_id
- Поэтому запись не находится

**Решение:**
1. Проверь логи `/api/upload` — какой user_id использовался при создании
2. Проверь логи `/api/analyze` — какой user_id используется при запросе
3. Если они разные — нужно понять, почему user_id меняется

## Что делать дальше

После того, как ты выполнишь все шаги и сравнишь user_id, напиши мне:

1. Все ли user_id одинаковые?
2. Если разные — какие именно и где?
3. Что показывают логи Vercel?

Тогда я смогу точно определить проблему и предложить решение.
