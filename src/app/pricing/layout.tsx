import type { Metadata } from "next";

const PRICING_DESCRIPTION =
  "ProofClean is a flat $59 CAD/month — unlimited cleaners and locations, no per-seat fees. 30-day money-back guarantee, cancel anytime.";

export const metadata: Metadata = {
  title: "Pricing",
  description: PRICING_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — ProofClean",
    description: PRICING_DESCRIPTION,
    url: "/pricing",
    siteName: "ProofClean",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
