import { useStore } from '../../store/useStore';
import { Bell, Send, BarChart3 } from 'lucide-react';
import { AlertComposer } from './AlertComposer';
import { RiskGauge } from '../Analytics/RiskGauge';
import { TopThreats } from '../Analytics/TopThreats';
import { EVENT_TYPE_ICONS } from '../../types';

function formatTimeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function AlertHistory() {
    const { alerts } = useStore();

    if (alerts.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔔</div>
                <div className="empty-state-text">No alerts sent yet.<br />Select an event on the map to send an alert.</div>
            </div>
        );
    }

    return (
        <div>
            {alerts.map(alert => (
                <div key={alert.id} className="alert-card">
                    <div className="alert-card-header">
                        <div className="alert-card-title">
                            {EVENT_TYPE_ICONS[alert.type] || '⚠️'} {alert.title}
                        </div>
                        <span className="alert-card-time">{formatTimeAgo(alert.createdAt)}</span>
                    </div>
                    <div style={{ marginBottom: 5 }}>
                        <span className={`severity-badge ${alert.severity}`}>{alert.severity}</span>
                    </div>
                    <div className="alert-card-message">{alert.message}</div>
                    {alert.locationName && (
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>📍 {alert.locationName}</div>
                    )}
                    <div className="alert-card-channels">
                        {alert.channels.map(ch => (
                            <span key={ch} className="channel-badge">{ch}</span>
                        ))}
                    </div>
                    {alert.deliveryStatus && Object.keys(alert.deliveryStatus).length > 0 && (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                            {Object.entries(alert.deliveryStatus).map(([ch, status]: [string, any]) => (
                                <span key={ch} style={{ marginRight: 8 }}>
                                    {ch}: {status.logged ? '✓ logged' : status.sent != null ? `${status.sent} sent` : 'pending'}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function AnalyticsView() {
    return (
        <div>
            <RiskGauge />
            <TopThreats />
        </div>
    );
}

export function AlertPanel() {
    const { rightPanelTab, setRightPanelTab } = useStore();

    return (
        <div className="panel right">
            <div className="panel-tabs">
                <button
                    className={`panel-tab ${rightPanelTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setRightPanelTab('alerts')}
                >
                    <Bell size={13} /> Alerts
                </button>
                <button
                    className={`panel-tab ${rightPanelTab === 'compose' ? 'active' : ''}`}
                    onClick={() => setRightPanelTab('compose')}
                >
                    <Send size={13} /> Compose
                </button>
                <button
                    className={`panel-tab ${rightPanelTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setRightPanelTab('analytics')}
                >
                    <BarChart3 size={13} /> Analytics
                </button>
            </div>
            <div className="panel-content">
                {rightPanelTab === 'alerts' && <AlertHistory />}
                {rightPanelTab === 'compose' && <AlertComposer />}
                {rightPanelTab === 'analytics' && <AnalyticsView />}
            </div>
        </div>
    );
}
