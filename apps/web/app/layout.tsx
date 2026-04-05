import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ollo Dev",
  description: "Communication & helpdesk platform for teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
