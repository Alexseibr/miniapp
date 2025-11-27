import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  AlertTriangle,
  Calendar,
  DollarSign,
  Image,
  MapPin,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryEvent {
  _id: string;
  eventType: 'created' | 'updated' | 'status_changed' | 'moderation' | 'price_changed' | 'published' | 'scheduled' | 'viewed';
  description: string;
  timestamp: string;
  performedBy?: {
    type: 'user' | 'system' | 'admin';
    id?: string;
    name?: string;
  };
  changes?: {
    field: string;
    oldValue?: string | number;
    newValue?: string | number;
  }[];
  metadata?: Record<string, unknown>;
}

interface AdHistoryTimelineProps {
  adId: string;
}

const eventIcons: Record<string, typeof Clock> = {
  created: CheckCircle,
  updated: Edit,
  status_changed: RefreshCw,
  moderation: AlertTriangle,
  price_changed: DollarSign,
  published: Calendar,
  scheduled: Clock,
  viewed: Eye,
};

const eventColors: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  status_changed: 'bg-orange-500',
  moderation: 'bg-yellow-500',
  price_changed: 'bg-purple-500',
  published: 'bg-emerald-500',
  scheduled: 'bg-indigo-500',
  viewed: 'bg-gray-400',
};

const eventLabels: Record<string, string> = {
  created: 'Создано',
  updated: 'Обновлено',
  status_changed: 'Статус изменён',
  moderation: 'Модерация',
  price_changed: 'Цена изменена',
  published: 'Опубликовано',
  scheduled: 'Запланировано',
  viewed: 'Просмотр',
};

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
  } catch {
    return timestamp;
  }
}

function TimelineEvent({ event, isLast }: { event: HistoryEvent; isLast: boolean }) {
  const IconComponent = eventIcons[event.eventType] || Clock;
  const colorClass = eventColors[event.eventType] || 'bg-gray-500';

  return (
    <div className="relative pl-8 pb-6" data-testid={`timeline-event-${event._id}`}>
      {!isLast && (
        <div
          className="absolute left-3 top-8 bottom-0 w-0.5 bg-border"
          aria-hidden="true"
        />
      )}
      
      <div
        className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full ${colorClass}`}
      >
        <IconComponent className="h-3 w-3 text-white" />
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {eventLabels[event.eventType] || event.eventType}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>
        
        <p className="text-sm text-foreground">{event.description}</p>
        
        {event.performedBy && (
          <p className="text-xs text-muted-foreground">
            {event.performedBy.type === 'system' && 'Система'}
            {event.performedBy.type === 'admin' && `Админ: ${event.performedBy.name || event.performedBy.id}`}
            {event.performedBy.type === 'user' && `Пользователь: ${event.performedBy.name || event.performedBy.id}`}
          </p>
        )}
        
        {event.changes && event.changes.length > 0 && (
          <div className="mt-2 text-xs bg-muted rounded p-2 space-y-1">
            {event.changes.map((change, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="font-medium">{change.field}:</span>
                {change.oldValue !== undefined && (
                  <span className="text-red-500 line-through">{String(change.oldValue)}</span>
                )}
                {change.newValue !== undefined && (
                  <span className="text-green-600">{String(change.newValue)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdHistoryTimeline({ adId }: AdHistoryTimelineProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/ads/${adId}/history`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить историю');
      }
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load ad history:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adId) {
      fetchHistory();
    }
  }, [adId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            История объявления
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            История объявления
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            История объявления
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-sm text-muted-foreground">История пока пуста</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="ad-history-timeline">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          История объявления
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchHistory}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-0">
            {events.map((event, index) => (
              <TimelineEvent
                key={event._id}
                event={event}
                isLast={index === events.length - 1}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
