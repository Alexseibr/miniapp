import { CheckCircle } from 'lucide-react';

interface JustPublishedChipProps {
  className?: string;
}

export function JustPublishedChip({ className }: JustPublishedChipProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        color: '#065f46',
        animation: 'justPublishedPulse 2s ease-out',
      }}
      data-testid="chip-just-published"
    >
      <CheckCircle size={14} />
      Только что опубликовано
    </div>
  );
}

export function isJustPublished(ad: { status?: string; publishAt?: string | Date | null; updatedAt?: string | Date | null; createdAt?: string | Date | null }): boolean {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  if (ad.status === 'active') {
    if (ad.publishAt) {
      const publishTime = new Date(ad.publishAt).getTime();
      if (publishTime <= now && now - publishTime < tenMinutes) {
        return true;
      }
    }
    
    const referenceDate = ad.updatedAt || ad.createdAt;
    if (referenceDate) {
      const referenceTime = new Date(referenceDate).getTime();
      if (now - referenceTime < tenMinutes) {
        return true;
      }
    }
  }
  
  if (ad.status === 'scheduled' && ad.publishAt) {
    const publishTime = new Date(ad.publishAt).getTime();
    if (publishTime > now && publishTime - now < tenMinutes) {
      return true;
    }
  }
  
  return false;
}
