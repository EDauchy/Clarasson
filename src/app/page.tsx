import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-16 pt-8">
      <header className="flex items-center justify-between animate-rise">
        <p className="brand-mark text-2xl text-[var(--teal-deep)]">Selon Toi</p>
        <nav className="flex items-center gap-3">
          {session ? (
            <Link href="/app" className="btn btn-primary">
              Ouvrir l&apos;app
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary">
                Connexion
              </Link>
              <Link href="/register" className="btn btn-primary">
                S&apos;inscrire
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mt-16 flex flex-1 flex-col justify-center md:mt-24">
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -right-8 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(26,107,99,0.25),transparent_70%)] md:h-80 md:w-80"
        />
        <div
          aria-hidden
          className="animate-pulse-soft pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(212,101,74,0.2),transparent_70%)]"
        />

        <h1 className="brand-mark animate-rise max-w-3xl text-5xl text-[var(--ink)] sm:text-6xl md:text-7xl">
          Selon Toi
        </h1>
        <p className="animate-rise-delay mt-6 max-w-xl text-lg leading-relaxed text-[rgba(12,47,44,0.78)] sm:text-xl">
          Invite quelqu&apos;un dans une room à deux. Chacun répond en secret, puis
          tente de deviner ce que l&apos;autre préfère.
        </p>
        <div className="animate-rise-delay mt-10 flex flex-wrap gap-3">
          <Link href={session ? "/app" : "/register"} className="btn btn-primary">
            {session ? "Créer une room" : "Commencer"}
          </Link>
          {!session && (
            <Link href="/login" className="btn btn-secondary">
              J&apos;ai déjà un compte
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
