import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ProofClean is a flat $59 CAD/month — unlimited cleaners and locations, no per-seat fees. 30-day money-back guarantee, cancel anytime.",
};

export default function PricingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
