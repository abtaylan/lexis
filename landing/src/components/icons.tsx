// lucide-react v1'de marka/logo ikonları (X, Slack, YouTube, Instagram) kaldırıldığı
// için bunları bağımlılık riski olmadan basit, tutarlı SVG'ler olarak tanımlıyoruz.
export function YoutubeLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.582 7.186a2.51 2.51 0 0 0-1.767-1.778C18.254 5 12 5 12 5s-6.254 0-7.815.408A2.51 2.51 0 0 0 2.418 7.186 26.19 26.19 0 0 0 2 12a26.19 26.19 0 0 0 .418 4.814 2.51 2.51 0 0 0 1.767 1.778C5.746 19 12 19 12 19s6.254 0 7.815-.408a2.51 2.51 0 0 0 1.767-1.778A26.19 26.19 0 0 0 22 12a26.19 26.19 0 0 0-.418-4.814ZM10 15.5v-7l6 3.5-6 3.5Z" />
    </svg>
  );
}

export function InstagramLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SlackLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.194 14.644a2.25 2.25 0 1 1-2.25-2.25h2.25zm1.134 0a2.25 2.25 0 0 1 4.5 0v5.638a2.25 2.25 0 1 1-4.5 0zM9.356 6.194a2.25 2.25 0 1 1 2.25-2.25v2.25zm0 1.134a2.25 2.25 0 0 1 0 4.5H3.718a2.25 2.25 0 1 1 0-4.5zM17.806 9.356a2.25 2.25 0 1 1 2.25 2.25h-2.25zm-1.134 0a2.25 2.25 0 0 1-4.5 0V3.718a2.25 2.25 0 1 1 4.5 0zM14.644 17.806a2.25 2.25 0 1 1-2.25 2.25v-2.25zm0-1.134a2.25 2.25 0 0 1 0-4.5h5.638a2.25 2.25 0 1 1 0 4.5z" />
    </svg>
  );
}

export function LinkedinLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.983 3.5a2 2 0 1 1 0 4.001 2 2 0 0 1 0-4.001zM3.32 8.98h3.325V21H3.32V8.98zM9.353 8.98h3.187v1.645h.045c.444-.84 1.53-1.727 3.148-1.727 3.366 0 3.988 2.216 3.988 5.098V21h-3.324v-5.4c0-1.288-.023-2.945-1.795-2.945-1.797 0-2.073 1.404-2.073 2.852V21H9.353V8.98z" />
    </svg>
  );
}
