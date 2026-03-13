# Проблема: 404 "Not found" при запуске анализа

## Текущее состояние

**Ошибка**: POST `/api/analyze` возвращает 404 "Not found"

**Статус**: Записи создаются в БД, но не находятся при запросе

## Что было сделано

### Исправления в коде:
1. ✅ Добавлены импорты `createRouteHandlerClient` и `cookies` в `/api/analyze/route.ts`
2. ✅ Реализована двухуровневая аутентификация:
   - Первичный метод: сессия из cookies
   - Fallback: JWT токен из Authorization header
3. ✅ Добавлено подробное логирование для отладки
4. ✅ Преобразование `analysisId` в число перед отправкой на сервер
5. ✅ Улучшена обработка ошибок с логированием stack trace

### Файлы, которые были изменены:
- `src/app/api/analyze/route.ts` — основной эндпоинт анализа
- `src/app/result/[id]/page.tsx` — фронтенд, отправляет analysisId
- `.env.example` — добавлены все AI API ключи

## Текущая проблема

### Симптомы:
- Файл успешно загружается
- Запись создаётся в таблице `analyses` с ID (меняется каждый раз)
- При попытке запустить анализ возвращается 404
- В Supabase видны записи с `user_id` начинающимся на `4у680...`

### Гипотеза:
**Несовпадение user_id между JWT токеном и записью в БД**

Возможные причины:
1. JWT токен содержит другой user_id, чем тот, который использовался при создании записи
2. RLS политики блокируют доступ к записи
3. Проблема с кодировкой или форматом user_id

## Что нужно проверить

### 1. Vercel логи (КРИТИЧНО)
Открой **Vercel Dashboard → Deployments → [последний] → Logs**

Ищи POST запрос к `/api/analyze` и посмотри:
```
[POST] Got sessionUserId from cookies: <USER_ID_1>
[POST] Fetching analysis: { analysisId: 123, sessionUserId: '<USER_ID_1>' }
[POST] Fetch result: { analysis: false, ... }
```

**Запомни USER_ID_1 из логов**

### 2. Supabase SQL
Выполни в SQL Editor:
```sql
SELECT id, user_id, file_name, status, created_at 
FROM analyses 
ORDER BY created_at DESC 
LIMIT 5;
```

**Запомни user_id из последней записи (начинается на 4у680...)**

### 3. Сравнение
Сравни:
- USER_ID_1 из логов Vercel
- user_id из Supabase БД

**Если они не совпадают — это корень проблемы!**

## Решение

Если user_id не совпадают:

### Вариант 1: Проверить RLS политики
Выполни в Supabase SQL Editor:
```sql
-- Проверить RLS политики на таблице analyses
SELECT * FROM pg_policies WHERE tablename = 'analyses';
```

Если политики блокируют доступ, выполни:
```sql
-- Из файла supabase/migrations/20260311_allow_update_analyses.sql
```

### Вариант 2: Проверить JWT токен
В браузере (F12 → Console) выполни:
```javascript
const { data: { session } } = await supabase.auth.getSession()
console.log('User ID:', session?.user?.id)
```

Сравни с user_id из БД.

### Вариант 3: Проверить, как создаётся запись
В `/api/upload/route.ts` проверь, что используется правильный user_id:
```typescript
const userId = session.user.id
// Убедись, что это совпадает с user_id в JWT токене
```

## Файлы для справки

- `src/app/api/analyze/route.ts` — эндпоинт анализа с логированием
- `src/app/api/upload/route.ts` — эндпоинт загрузки файла
- `src/app/result/[id]/page.tsx` — фронтенд, отправляет JWT токен
- `.kiro/specs/supabase-auth-401-analyze/design.md` — полное описание проблемы

## Следующие шаги

1. Проверь логи Vercel и запомни USER_ID_1
2. Проверь Supabase БД и запомни user_id из записи
3. Сравни их
4. Если не совпадают — это проблема с аутентификацией
5. Если совпадают — проблема с RLS политиками

## Контакт для другой ИИ

Основная проблема: **404 при запросе к анализу, хотя запись существует в БД**

Вероятная причина: **Несовпадение user_id между JWT токеном и записью в БД**

Нужно сравнить user_id из логов Vercel с user_id в Supabase.
