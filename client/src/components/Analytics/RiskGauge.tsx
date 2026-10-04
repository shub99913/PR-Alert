import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../../store/useStore';

const API_BASE = 'http://localhost:5002/api';

export function RiskGauge() {
    const { selectedEvent, events } = useStore();
    const [riskData, setRiskData] = useState<{
        riskScore: number;
        riskLevel: string;
        nearbyEventCount: number;
    } | null>(null);

    useEffect(() => {
        const fetchRisk = async () => {
            const lat = selectedEvent?.latitude || 37.7749;
            const lon = selectedEvent?.longitude || -122.4194;

            try {
                const { data } = await axios.get(`${API_BASE}/predictions/risk`, {
                    params: { lat, lon, radius: 500 },
                });
                setRiskData(data);
            } catch {
                // Compute client-side fallback
                const nearby = events.filter(e => {
                    const d = Math.sqrt((e.latitude - lat) ** 2 + (e.longitude - lon) ** 2);
                    return d < 5;
                });
                const score = Math.min(100, nearby.length * 8);
                setRiskData({
                    riskScore: score,
                    riskLevel: score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 20 ? 'moderate' : 'low',
                    nearbyEventCount: nearby.length,
                });
            }
        };

        fetchRisk();
        const interval = setInterval(fetchRisk, 30000);
        return () => clearInterval(interval);
    }, [selectedEvent, events.length]);

    if (!riskData) {
        return (
            <div className="risk-gauge">
                <div className="risk-label">Loading risk data...</div>
            </div>
        );
    }

    return (
        <div className="risk-gauge">
            <div className="risk-label">
                {selectedEvent ? `Risk at ${selectedEvent.title.substring(0, 30)}` : 'Global Risk Index'}
            </div>
            <div className={`risk-score ${riskData.riskLevel}`}>
                {riskData.riskScore}
            </div>
            <div className="risk-label" style={{ fontSize: 13, fontWeight: 600 }}>
                <span className={`severity-badge ${riskData.riskLevel}`}>{riskData.riskLevel}</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                {riskData.nearbyEventCount} events in radius
            </div>

            {/* Simple SVG gauge */}
            <svg width="200" height="20" style={{ marginTop: 10 }}>
                <defs>
                    <linearGradient id="gaugeGrad">
                        <stop offset="0%" stopColor="#00e676" />
                        <stop offset="33%" stopColor="#ffd600" />
                        <stop offset="66%" stopColor="#ff9100" />
                        <stop offset="100%" stopColor="#ff1744" />
                    </linearGradient>
                </defs>
                <rect x="0" y="6" width="200" height="8" rx="4" fill="#1a2332" />
                <rect x="0" y="6" width={riskData.riskScore * 2} height="8" rx="4" fill="url(#gaugeGrad)" />
                <circle cx={Math.min(riskData.riskScore * 2, 198)} cy="10" r="6" fill="white" stroke="#0a0e17" strokeWidth="2" />
            </svg>
        </div>
    );
}
