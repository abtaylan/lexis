'use client';

import Image from 'next/image';
import { Mail, Send } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { LOGIN_URL, REGISTER_URL, CONTACT_EMAIL, SOCIAL_LINKS } from '@/lib/config';
import { XLogoIcon, SlackLogoIcon, YoutubeLogoIcon, InstagramLogoIcon, LinkedinLogoIcon } from './icons';

const ICONS = {
  youtube: YoutubeLogoIcon,
  instagram: InstagramLogoIcon,
  x: XLogoIcon,
  telegram: Send,
  slack: SlackLogoIcon,
  linkedin: LinkedinLogoIcon,
};

export function Footer() {
  const { t } = useLocale();

  return (
    <footer id="contact" className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Image src="/logo-icon.png" alt="Lexis" width={28} height={28} className="rounded-lg" />
              <span className="text-base font-bold text-gray-900">Lexis</span>
            </div>
            <p className="mt-3 text-sm text-gray-500 max-w-xs leading-relaxed">{t('footerTagline')}</p>

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[var(--brand-600)] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {CONTACT_EMAIL}
            </a>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{t('footerSocialHeading')}</div>
              <div className="flex items-center gap-2 flex-wrap">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = ICONS[social.key];
                  const disabled = !social.href;
                  return (
                    <a
                      key={social.key}
                      href={social.href ?? undefined}
                      target={social.href ? '_blank' : undefined}
                      rel={social.href ? 'noopener noreferrer' : undefined}
                      aria-disabled={disabled}
                      title={disabled ? `${social.label} — ${t('footerComingSoon')}` : social.label}
                      className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
                        disabled
                          ? 'border-gray-100 text-gray-300 cursor-not-allowed pointer-events-none'
                          : 'border-gray-200 text-gray-500 hover:border-[var(--brand-400)] hover:text-[var(--brand-600)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{t('footerProductHeading')}</div>
            <ul className="space-y-2.5 text-sm">
              <li><a href={LOGIN_URL} className="text-gray-600 hover:text-gray-900 transition-colors">{t('footerLinkLogin')}</a></li>
              <li><a href={REGISTER_URL} className="text-gray-600 hover:text-gray-900 transition-colors">{t('footerLinkRegister')}</a></li>
              <li><a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">{t('footerLinkFeatures')}</a></li>
              <li><a href="#how" className="text-gray-600 hover:text-gray-900 transition-colors">{t('footerLinkHow')}</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{t('footerCompanyHeading')}</div>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">{t('footerLinkFaq')}</a></li>
              <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-gray-600 hover:text-gray-900 transition-colors">{t('footerLinkContact')}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Lexis. {t('footerRights')}</span>
        </div>
      </div>
    </footer>
  );
}
