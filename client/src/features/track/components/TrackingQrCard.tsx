import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ExternalLink, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

function buildTrackUrl(code: string): string {
  const base = env.publicTrackingBase.replace(/\/+$/, '');
  return `${base}/track/${encodeURIComponent(code)}`;
}

function qrImageUrl(data: string, size = 180): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data,
    margin: '12',
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

/**
 * Staff-facing card on the repair detail page.
 * Shows a QR that opens the public tracking page for this ticket code.
 */
export function TrackingQrCard({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const trackUrl = useMemo(() => buildTrackUrl(code), [code]);
  const qrSrc = useMemo(() => qrImageUrl(trackUrl), [trackUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select nothing — browsers without clipboard still have Open
    }
  };

  return (
    <Card>
      <CardHeader
        title={t('track.qr.title')}
        action={
          <span className="inline-flex items-center gap-1.5 text-2xs text-foreground-subtle">
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            {t('track.qr.badge')}
          </span>
        }
      />
      <div className="flex flex-col items-center gap-4 px-2 pb-1">
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <img
            src={qrSrc}
            alt={t('track.qr.alt', { code })}
            width={180}
            height={180}
            className="h-[180px] w-[180px]"
            loading="lazy"
          />
        </div>

        <p className="text-center text-xs text-foreground-muted">{t('track.qr.hint')}</p>

        <p className="numeric w-full truncate rounded-lg border border-border bg-surface-sunken px-3 py-2 text-center text-xs text-foreground-subtle" dir="ltr">
          {trackUrl}
        </p>

        <div className="flex w-full flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            leadingIcon={
              copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />
            }
            onClick={() => void copyLink()}
          >
            {copied ? t('track.qr.copied') : t('track.qr.copy')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            leadingIcon={<ExternalLink className="h-3.5 w-3.5" />}
            onClick={() => window.open(trackUrl, '_blank', 'noopener,noreferrer')}
          >
            {t('track.qr.open')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { buildTrackUrl, qrImageUrl };
