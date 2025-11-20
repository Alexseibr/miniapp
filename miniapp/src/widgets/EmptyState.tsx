import { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 32 }}>
      <p style={{ fontSize: '2rem', margin: 0 }}>🌿</p>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {description && <p style={{ margin: '0 0 16px', color: '#475467' }}>{description}</p>}
      {action}
    </div>
  );
}
