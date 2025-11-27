import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        padding: '20px',
      }}
      data-testid="page-loader"
    >
      <Loader2 className="w-8 h-8 animate-spin text-[#3B73FC] mb-3" />
      <p style={{ 
        fontSize: '14px', 
        color: '#64748b',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        Загрузка...
      </p>
    </div>
  );
}
