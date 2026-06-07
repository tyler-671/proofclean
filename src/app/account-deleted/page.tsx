import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export default function AccountDeletedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7fafa] px-4 py-6 font-[family-name:var(--font-geist-sans)] sm:px-6">
      <nav className="mx-auto w-full max-w-6xl">
        <Link href="/" className="transition hover:opacity-80">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 220 40"
            className="h-10 w-auto"
            aria-label="ProofClean"
            role="img"
          >
            <text
              x="0"
              y="30"
              fontFamily="var(--font-geist-sans), 'Lexend Deca', sans-serif"
              fontSize="28"
              fontWeight="700"
              fill="#111827"
            >
              Proof
            </text>
            <text
              x="76"
              y="30"
              fontFamily="var(--font-geist-sans), 'Lexend Deca', sans-serif"
              fontSize="28"
              fontWeight="700"
              fill="#10b981"
            >
              Clean
            </text>
          </svg>
        </Link>
      </nav>

      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[480px]">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
            <CheckCircleIcon
              className="mx-auto h-16 w-16 text-emerald-500"
              aria-hidden
            />
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Your account has been deleted
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              Your subscription has been canceled and all your data has been permanently
              removed. Thank you for trying ProofClean.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Back to home
            </Link>
            <p className="mt-6 text-sm text-slate-600">
              <Link
                href="/signup"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
