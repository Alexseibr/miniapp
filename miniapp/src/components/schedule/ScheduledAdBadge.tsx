import { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { formatPublishAt, getScheduleStatusColor } from '@/utils/dateUtils';

interface ScheduledAdBadgeProps {
  publishAt: Date | string;
  compact?: boolean;
}

export function ScheduledAdBadge({ publishAt, compact = false }: ScheduledAdBadgeProps) {
  const [formatted, setFormatted] = useState(() => formatPublishAt(publishAt));
  const colors = getScheduleStatusColor(publishAt);

  useEffect(() => {
    setFormatted(formatPublishAt(publishAt));
    
    const interval = setInterval(() => {
      setFormatted(formatPublishAt(publishAt));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [publishAt]);

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: colors.text,
        }}
        data-testid="scheduled-badge-compact"
      >
        <Clock size={14} />
        <span>{formatted.relativeLabel}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 12,
      }}
      data-testid="scheduled-badge"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: colors.dot,
            animation: formatted.isVerySoon ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {formatted.isVerySoon
            ? 'Скоро будет опубликовано'
            : formatted.isUrgent
            ? 'Запланировано (скоро)'
            : 'Запланировано'}
        </span>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: '#374151',
          marginBottom: 4,
        }}
      >
        <Calendar size={16} color="#6B7280" />
        <span>Будет опубликовано: <strong>{formatted.dateLabel}</strong></span>
      </div>
      
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#6B7280',
        }}
      >
        <Clock size={14} />
        <span>{formatted.relativeLabel}</span>
      </div>
    </div>
  );
}

interface ScheduledAdChipProps {
  publishAt: Date | string;
}

export function ScheduledAdChip({ publishAt }: ScheduledAdChipProps) {
  const colors = getScheduleStatusColor(publishAt);
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        color: colors.text,
      }}
      data-testid="scheduled-chip"
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors.dot,
        }}
      />
      Запланировано
    </span>
  );
}
