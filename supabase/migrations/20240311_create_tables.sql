-- Создание таблиц для системы анализа чатов

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  generations_used INTEGER DEFAULT 0,
  generations_limit INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Автосоздание строки в public.users при регистрации в auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Таблица анализов
CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_text TEXT,
  result_teaser TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  yookassa_payment_id TEXT,
  yookassa_payment_status TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Функция для увеличения счётчика использований
CREATE OR REPLACE FUNCTION increment_generation_count(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET generations_used = generations_used + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для покупки дополнительной генерации (оплата 250₽)
CREATE OR REPLACE FUNCTION increment_generation_limit(user_uuid UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET generations_limit = generations_limit + delta,
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analyses_updated_at ON analyses;
CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_yookassa_payment_id ON analyses(yookassa_payment_id) WHERE yookassa_payment_id IS NOT NULL;

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Policies (drop old if present)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can create analyses" ON analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON analyses;

DROP POLICY IF EXISTS "Users can select own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can select own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;

CREATE POLICY "Users can select own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can select own analyses" ON analyses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON analyses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Supabase Storage bucket для файлов чата
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Доступ к файлам только внутри своей папки: `${auth.uid()}/...`
DROP POLICY IF EXISTS "Chat files: select own folder" ON storage.objects;
DROP POLICY IF EXISTS "Chat files: insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "Chat files: delete own folder" ON storage.objects;

CREATE POLICY "Chat files: select own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

CREATE POLICY "Chat files: insert own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

CREATE POLICY "Chat files: delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

-- Политики доступа для Supabase
-- Пользователи могут читать только свои данные


-- Пользователи могут создавать новые анализы

-- Пользователи могут обновлять только свои анализы (но не результаты)

-- Разрешаем RPC функцию для всех аутентифицированных пользователей
GRANT EXECUTE ON FUNCTION increment_generation_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_generation_limit(UUID, INTEGER) TO authenticated;

-- Разрешаем доступ к таблицам для аутентифицированных пользователей
GRANT SELECT ON users TO authenticated;
GRANT SELECT, INSERT ON analyses TO authenticated;
GRANT USAGE ON SEQUENCE analyses_id_seq TO authenticated;
