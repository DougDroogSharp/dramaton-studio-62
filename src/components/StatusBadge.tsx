import { AssetStatus } from '@/types';

interface StatusBadgeProps {
  status: AssetStatus;
  onChange?: (status: AssetStatus) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<AssetStatus, { label: string; bg: string; text: string; border: string }> = {
  new: {
    label: 'NEW',
    bg: 'bg-diesel-dark',
    text: 'text-diesel-steel',
    border: 'border-diesel-border',
  },
  work: {
    label: 'WORK',
    bg: 'bg-diesel-rust/20',
    text: 'text-diesel-rust',
    border: 'border-diesel-rust/50',
  },
  done: {
    label: 'DONE',
    bg: 'bg-diesel-green/20',
    text: 'text-diesel-green',
    border: 'border-diesel-green/50',
  },
};

const statusOrder: AssetStatus[] = ['new', 'work', 'done'];

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  onChange, 
  size = 'sm',
  className = '' 
}) => {
  const config = statusConfig[status];
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      const currentIndex = statusOrder.indexOf(status);
      const nextIndex = (currentIndex + 1) % statusOrder.length;
      onChange(statusOrder[nextIndex]);
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[9px] px-1.5 py-0.5' 
    : 'text-[10px] px-2 py-1';

  return (
    <button
      onClick={handleClick}
      disabled={!onChange}
      className={`
        ${config.bg} ${config.text} ${config.border}
        ${sizeClasses}
        border font-bold tracking-wider uppercase
        transition-all duration-150
        ${onChange ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      title={onChange ? 'Click to change status' : undefined}
    >
      {config.label}
    </button>
  );
};

// Status selector for editors (shows all three options)
interface StatusSelectorProps {
  status: AssetStatus;
  onChange: (status: AssetStatus) => void;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({ status, onChange }) => {
  return (
    <div className="flex gap-1">
      {statusOrder.map((s) => {
        const config = statusConfig[s];
        const isActive = status === s;
        
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`
              text-[10px] px-2 py-1 border font-bold tracking-wider uppercase
              transition-all duration-150
              ${isActive 
                ? `${config.bg} ${config.text} ${config.border} ring-1 ring-diesel-gold/30 ring-offset-1 ring-offset-diesel-dark`
                : 'bg-diesel-panel text-diesel-steel/50 border-diesel-border hover:text-diesel-steel'
              }
            `}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
};
