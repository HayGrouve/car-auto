"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json();
      setError(data?.message ?? "Грешни данни за вход");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-lg p-6 bg-card">
        <h1 className="text-xl font-semibold">Вход</h1>
        {error && <div className="text-destructive text-sm">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm">Имейл</label>
          <input
            className="w-full h-10 px-3 border rounded-md bg-background"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Парола</label>
          <input
            className="w-full h-10 px-3 border rounded-md bg-background"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Влизане..." : "Влизане"}
        </Button>
      </form>
    </main>
  );
}


