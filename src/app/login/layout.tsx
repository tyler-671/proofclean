import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your ProofClean account.",
  robots: { index: false },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
