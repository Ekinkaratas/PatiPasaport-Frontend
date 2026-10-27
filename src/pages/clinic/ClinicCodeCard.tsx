import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/icons';

function consentLinkFor(clinicId: string, origin: string): string {
  return `${origin}/panel/consents/new?clinic=${encodeURIComponent(clinicId)}`;
}

type CopyTarget = 'code' | 'link' | null;

export function ClinicCodeCard({ clinicId }: { clinicId: string }) {
  const { t } = useTranslation('clinic');
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const link = consentLinkFor(clinicId, window.location.origin);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (target: Exclude<CopyTarget, null>, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
    } catch {
      setCopied(null);
    }
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(
      new Blob([markup], { type: 'image/svg+xml' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'patipasaport-klinik-qr.svg';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          ref={qrRef}
          className="mx-auto shrink-0 rounded-2xl bg-white p-3 ring-1 ring-cream-300 sm:mx-0"
        >
          <QRCodeSVG
            value={link}
            size={156}
            level="M"
            marginSize={1}
            title={t('code.qrLabel')}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-fg">{t('code.title')}</h2>
          <p className="mt-1 text-fg-muted">{t('code.lead')}</p>
          <p className="mt-4 rounded-xl bg-bg px-4 py-3 font-mono text-sm break-all text-fg select-all">
            {clinicId}
          </p>
          <p className="mt-4 text-sm font-semibold text-fg-muted">
            {t('code.linkLabel')}
          </p>
          <p className="mt-1 text-sm break-all text-fg">{link}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy('code', clinicId)}
            >
              {copied === 'code' && <CheckIcon className="size-4" />}
              {copied === 'code' ? t('code.copied') : t('code.copyCode')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy('link', link)}
            >
              {copied === 'link' && <CheckIcon className="size-4" />}
              {copied === 'link' ? t('code.copied') : t('code.copyLink')}
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadQr}>
              {t('code.downloadQr')}
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? t('code.copied') : ''}
          </p>
        </div>
      </div>
    </section>
  );
}
