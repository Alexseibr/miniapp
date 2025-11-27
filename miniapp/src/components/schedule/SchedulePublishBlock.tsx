import { useState, useEffect } from 'react';
import { Clock, Calendar, Zap } from 'lucide-react';
import { IOSDateTimePicker } from './IOSDateTimePicker';

interface SchedulePublishBlockProps {
  publishAt: Date | null;
  onChange: (next: Date | null) => void;
}

export function SchedulePublishBlock({ publishAt, onChange }: SchedulePublishBlockProps) {
  const [mode, setMode] = useState<'now' | 'later'>(publishAt ? 'later' : 'now');
  
  useEffect(() => {
    if (publishAt && mode === 'now') {
      setMode('later');
    }
  }, [publishAt, mode]);

  const handleModeChange = (newMode: 'now' | 'later') => {
    setMode(newMode);
    if (newMode === 'now') {
      onChange(null);
    } else {
      const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
      defaultDate.setMinutes(Math.ceil(defaultDate.getMinutes() / 5) * 5, 0, 0);
      onChange(defaultDate);
    }
  };

  const minDate = new Date(Date.now() + 5 * 60 * 1000);

  return (
    <div data-testid="schedule-publish-block">
      <h3
        style={{
          fontSize: 20,
          fontWeight: 600,
          margin: '0 0 16px',
          color: '#111827',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Calendar size={22} color="#3B73FC" />
        Когда опубликовать?
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={() => handleModeChange('now')}
          style={{
            width: '100%',
            padding: '16px 18px',
            background: mode === 'now' ? '#EBF3FF' : '#fff',
            border: `2px solid ${mode === 'now' ? '#3B73FC' : '#E5E7EB'}`,
            borderRadius: 14,
            fontSize: 16,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transition: 'all 0.2s ease',
          }}
          data-testid="button-publish-now"
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${mode === 'now' ? '#3B73FC' : '#D1D5DB'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'border-color 0.2s',
            }}
          >
            {mode === 'now' && (
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#3B73FC',
                }}
              />
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                color: mode === 'now' ? '#3B73FC' : '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Zap size={16} />
              Опубликовать сейчас
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              Объявление сразу появится в каталоге
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('later')}
          style={{
            width: '100%',
            padding: '16px 18px',
            background: mode === 'later' ? '#EBF3FF' : '#fff',
            border: `2px solid ${mode === 'later' ? '#3B73FC' : '#E5E7EB'}`,
            borderRadius: 14,
            fontSize: 16,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transition: 'all 0.2s ease',
          }}
          data-testid="button-publish-later"
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${mode === 'later' ? '#3B73FC' : '#D1D5DB'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'border-color 0.2s',
            }}
          >
            {mode === 'later' && (
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#3B73FC',
                }}
              />
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                color: mode === 'later' ? '#3B73FC' : '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Clock size={16} />
              Запланировать на позже
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              Выберите дату и время публикации
            </div>
          </div>
        </button>
      </div>

      {mode === 'later' && (
        <div
          style={{
            marginTop: 20,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          
          <IOSDateTimePicker
            value={publishAt}
            min={minDate}
            onChange={onChange}
          />
          
          {publishAt && (
            <div
              style={{
                marginTop: 16,
                padding: '14px 16px',
                background: '#F0F9FF',
                borderRadius: 12,
                border: '1px solid #BAE6FD',
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  color: '#0369A1',
                  fontWeight: 500,
                }}
              >
                Объявление будет опубликовано:
              </div>
              <div
                style={{
                  fontSize: 17,
                  color: '#0C4A6E',
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {publishAt.toLocaleString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: '12px 14px',
          background: '#F9FAFB',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 12,
            color: '#6B7280',
            fontWeight: 600,
          }}
        >
          i
        </div>
        <p
          style={{
            fontSize: 14,
            color: '#6B7280',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {mode === 'later'
            ? 'Объявление появится в поиске и ленте автоматически в указанное время.'
            : 'Объявление сразу станет видно покупателям после публикации.'}
        </p>
      </div>
    </div>
  );
}
