import { useState } from 'react';
import axios from 'axios';
import { X, UserPlus } from 'lucide-react';

const API_BASE = 'http://localhost:5002/api';

interface Props {
    onClose: () => void;
}

export function UserRegistration({ onClose }: Props) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        language: 'en',
        latitude: '',
        longitude: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email) return;

        setSubmitting(true);
        try {
            const payload: any = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                language: form.language,
            };
            if (form.latitude && form.longitude) {
                payload.latitude = parseFloat(form.latitude);
                payload.longitude = parseFloat(form.longitude);
            }

            const { data } = await axios.post(`${API_BASE}/users/register`, payload);
            setResult({ success: true, message: `Registered as ${data.name} (ID: ${data.id.substring(0, 8)}...)` });
            setForm({ name: '', email: '', phone: '', language: 'en', latitude: '', longitude: '' });
        } catch (err: any) {
            setResult({ success: false, message: err.response?.data?.error || err.message });
        }
        setSubmitting(false);
    };

    const detectLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setForm(f => ({
                        ...f,
                        latitude: String(pos.coords.latitude),
                        longitude: String(pos.coords.longitude),
                    }));
                },
                () => {
                    setResult({ success: false, message: 'Location access denied.' });
                }
            );
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="modal-title"><UserPlus size={18} style={{ marginRight: 6 }} /> Register for Alerts</h2>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                    Register to receive disaster alerts via SMS, email, or push notifications when events occur near your location.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" placeholder="John Doe" required
                            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input className="form-input" type="email" placeholder="john@example.com" required
                            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone (for SMS alerts)</label>
                        <input className="form-input" type="tel" placeholder="+1234567890"
                            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Preferred Language</label>
                        <select className="form-select" value={form.language}
                            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                            <option value="hi">हिन्दी</option>
                            <option value="zh">中文</option>
                            <option value="ja">日本語</option>
                            <option value="ar">العربية</option>
                            <option value="pt">Português</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Location (optional — enables proximity alerts)
                            <button type="button" className="btn btn-ghost btn-sm" onClick={detectLocation}
                                style={{ marginLeft: 8, fontSize: 10 }}>
                                📍 Auto-detect
                            </button>
                        </label>
                        <div className="form-row">
                            <input className="form-input" type="number" step="any" placeholder="Latitude"
                                value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
                            <input className="form-input" type="number" step="any" placeholder="Longitude"
                                value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
                        </div>
                    </div>

                    {result && (
                        <div style={{
                            padding: 10,
                            marginBottom: 12,
                            borderRadius: 8,
                            fontSize: 12,
                            background: result.success ? 'var(--low-bg)' : 'var(--critical-bg)',
                            color: result.success ? 'var(--low)' : 'var(--critical)',
                            border: `1px solid ${result.success ? 'var(--low)' : 'var(--critical)'}`,
                        }}>
                            {result.success ? '✅' : '❌'} {result.message}
                        </div>
                    )}

                    <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                        {submitting ? '⏳ Registering...' : '✅ Register'}
                    </button>
                </form>
            </div>
        </div>
    );
}
