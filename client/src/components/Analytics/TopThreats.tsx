import { useStore } from '../../store/useStore';
import { EVENT_TYPE_ICONS } from '../../types';

export function TopThreats() {
    const { events } = useStore();

    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };

    const topEvents = [...events]
        .sort((a, b) => {
            const sevDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
            if (sevDiff !== 0) return sevDiff;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, 8);

    if (topEvents.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text">No event data yet</div>
            </div>
        );
    }

    // Stats summary
    const typeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0 };
    events.forEach(e => {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
        severityCounts[e.severity]++;
    });

    return (
        <div>
            {/* Summary stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                marginBottom: 12,
            }}>
                {Object.entries(severityCounts).map(([sev, count]) => (
                    <div key={sev} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 18, fontWeight: 800 }} className={`risk-score ${sev}`}>{count}</div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#64748b' }}>{sev}</div>
                    </div>
                ))}
            </div>

            <div className="panel-title">🏆 Top Threats</div>
            <ul className="threat-list">
                {topEvents.map((event, i) => (
                    <li key={event.id} className="threat-item">
                        <span className="threat-rank">{i + 1}</span>
                        <span>{EVENT_TYPE_ICONS[event.type] || '⚠️'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {event.title}
                            </div>
                            <div style={{ fontSize: 9, color: '#64748b' }}>
                                {event.magnitude != null ? `M${event.magnitude.toFixed(1)} · ` : ''}
                                {event.source.toUpperCase()}
                            </div>
                        </div>
                        <span className={`severity-badge ${event.severity}`} style={{ flexShrink: 0 }}>{event.severity}</span>
                    </li>
                ))}
            </ul>

            {/* Type breakdown */}
            <div className="panel-title" style={{ marginTop: 12 }}>📊 By Type</div>
            {Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                    <div key={type} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                    }}>
                        <span>{EVENT_TYPE_ICONS[type] || '⚠️'}</span>
                        <span style={{ flex: 1, textTransform: 'capitalize' }}>{type}</span>
                        <span style={{ fontWeight: 700 }}>{count}</span>
                        <div style={{
                            width: 60,
                            height: 4,
                            background: 'var(--bg-tertiary)',
                            borderRadius: 2,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${(count / events.length) * 100}%`,
                                height: '100%',
                                background: 'var(--accent)',
                                borderRadius: 2,
                            }} />
                        </div>
                    </div>
                ))}
        </div>
    );
}
