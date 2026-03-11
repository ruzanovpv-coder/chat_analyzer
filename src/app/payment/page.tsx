export default function PaymentPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Оплата анализа
          </h1>
          <p className="text-gray-600">
            Получите полный доступ к анализу за 250₽
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Что вы получите:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Полный анализ всех 10 измерений
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Детальные профили всех участников
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Карта тем и болей чата
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                10-20 идей для контента
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                PDF-отчёт для скачивания
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Приоритетная обработка
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Стоимость:</h3>
            <div className="text-3xl font-bold text-blue-900 mb-2">250₽</div>
            <p className="text-blue-700 text-sm">
              Одноразовый платеж за полный доступ к анализу
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h4 className="font-semibold text-yellow-900 mb-2">Важно!</h4>
          <p className="text-yellow-800 text-sm">
            После оплаты вы получите полный доступ к анализу. Результат будет доступен 
            в вашем личном кабинете и отправлен на email. Файл и результат будут 
            автоматически удалены через 24 часа.
          </p>
        </div>

        <div className="space-y-4">
          <button className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors">
            Оплатить 250₽
          </button>
          
          <div className="text-center text-sm text-gray-500">
            <p>Оплата принимается через безопасную систему</p>
            <div className="flex justify-center space-x-4 mt-2">
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">Visa</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">MasterCard</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">Мир</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">Apple Pay</span>
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">Google Pay</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Если у вас возникли вопросы, свяжитесь с нами:</p>
          <p className="text-blue-600">support@chat-analyzer.ru</p>
        </div>
      </div>
    </div>
  )
}