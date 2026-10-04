import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { EVENT_TYPE_ICONS } from '../../types';
import { Rss, MessageSquare, Users, Search } from 'lucide-react';
import { CrowdReportForm } from './CrowdReportForm';

function formatTimeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function EventFeed() {
    const { events, selectedEvent, setSelectedEvent } = useStore();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const filtered = events.filter(e => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }).slice(0, 100);

    const types = ['all', ...new Set(events.map(e => e.type))];

    return (
        <div>
            <div style={{ marginBottom: 10 }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: '#64748b' }} />
                    <input
                        className="form-input"
                        placeholder="Search events..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 32, fontSize: 12 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {types.map(t => (
                        <button
                            key={t}
                            className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setTypeFilter(t)}
                            style={{ fontSize: 10, padding: '3px 8px' }}
                        >
                            {t === 'all' ? '📊 All' : `${EVENT_TYPE_ICONS[t] || '⚠️'} ${t}`}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📡</div>
                    <div className="empty-state-text">Waiting for live data feed...</div>
                </div>
            ) : (
                filtered.map(event => (
                    <div
                        key={event.id}
                        className={`event-card severity-${event.severity} ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                        onClick={() => setSelectedEvent(event)}
                    >
                        <div className="event-card-header">
                            <span className="event-card-icon">{EVENT_TYPE_ICONS[event.type] || '⚠️'}</span>
                            <span className="event-card-title">{event.title}</span>
                        </div>
                        <div className="event-card-meta">
                            <span className={`severity-badge ${event.severity}`}>{event.severity}</span>
                            {event.magnitude != null && (
                                <span>M{event.magnitude.toFixed(1)}</span>
                            )}
                            <span>{formatTimeAgo(event.timestamp)}</span>
                            <span style={{ textTransform: 'uppercase', fontSize: 9 }}>{event.source}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function CrowdReportsFeed() {
    const { crowdReports } = useStore();

    if (crowdReports.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-text">No crowd reports yet</div>
            </div>
        );
    }

    return (
        <div>
            {crowdReports.map(report => (
                <div key={report.id} className="event-card severity-moderate">
                    <div className="event-card-header">
                        <span className="event-card-icon">📢</span>
                        <span className="event-card-title">{report.type}: {report.description.substring(0, 80)}</span>
                    </div>
                    <div className="event-card-meta">
                        {report.reporterName && <span>By {report.reporterName}</span>}
                        <span>{new Date(report.createdAt).toLocaleTimeString()}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function FeedPanel() {
    const { leftPanelTab, setLeftPanelTab } = useStore();

    return (
        <div className="panel">
            <div className="panel-tabs">
                <button
                    className={`panel-tab ${leftPanelTab === 'feeds' ? 'active' : ''}`}
                    onClick={() => setLeftPanelTab('feeds')}
                >
                    <Rss size={13} /> Live Feed
                </button>
                <button
                    className={`panel-tab ${leftPanelTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setLeftPanelTab('reports')}
                >
                    <MessageSquare size={13} /> Reports
                </button>
            </div>
            <div className="panel-content">
                {leftPanelTab === 'feeds' && <EventFeed />}
                {leftPanelTab === 'reports' && (
                    <>
                        <CrowdReportForm />
                        <div style={{ margin: '12px 0', borderTop: '1px solid var(--border)' }} />
                        <CrowdReportsFeed />
                    </>
                )}
            </div>
        </div>
    );
}
