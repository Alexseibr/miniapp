export interface PublishAtFormatted {
  dateLabel: string;
  relativeLabel: string;
  isUrgent: boolean;
  isVerySoon: boolean;
}

export function formatPublishAt(publishAt: Date | string): PublishAtFormatted {
  const date = typeof publishAt === 'string' ? new Date(publishAt) : publishAt;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  const dateLabel = date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const relativeLabel = formatRelativeTime(diffMs);
  const isUrgent = diffMs > 0 && diffMs <= 60 * 60 * 1000;
  const isVerySoon = diffMs > 0 && diffMs <= 10 * 60 * 1000;
  
  return {
    dateLabel,
    relativeLabel,
    isUrgent,
    isVerySoon,
  };
}

export function formatRelativeTime(diffMs: number): string {
  if (diffMs <= 0) {
    return 'Уже опубликовано';
  }
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return 'Менее минуты';
  }
  
  if (minutes < 60) {
    return `Через ${formatMinutes(minutes)}`;
  }
  
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `Через ${formatHours(hours)} ${formatMinutes(remainingMinutes)}`;
    }
    return `Через ${formatHours(hours)}`;
  }
  
  if (days === 1) {
    return 'Через 1 день';
  }
  
  if (days < 5) {
    return `Через ${days} дня`;
  }
  
  return `Через ${days} дней`;
}

function formatMinutes(minutes: number): string {
  if (minutes === 1) return '1 минуту';
  if (minutes >= 2 && minutes <= 4) return `${minutes} минуты`;
  if (minutes >= 5 && minutes <= 20) return `${minutes} минут`;
  
  const lastDigit = minutes % 10;
  if (lastDigit === 1) return `${minutes} минуту`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${minutes} минуты`;
  return `${minutes} минут`;
}

function formatHours(hours: number): string {
  if (hours === 1) return '1 час';
  if (hours >= 2 && hours <= 4) return `${hours} часа`;
  if (hours >= 5 && hours <= 20) return `${hours} часов`;
  
  const lastDigit = hours % 10;
  if (lastDigit === 1) return `${hours} час`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${hours} часа`;
  return `${hours} часов`;
}

export function getScheduleStatusColor(publishAt: Date | string): {
  background: string;
  border: string;
  text: string;
  dot: string;
} {
  const date = typeof publishAt === 'string' ? new Date(publishAt) : publishAt;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs <= 10 * 60 * 1000) {
    return {
      background: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      dot: '#EF4444',
    };
  }
  
  if (diffMs <= 60 * 60 * 1000) {
    return {
      background: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      dot: '#F59E0B',
    };
  }
  
  return {
    background: '#EEF2FF',
    border: '#C7D2FE',
    text: '#4338CA',
    dot: '#6366F1',
  };
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isScheduled(status: string, publishAt?: Date | string | null): boolean {
  return status === 'scheduled' && !!publishAt;
}
