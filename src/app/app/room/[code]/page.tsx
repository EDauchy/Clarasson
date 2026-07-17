"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import questionsBank from "@/data/questions.json";

type PublicAnswer = {
  userId: string;
  userName: string;
  hasOwn: boolean;
  hasGuess: boolean;
  ownChoice?: string | null;
  guessChoice?: string | null;
};

type RoomState = {
  id: string;
  code: string;
  memberCount: number;
  isFull: boolean;
  members: { id: string; name: string }[];
  partner: { id: string; name: string } | null;
  question: {
    id: string;
    prompt: string;
    optionA: string;
    optionB: string;
    phase: string;
    answers: PublicAnswer[] | null;
  } | null;
};

function choiceLabel(choice: string | null | undefined, optionA: string, optionB: string) {
  if (choice === "A") return optionA;
  if (choice === "B") return optionB;
  return "—";
}

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("Tu préfères");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Impossible de charger la room.");
      setLoading(false);
      return;
    }
    setRoom(data.room);
    setError("");
    setLoading(false);
  }, [code]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const myAnswer = useMemo(() => {
    if (!room?.question?.answers || !userId) return null;
    return room.question.answers.find((a) => a.userId === userId) ?? null;
  }, [room, userId]);

  async function copyCode() {
    await navigator.clipboard.writeText(room?.code ?? code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function pickRandomQuestion() {
    const item = questionsBank[Math.floor(Math.random() * questionsBank.length)];
    setPrompt(item.question);
    setOptionA(item.réponse1);
    setOptionB(item.réponse2);
  }

  async function createQuestion(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rooms/${code}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, optionA, optionB }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Impossible de créer la question.");
      return;
    }
    setRoom(data.room);
    setOptionA("");
    setOptionB("");
  }

  async function launchRandomQuestion() {
    const item = questionsBank[Math.floor(Math.random() * questionsBank.length)];
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rooms/${code}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: item.question,
        optionA: item.réponse1,
        optionB: item.réponse2,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Impossible de créer la question.");
      return;
    }
    setRoom(data.room);
    setOptionA("");
    setOptionB("");
  }

  async function submitOwn(choice: "A" | "B") {
    if (!room?.question) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rooms/${code}/own`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: room.question.id, choice }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Impossible d'enregistrer.");
      return;
    }
    setRoom(data.room);
  }

  async function submitGuess(choice: "A" | "B") {
    if (!room?.question) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rooms/${code}/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: room.question.id, choice }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Impossible d'enregistrer.");
      return;
    }
    setRoom(data.room);
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <p className="animate-pulse-soft text-[rgba(12,47,44,0.65)]">Chargement de la room…</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <p className="text-[var(--coral)]">{error || "Room introuvable."}</p>
        <Link href="/app" className="btn btn-secondary mt-4 w-fit">
          Retour
        </Link>
      </main>
    );
  }

  const q = room.question;
  const canCreateQuestion = room.isFull && (!q || q.phase === "revealed");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <Link href="/app" className="brand-mark text-2xl text-[var(--teal-deep)]">
          Selon Toi
        </Link>
        <button type="button" className="btn btn-secondary" onClick={copyCode}>
          {copied ? "Copié !" : `Code ${room.code}`}
        </button>
      </header>

      <div className="mt-10 animate-rise">
        <p className="text-sm uppercase tracking-[0.12em] text-[rgba(12,47,44,0.55)]">
          Room · {room.memberCount}/2
        </p>
        <h1 className="brand-mark mt-2 text-4xl">
          {room.partner ? `Avec ${room.partner.name}` : "En attente…"}
        </h1>
        {!room.isFull && (
          <p className="mt-3 text-[rgba(12,47,44,0.75)]">
            Partage le code <strong className="tracking-[0.15em]">{room.code}</strong> pour
            inviter quelqu&apos;un. La room reste à deux.
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-[var(--coral)]">{error}</p>}

      {!room.isFull && (
        <div className="panel mt-8 animate-pulse-soft">
          <p className="font-semibold">En attente du partenaire</p>
          <p className="mt-1 text-sm text-[rgba(12,47,44,0.65)]">
            Dès qu&apos;il rejoint, vous pourrez lancer une question.
          </p>
        </div>
      )}

      {canCreateQuestion && (
        <form onSubmit={createQuestion} className="panel mt-8 space-y-4 animate-rise">
          <h2 className="text-xl font-semibold">
            {q?.phase === "revealed" ? "Nouvelle question" : "Lancer une question"}
          </h2>
          <p className="text-sm text-[rgba(12,47,44,0.65)]">
            Banque de {questionsBank.length} questions prêtes à l&apos;emploi.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={launchRandomQuestion}
            >
              {busy ? "…" : "Question au hasard"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={pickRandomQuestion}
            >
              Remplir au hasard
            </button>
          </div>
          <div>
            <label className="label" htmlFor="prompt">
              Intitulé
            </label>
            <input
              id="prompt"
              className="field"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tu préfères"
            />
          </div>
          <div>
            <label className="label" htmlFor="optionA">
              Option A
            </label>
            <input
              id="optionA"
              className="field"
              required
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              placeholder="la montagne"
            />
          </div>
          <div>
            <label className="label" htmlFor="optionB">
              Option B
            </label>
            <input
              id="optionB"
              className="field"
              required
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              placeholder="la plage"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "…" : "Lancer"}
          </button>
        </form>
      )}

      {q && q.phase === "waiting_own" && (
        <section className="mt-8 animate-rise">
          <p className="text-sm uppercase tracking-[0.12em] text-[rgba(12,47,44,0.55)]">
            Phase 1 · Secret
          </p>
          <h2 className="brand-mark mt-2 text-3xl sm:text-4xl">{q.prompt}</h2>
          <p className="mt-2 text-[rgba(12,47,44,0.7)]">
            Réponds pour toi. Ton choix reste caché jusqu&apos;à la révélation.
          </p>

          {myAnswer?.hasOwn ? (
            <div className="panel mt-6">
              <p className="font-semibold">Choix enregistré</p>
              <p className="mt-1 text-sm text-[rgba(12,47,44,0.65)]">
                On attend que {room.partner?.name ?? "l'autre"} réponde aussi…
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                className="btn-choice"
                disabled={busy}
                onClick={() => submitOwn("A")}
              >
                {q.optionA}
              </button>
              <button
                type="button"
                className="btn-choice"
                disabled={busy}
                onClick={() => submitOwn("B")}
              >
                {q.optionB}
              </button>
            </div>
          )}
        </section>
      )}

      {q && q.phase === "waiting_guess" && (
        <section className="mt-8 animate-rise">
          <p className="text-sm uppercase tracking-[0.12em] text-[rgba(12,47,44,0.55)]">
            Phase 2 · Guess
          </p>
          <h2 className="brand-mark mt-2 text-3xl sm:text-4xl">
            Selon toi, {room.partner?.name ?? "l'autre"} préfère…
          </h2>
          <p className="mt-2 text-[rgba(12,47,44,0.7)]">
            {q.prompt} — essaie de deviner son vrai choix.
          </p>

          {myAnswer?.hasGuess ? (
            <div className="panel mt-6">
              <p className="font-semibold">Guess enregistré</p>
              <p className="mt-1 text-sm text-[rgba(12,47,44,0.65)]">
                En attente du guess de {room.partner?.name ?? "l'autre"}…
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                className="btn-choice"
                disabled={busy}
                onClick={() => submitGuess("A")}
              >
                {q.optionA}
              </button>
              <button
                type="button"
                className="btn-choice"
                disabled={busy}
                onClick={() => submitGuess("B")}
              >
                {q.optionB}
              </button>
            </div>
          )}
        </section>
      )}

      {q && q.phase === "revealed" && q.answers && (
        <section className="mt-8 animate-rise">
          <p className="text-sm uppercase tracking-[0.12em] text-[rgba(12,47,44,0.55)]">
            Révélation
          </p>
          <h2 className="brand-mark mt-2 text-3xl">{q.prompt}</h2>
          <p className="mt-1 text-[rgba(12,47,44,0.65)]">
            {q.optionA} · {q.optionB}
          </p>

          <div className="mt-6 space-y-4">
            {room.members.map((member) => {
              const own = q.answers!.find((a) => a.userId === member.id);
              const guesser = q.answers!.find((a) => a.userId !== member.id);
              const correct = Boolean(
                own?.ownChoice && guesser?.guessChoice && own.ownChoice === guesser.guessChoice
              );
              const guesserName = guesser?.userName ?? "L'autre";

              return (
                <div key={member.id} className="panel">
                  <p className="font-semibold text-lg">{member.name}</p>
                  <p className="mt-2 text-[rgba(12,47,44,0.8)]">
                    Vraie préférence :{" "}
                    <strong>
                      {choiceLabel(own?.ownChoice, q.optionA, q.optionB)}
                    </strong>
                  </p>
                  <p className="mt-1 text-[rgba(12,47,44,0.8)]">
                    {guesserName} a deviné :{" "}
                    <strong>
                      {choiceLabel(guesser?.guessChoice, q.optionA, q.optionB)}
                    </strong>
                  </p>
                  <p
                    className={`mt-3 font-semibold ${
                      correct ? "text-[var(--teal)]" : "text-[var(--coral)]"
                    }`}
                  >
                    {correct
                      ? `${guesserName} a deviné juste`
                      : `${guesserName} s'est trompé`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
