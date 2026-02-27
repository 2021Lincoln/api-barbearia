const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:   { label: 'Pendente',   color: '#ed8936' },
  confirmado: { label: 'Confirmado', color: '#63b3ed' },
  concluido:  { label: 'Concluído',  color: '#48bb78' },
  cancelado:  { label: 'Cancelado',  color: '#fc8181' },
}

interface BadgeProps {
  status: string
}

export function Badge({ status }: BadgeProps) {
  const cfg = STATUS_MAP[status] ?? { label: status, color: '#a0aec0' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        background: `${cfg.color}22`,
        color: cfg.color,
        border: `1px solid ${cfg.color}66`,
      }}
    >
      {cfg.label}
    </span>
  )
}
