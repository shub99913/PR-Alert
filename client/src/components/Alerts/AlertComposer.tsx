import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../../store/useStore';

const API_BASE = 'http://localhost:5002/api';

const CHANNELS = [
    { id: 'sms', label: '📱 SMS', description: 'Send to registered users in radius' },
    { id: 'email', label: '📧 Email', description: 'Email registered users' },
    { id: 'cell_broadcast', label: '📡 Cell Broadcast', description: 'Simulated via SMS' },
    { id: 'log', label: '📋 Log Only', description: 'Log to server console' },
];

export function AlertComposer() {
    const { selectedEvent, setRightPanelTab } = useStore();
    const [form, setForm] = useState({
        type: '',
        severity: 'moderate' as string,
        title: '',
        message: '',
        latitude: '',
        longitude: '',
        radius: '50',
        channels: ['log'] as string[],
    });
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Auto-fill from selected event
    useEffect(() => {
        if (selectedEvent) {
            setForm(f => ({
                ...f,
                type: selectedEvent.type,
                severity: selectedEvent.severity,
                title: `${selectedEvent.severity.toUpperCase()} Alert: ${selectedEvent.title}`,
                message: `⚠️ ${selectedEvent.title}\n\n${selectedEvent.description}\n\nSeverity: ${selectedEvent.severity.toUpperCase()}\nTime: ${new Date(selectedEvent.timestamp).toLocaleString()}\n\nTake immediate precautions and follow local authority instructions.`,
                latitude: String(selectedEvent.latitude),
                longitude: String(selectedEvent.longitude),
                radius: selectedEvent.severity === 'critical' ? '100' : '50',
            }));
        }
    }, [selectedEvent]);

    const toggleChannel = (ch: string) => {
        setForm(f => ({
            ...f,
            channels: f.channels.includes(ch)
                ? f.channels.filter(c => c !== ch)
                : [...f.channels, ch],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.message || !form.latitude || !form.longitude) return;

        setSubmitting(true);
        setResult(null);

        try {
            const res = await axios.post(`${API_BASE}/alerts`, {
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                radius: parseFloat(form.radius),
                eventId: selectedEvent?.id,
            });

            setResult({
                success: true,
                message: `Alert sent! ID: ${res.data.id}. Channels: ${res.data.channels.join(', ')}.`,
            });

            // Switch to alert history tab
            setTimeout(() => setRightPanelTab('alerts'), 2000);
        } catch (err: any) {
            setResult({
                success: false,
                message: `Failed: ${err.response?.data?.error || err.message}`,
            });
        }
        setSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="panel-title">🚨 Compose Alert</div>

            {selectedEvent && (
                <div style={{
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent)',
                    borderRadius: 8,
                    padding: 8,
                    marginBottom: 12,
                    fontSize: 11,
                    color: 'var(--accent)',
                }}>
                    Auto-filled from: {selectedEvent.title}
                </div>
            )}

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="earthquake">Earthquake</option>
                        <option value="flood">Flood</option>
                        <option value="wildfire">Wildfire</option>
                        <option value="cyclone">Cyclone</option>
                        <option value="tsunami">Tsunami</option>
                        <option value="weather">Weather</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select className="form-select" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                        <option value="critical">🔴 Critical</option>
                        <option value="high">🟠 High</option>
                        <option value="moderate">🟡 Moderate</option>
                        <option value="low">🟢 Low</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Alert Title</label>
                <input className="form-input" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Earthquake Alert - California" />
            </div>

            <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Alert message to send to users..."
                    style={{ minHeight: 100 }}
                    required />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input className="form-input" type="number" step="any" value={form.latitude}
                        onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input className="form-input" type="number" step="any" value={form.longitude}
                        onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} required />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Radius (km)</label>
                <input className="form-input" type="number" value={form.radius}
                    onChange={e => setForm(f => ({ ...f, radius: e.target.value }))} />
            </div>

            <div className="form-group">
                <label className="form-label">Dispatch Channels</label>
                <div className="checkbox-group">
                    {CHANNELS.map(ch => (
                        <label
                            key={ch.id}
                            className={`checkbox-label ${form.channels.includes(ch.id) ? 'checked' : ''}`}
                            title={ch.description}
                        >
                            <input
                                type="checkbox"
                                checked={form.channels.includes(ch.id)}
                                onChange={() => toggleChannel(ch.id)}
                            />
                            <span>{ch.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {result && (
                <div style={{
                    padding: 8,
                    marginBottom: 10,
                    borderRadius: 8,
                    fontSize: 11,
                    background: result.success ? 'var(--low-bg)' : 'var(--critical-bg)',
                    color: result.success ? 'var(--low)' : 'var(--critical)',
                    border: `1px solid ${result.success ? 'var(--low)' : 'var(--critical)'}`,
                }}>
                    {result.success ? '✓' : '✗'} {result.message}
                </div>
            )}

            <button className="btn btn-danger btn-block" type="submit" disabled={submitting}>
                {submitting ? '⏳ Sending...' : '🚨 Dispatch Alert'}
            </button>

            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                Cell Broadcast is simulated via SMS. SMS/Email require API keys in .env
            </div>
        </form>
    );
}
