"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Inscription impossible.");
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("Compte créé, mais connexion échouée. Va sur Connexion.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="brand-mark mb-10 text-2xl text-[var(--teal-deep)]">
        Selon Toi
      </Link>
      <h1 className="brand-mark text-4xl">Inscription</h1>
      <p className="mt-2 text-[rgba(12,47,44,0.7)]">Crée ton compte pour inviter quelqu&apos;un.</p>

      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 animate-rise">
        <div>
          <label className="label" htmlFor="name">
            Prénom / pseudo
          </label>
          <input
            id="name"
            className="field"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe (6+ caractères)
          </label>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[rgba(12,47,44,0.7)]">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-[var(--teal-deep)] underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
