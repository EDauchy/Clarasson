"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AppHomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function createRoom() {
    setError("");
    setCreating(true);
    const res = await fetch("/api/rooms", { method: "POST" });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Impossible de créer la room.");
      return;
    }
    router.push(`/app/room/${data.room.code}`);
  }

  async function joinRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    setJoining(true);
    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setJoining(false);
    if (!res.ok) {
      setError(data.error || "Impossible de rejoindre.");
      return;
    }
    router.push(`/app/room/${data.room.code}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="brand-mark text-2xl text-[var(--teal-deep)]">
          Selon Toi
        </Link>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Déconnexion
        </button>
      </header>

      <div className="mt-14 animate-rise">
        <p className="text-sm uppercase tracking-[0.12em] text-[rgba(12,47,44,0.55)]">
          Bonjour {session?.user?.name}
        </p>
        <h1 className="brand-mark mt-2 text-4xl sm:text-5xl">À deux, pas plus.</h1>
        <p className="mt-3 max-w-md text-[rgba(12,47,44,0.75)]">
          Crée une room et partage le code, ou entre celui que ton partenaire t&apos;a envoyé.
        </p>
      </div>

      <div className="mt-10 grid gap-5">
        <section className="panel animate-rise">
          <h2 className="font-semibold text-xl">Créer une room</h2>
          <p className="mt-1 text-sm text-[rgba(12,47,44,0.65)]">
            Tu obtiens un code d&apos;invitation à partager.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-5"
            onClick={createRoom}
            disabled={creating}
          >
            {creating ? "Création…" : "Créer ma room"}
          </button>
        </section>

        <section className="panel animate-rise-delay">
          <h2 className="font-semibold text-xl">Rejoindre avec un code</h2>
          <form onSubmit={joinRoom} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="field uppercase tracking-[0.2em]"
              placeholder="XK7M2P"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              minLength={4}
              maxLength={12}
            />
            <button className="btn btn-primary shrink-0" type="submit" disabled={joining}>
              {joining ? "…" : "Rejoindre"}
            </button>
          </form>
        </section>

        {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
      </div>
    </main>
  );
}
