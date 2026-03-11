import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Анализируйте чаты с помощью{' '}
              <span className="text-blue-600">искусственного интеллекта</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Загрузите экспорт чата из Telegram и получите глубокий анализ 
              взаимоотношений, динамики общения и скрытых паттернов.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">1 бесплатная генерация</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Полный анализ 10 измерений</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Профили всех участников</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Контент-идеи и рекомендации</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors text-center"
              >
                Начать анализ
              </Link>
              <Link
                href="/auth/login"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 transition-colors text-center"
              >
                Войти в аккаунт
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Как это работает?
                </h3>
                <p className="text-gray-600">Всего 3 простых шага</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Экспорт чата</h4>
                    <p className="text-gray-600 text-sm">Экспортируйте чат из Telegram в формате JSON или TXT</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Загрузка</h4>
                    <p className="text-gray-600 text-sm">Загрузите файл на наш сервер</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Анализ</h4>
                    <p className="text-gray-600 text-sm">Получите подробный AI-анализ на email</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Что вы получите в анализе?
            </h2>
            <p className="text-gray-600">Комплексный разбор вашего чата по 10 ключевым измерениям</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Эмоциональный фон',
                description: 'Анализ настроения, эмоциональной окраски и смены тонов в переписке'
              },
              {
                title: 'Социальная структура',
                description: 'Выявление лидеров, аутсайдеров и социальных групп внутри чата'
              },
              {
                title: 'Тематическая карта',
                description: 'Классификация всех обсуждаемых тем и их значимости'
              },
              {
                title: 'Коммуникативные паттерны',
                description: 'Анализ стиля общения, частоты сообщений и активности участников'
              },
              {
                title: 'Конфликтный потенциал',
                description: 'Выявление скрытых противоречий, напряжений и точек роста конфликтов'
              },
              {
                title: 'Контент-анализ',
                description: 'Оценка типов контента, его эффективности и вовлеченности'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Готовы начать анализ?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Первый анализ абсолютно бесплатный. Просто зарегистрируйтесь и загрузите свой чат.
          </p>
          <Link
            href="/auth/register"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors inline-block"
          >
            Зарегистрироваться бесплатно
          </Link>
        </div>
      </div>
    </div>
  )
}