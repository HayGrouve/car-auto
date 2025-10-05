"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, Lock, LogIn } from "lucide-react";

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
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const data = (await res.json()) as { message?: string };
    setError(data?.message ?? "Грешни данни за вход");
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="bg-card w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-xl font-semibold">Вход</h1>
        {error && <div className="text-destructive text-sm">{error}</div>}
        <div className="space-y-1">
          <Label
            htmlFor="login-email"
            className="inline-flex items-center gap-2"
          >
            <Mail className="size-4" /> Имейл
          </Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="login-password"
            className="inline-flex items-center gap-2"
          >
            <Lock className="size-4" /> Парола
          </Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center gap-2"
        >
          <LogIn className="size-4" />
          {loading ? "Влизане..." : "Влизане"}
        </Button>
      </form>
    </main>
  );
}
