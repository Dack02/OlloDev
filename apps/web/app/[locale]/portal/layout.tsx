import { useTranslations } from "next-intl";

function PortalHeader() {
  const t = useTranslations("portal");
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex h-14 items-center gap-3">
          <span className="text-base font-bold text-gray-900">Ollo Dev</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{t("support")}</span>
        </div>
      </div>
    </header>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
