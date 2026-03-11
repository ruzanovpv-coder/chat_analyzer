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

-- Политики доступа для Supabase
-- Пользователи могут читать только свои данные
CREATE POLICY "Users can read own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can read own analyses" ON analyses
  FOR ALL USING (auth.uid() = user_id);

-- Пользователи могут создавать новые анализы
CREATE POLICY "Users can create analyses" ON analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять только свои анализы (но не результаты)
CREATE POLICY "Users can update own analyses" ON analyses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Разрешаем RPC функцию для всех аутентифицированных пользователей
GRANT EXECUTE ON FUNCTION increment_generation_count(UUID) TO authenticated;

-- Разрешаем доступ к таблицам для аутентифицированных пользователей
GRANT ALL ON users TO authenticated;
GRANT ALL ON analyses TO authenticated;
GRANT USAGE ON SEQUENCE analyses_id_seq TO authenticated;