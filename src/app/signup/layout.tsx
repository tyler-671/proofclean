import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your ProofClean account.",
  robots: { index: false },
};

export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
