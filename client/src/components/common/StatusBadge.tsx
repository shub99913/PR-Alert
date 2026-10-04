import { Severity } from '../../types';

interface Props {
    severity: Severity;
    size?: 'sm' | 'md';
}

export function StatusBadge({ severity, size = 'sm' }: Props) {
    return (
        <span className={`severity-badge ${severity}`} style={size === 'md' ? { fontSize: 11, padding: '3px 10px' } : undefined}>
            {severity}
        </span>
    );
}
