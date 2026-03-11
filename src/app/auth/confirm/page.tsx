export default function ConfirmPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Подтвердите ваш email
        </h1>
        
        <p className="text-gray-600 mb-6">
          Мы отправили письмо с подтверждением на вашу почту. 
          Пожалуйста, перейдите по ссылке в письме, чтобы активировать аккаунт.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <p className="text-sm text-blue-800">
            <strong>Не получили письмо?</strong>
            <br />
            • Проверьте папку "Спам"
            <br />
            • Убедитесь, что email указан правильно
          </p>
        </div>
      </div>
    </div>
  )
}