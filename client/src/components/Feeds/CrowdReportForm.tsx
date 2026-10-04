import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5002/api';

export function CrowdReportForm() {
    const [form, setForm] = useState({
        type: 'other',
        description: '',
        latitude: '',
        longitude: '',
        reporterName: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.description || !form.latitude || !form.longitude) return;

        setSubmitting(true);
        try {
            await axios.post(`${API_BASE}/crowd-report`, {
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
            });
            setSuccess(true);
            setForm({ type: 'other', description: '', latitude: '', longitude: '', reporterName: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to submit report:', err);
        }
        setSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="panel-title">📢 Submit Report</div>
            <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="earthquake">Earthquake</option>
                    <option value="flood">Flood</option>
                    <option value="wildfire">Wildfire</option>
                    <option value="cyclone">Cyclone</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                    className="form-textarea"
                    placeholder="Describe what you see..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    required
                />
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input className="form-input" type="number" step="any" placeholder="0.0"
                        value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input className="form-input" type="number" step="any" placeholder="0.0"
                        value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} required />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Your Name (optional)</label>
                <input className="form-input" placeholder="Anonymous"
                    value={form.reporterName} onChange={e => setForm(f => ({ ...f, reporterName: e.target.value }))} />
            </div>
            {success && <div style={{ color: 'var(--low)', fontSize: 12, marginBottom: 8 }}>✓ Report submitted!</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : '📤 Submit Report'}
            </button>
        </form>
    );
}
