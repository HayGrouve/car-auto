export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Политика за поверителност</h1>
      <p className="text-sm text-muted-foreground">
        Тази страница описва как събираме и обработваме лични данни съгласно GDPR.
      </p>
      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-medium">Съгласие</h2>
        <p>Събираме минимални данни за собственици: име, телефон, имейл (по избор), адрес (по избор).</p>
        <p>Съгласието може да бъде оттеглено по всяко време.</p>
      </section>
      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-medium">Права на субектите</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Достъп/експорт на данни</li>
          <li>Корекция</li>
          <li>Изтриване (при законови ограничения се прилага правен запор)</li>
        </ul>
      </section>
    </main>
  );
}


