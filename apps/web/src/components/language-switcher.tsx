'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const toggle = () => {
    const next = locale === 'ko' ? 'en' : 'ko';
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-xs font-medium px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
    >
      {locale === 'ko' ? 'EN' : '한국어'}
    </button>
  );
}
