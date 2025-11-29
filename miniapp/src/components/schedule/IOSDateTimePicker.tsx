import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface IOSDateTimePickerProps {
  value: Date | null;
  min?: Date;
  max?: Date;
  onChange: (next: Date | null) => void;
}

interface DateOption {
  date: Date;
  label: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

function formatDateLabel(date: Date, today: Date): string {
  const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfWeek = date.toLocaleDateString('ru-RU', { weekday: 'short' });
  const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  
  if (diffDays === 0) return `Сегодня, ${dayMonth}`;
  if (diffDays === 1) return `Завтра, ${dayMonth}`;
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, ${dayMonth}`;
}

function generateDates(days: number, minDate?: Date): DateOption[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dates: DateOption[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push({
      date,
      label: formatDateLabel(date, today),
    });
  }
  return dates;
}

function generateHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

function generateMinutes(step: number = 5): number[] {
  const minutes: number[] = [];
  for (let i = 0; i < 60; i += step) {
    minutes.push(i);
  }
  return minutes;
}

function roundToNearestMinuteStep(date: Date, step: number): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const roundedMinutes = Math.ceil(minutes / step) * step;
  result.setMinutes(roundedMinutes, 0, 0);
  if (roundedMinutes >= 60) {
    result.setHours(result.getHours() + 1);
    result.setMinutes(0, 0, 0);
  }
  return result;
}

interface WheelColumnProps {
  items: { value: number | Date; label: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testId: string;
}

function WheelColumn({ items, selectedIndex, onSelect, testId }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const scrollTop = selectedIndex * ITEM_HEIGHT;
      containerRef.current.scrollTop = scrollTop;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    isScrollingRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
      
      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });
      
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 100);
    }, 80);
  }, [items.length, selectedIndex, onSelect]);

  return (
    <div
      style={{
        position: 'relative',
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * CENTER_INDEX,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          background: 'rgba(59, 115, 252, 0.08)',
          borderRadius: 8,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        data-testid={testId}
      >
        <style>{`
          [data-testid="${testId}"]::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        <div style={{ height: ITEM_HEIGHT * CENTER_INDEX }} />
        
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.3;
          const scale = distance === 0 ? 1 : 0.9;
          
          return (
            <div
              key={index}
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: index * ITEM_HEIGHT,
                    behavior: 'smooth',
                  });
                }
                onSelect(index);
              }}
              style={{
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'center',
                cursor: 'pointer',
                opacity,
                transform: `scale(${scale})`,
                transition: 'opacity 0.15s, transform 0.15s',
                fontSize: 17,
                fontWeight: distance === 0 ? 600 : 400,
                color: distance === 0 ? '#3B73FC' : '#374151',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                padding: '0 4px',
              }}
            >
              {item.label}
            </div>
          );
        })}
        
        <div style={{ height: ITEM_HEIGHT * CENTER_INDEX }} />
      </div>
    </div>
  );
}

export function IOSDateTimePicker({ value, min, max, onChange }: IOSDateTimePickerProps) {
  const minDate = useMemo(() => min || new Date(Date.now() + 5 * 60 * 1000), [min]);
  const dates = useMemo(() => generateDates(14, minDate), [minDate]);
  const hours = useMemo(() => generateHours(), []);
  const minutes = useMemo(() => generateMinutes(5), []);
  
  const [isInvalid, setIsInvalid] = useState(false);
  
  const initialValue = useMemo(() => {
    if (value) return value;
    const rounded = roundToNearestMinuteStep(new Date(Date.now() + 10 * 60 * 1000), 5);
    return rounded < minDate ? minDate : rounded;
  }, [value, minDate]);

  const [selectedDateIndex, setSelectedDateIndex] = useState(() => {
    const targetDate = new Date(initialValue);
    targetDate.setHours(0, 0, 0, 0);
    const idx = dates.findIndex(d => d.date.getTime() === targetDate.getTime());
    return idx >= 0 ? idx : 0;
  });

  const [selectedHourIndex, setSelectedHourIndex] = useState(() => {
    return hours.indexOf(initialValue.getHours());
  });

  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(() => {
    const minute = initialValue.getMinutes();
    const roundedMinute = Math.round(minute / 5) * 5;
    return minutes.indexOf(roundedMinute >= 60 ? 55 : roundedMinute);
  });

  const buildDate = useCallback((dateIdx: number, hourIdx: number, minuteIdx: number): Date => {
    const baseDate = dates[dateIdx]?.date || dates[0].date;
    const hour = hours[hourIdx] ?? 0;
    const minute = minutes[minuteIdx] ?? 0;
    
    const result = new Date(baseDate);
    result.setHours(hour, minute, 0, 0);
    return result;
  }, [dates, hours, minutes]);

  useEffect(() => {
    const newDate = buildDate(selectedDateIndex, selectedHourIndex, selectedMinuteIndex);
    const invalid = newDate < minDate;
    setIsInvalid(invalid);
    
    if (!invalid) {
      if (max && newDate > max) {
        onChange(max);
      } else {
        onChange(newDate);
      }
    } else {
      onChange(newDate);
    }
  }, [selectedDateIndex, selectedHourIndex, selectedMinuteIndex, buildDate, minDate, max, onChange]);

  const dateItems = useMemo(() => 
    dates.map(d => ({ value: d.date, label: d.label })),
    [dates]
  );

  const hourItems = useMemo(() => 
    hours.map(h => ({ value: h, label: h.toString().padStart(2, '0') })),
    [hours]
  );

  const minuteItems = useMemo(() => 
    minutes.map(m => ({ value: m, label: m.toString().padStart(2, '0') })),
    [minutes]
  );

  return (
    <div data-testid="ios-datetime-picker">
      {isInvalid && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 14,
            color: '#991B1B',
          }}
          data-testid="picker-error"
        >
          Минимальное время — через 5 минут
        </div>
      )}
      
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          border: '1px solid #E5E7EB',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 0,
            padding: '12px 8px',
          }}
        >
          <div style={{ flex: 2.2 }}>
            <WheelColumn
              items={dateItems}
              selectedIndex={selectedDateIndex}
              onSelect={setSelectedDateIndex}
              testId="picker-date-wheel"
            />
          </div>
          
          <div
            style={{
              width: 1,
              background: '#E5E7EB',
              margin: '0 4px',
            }}
          />
          
          <div style={{ flex: 0.8 }}>
            <WheelColumn
              items={hourItems}
              selectedIndex={selectedHourIndex}
              onSelect={setSelectedHourIndex}
              testId="picker-hour-wheel"
            />
          </div>
          
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 16,
              fontSize: 20,
              fontWeight: 600,
              color: '#6B7280',
            }}
          >
            :
          </div>
          
          <div style={{ flex: 0.8 }}>
            <WheelColumn
              items={minuteItems}
              selectedIndex={selectedMinuteIndex}
              onSelect={setSelectedMinuteIndex}
              testId="picker-minute-wheel"
            />
          </div>
        </div>
      </div>
      
      <p
        style={{
          fontSize: 13,
          color: '#9CA3AF',
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        Время указано по вашему локальному времени
      </p>
    </div>
  );
}
