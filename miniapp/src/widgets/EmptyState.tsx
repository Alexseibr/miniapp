import { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 32 }} data-testid="empty-state">
      <h3 style={{ marginBottom: 8 }} data-testid="text-empty-title">{title}</h3>
      {description && <p style={{ margin: '0 0 16px', color: '#475467' }} data-testid="text-empty-description">{description}</p>}
      {action}
    </div>
  );
}
