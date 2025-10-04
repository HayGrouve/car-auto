export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Политика за поверителност</h1>
      <p className="text-muted-foreground text-sm">
        Тази страница описва как събираме и обработваме лични данни съгласно
        GDPR.
      </p>
      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-medium">Съгласие</h2>
        <p>
          Събираме минимални данни за собственици: име, телефон, имейл (по
          избор), адрес (по избор).
        </p>
        <p>Съгласието може да бъде оттеглено по всяко време.</p>
      </section>
      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-medium">Права на субектите</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Достъп/експорт на данни</li>
          <li>Корекция</li>
          <li>Изтриване (при законови ограничения се прилага правен запор)</li>
        </ul>
      </section>
      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-medium">Съхранение и минимизация</h2>
        <p>
          Съхраняваме само необходимите данни за предоставяне на услугата.
          Прилагаме минимизация и периодично преглеждаме непотребни записи.
        </p>
        <p>
          Сроковете за съхранение се определят от законови изисквания и
          медицинска документация; при конфликт се използва правен запор (legal
          hold).
        </p>
      </section>
    </main>
  );
}
