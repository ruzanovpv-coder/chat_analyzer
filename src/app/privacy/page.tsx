export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Политика конфиденциальности
        </h1>
        
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Дата вступления в силу:</strong> 11 марта 2026 года
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Введение</h2>
          <p className="text-gray-700 mb-6">
            Мы уважаем вашу конфиденциальность и стремимся защищать вашу личную информацию. 
            Эта политика конфиденциальности объясняет, как мы собираем, используем, раскрываем 
            и защищаем информацию, которую вы предоставляете при использовании нашего сервиса 
            анализа чатов.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Собираемая информация</h2>
          <p className="text-gray-700 mb-4">
            Мы собираем следующую информацию:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li><strong>Персональные данные:</strong> Email-адрес, необходимый для регистрации и авторизации</li>
            <li><strong>Файлы чатов:</strong> Экспортированные из Telegram файлы в формате JSON или TXT</li>
            <li><strong>Данные анализа:</strong> Результаты AI-анализа, созданные на основе загруженных файлов</li>
            <li><strong>Техническая информация:</strong> IP-адрес, данные о браузере и устройстве</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Использование информации</h2>
          <p className="text-gray-700 mb-4">
            Мы используем вашу информацию для следующих целей:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Предоставления и улучшения наших услуг</li>
            <li>Анализа загруженных файлов с помощью AI</li>
            <li>Отправки результатов анализа на ваш email</li>
            <li>Управления вашим аккаунтом и лимитами использования</li>
            <li>Технической поддержки и связи с вами</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Защита данных</h2>
          <p className="text-gray-700 mb-4">
            Мы принимаем разумные меры для защиты вашей информации:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Шифрование данных при передаче (HTTPS)</li>
            <li>Хранение файлов в защищенном облачном хранилище</li>
            <li>Ограничение доступа к данным только для авторизованных сотрудников</li>
            <li>Регулярное обновление систем безопасности</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Хранение данных</h2>
          <p className="text-gray-700 mb-6">
            <strong>Срок хранения:</strong> Все файлы и результаты анализа автоматически удаляются 
            через 24 часа после завершения обработки. Мы не храним ваши данные дольше необходимого 
            срока.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Раскрытие информации</h2>
          <p className="text-gray-700 mb-6">
            Мы не продаем и не передаем вашу личную информацию третьим лицам, за исключением:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Поставщиков услуг, помогающих нам в работе (с соблюдением конфиденциальности)</li>
            <li>По требованию закона или по решению суда</li>
            <li>Для защиты наших прав, имущества или безопасности</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Ваши права</h2>
          <p className="text-gray-700 mb-4">
            Вы имеете право:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>На доступ к вашим персональным данным</li>
            <li>На исправление неточной информации</li>
            <li>На удаление ваших данных (в пределах, не нарушающих работу сервиса)</li>
            <li>На ограничение обработки ваших данных</li>
            <li>На возражение против обработки ваших данных</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. AI-анализ</h2>
          <p className="text-gray-700 mb-6">
            <strong>Важно:</strong> Мы используем AI для анализа содержимого загруженных чатов. 
            При этом:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>AI анализирует только текстовую информацию из чатов</li>
            <li>Результаты анализа хранятся временно и удаляются через 24 часа</li>
            <li>Мы не используем ваши данные для обучения AI моделей</li>
            <li>Анализ проводится исключительно для предоставления вам услуги</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Связь с нами</h2>
          <p className="text-gray-700 mb-6">
            Если у вас есть вопросы по поводу нашей политики конфиденциальности, 
            вы можете связаться с нами по email: privacy@chat-analyzer.ru
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Изменения в политике</h2>
          <p className="text-gray-700">
            Мы можем время от времени обновлять эту политику конфиденциальности. 
            Мы уведомим вас о любых изменениях, разместив новую политику конфиденциальности 
            на этой странице.
          </p>
        </div>
      </div>
    </div>
  )
}