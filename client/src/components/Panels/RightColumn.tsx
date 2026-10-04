import { FC } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const outlookData = [
    { day: 'May 17', extreme: 80, high: 60, moderate: 40 },
    { day: 'May 18', extreme: 85, high: 62, moderate: 45 },
    { day: 'May 19', extreme: 82, high: 58, moderate: 42 },
    { day: 'May 20', extreme: 78, high: 55, moderate: 38 },
    { day: 'May 21', extreme: 75, high: 50, moderate: 35 },
    { day: 'May 22', extreme: 70, high: 48, moderate: 32 },
    { day: 'May 23', extreme: 65, high: 45, moderate: 30 },
];

const riskList = [
    { name: 'Pine Ridge', level: 'Extreme', color: 'var(--critical)' },
    { name: 'Canyon View', level: 'High', color: 'var(--high)' },
    { name: 'Mountain Gate', level: 'High', color: 'var(--high)' },
    { name: 'Lakeside', level: 'Moderate', color: 'var(--high)' },
    { name: 'Meadow Creek', level: 'Low', color: 'var(--low)' },
];

const renderHalfGauge = (value: number, color: string, label: string) => {
    const data = [
        { value: value },
        { value: 100 - value }
    ];
    return (
        <div style={{ position: 'relative', height: 90 }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={40} outerRadius={55} paddingAngle={0} dataKey="value" stroke="none">
                        <Cell fill={color} />
                        <Cell fill="var(--bg-tertiary)" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                <div className="stat-value" style={{ fontSize: 20 }}>{value}%</div>
                <div className="stat-label" style={{ justifyContent: 'center' }}>{label}</div>
            </div>
        </div>
    );
};

export const RightColumn: FC = () => {
    return (
        <div className="panel right" style={{ overflowY: 'auto' }}>
            <div className="tactical-widget interactive-element" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 12, paddingBottom: 0 }}>
                    <div className="widget-title">FIRE RISK PREDICTION</div>
                    <div className="stat-label" style={{ marginBottom: 8 }}>Today</div>
                </div>
                <div style={{ height: 140, background: 'url(https://miro.medium.com/v2/resize:fit:1400/1*C4FkZmsG_I_sR1T3J35fKw.png) center/cover', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}></div>
            </div>

            <div className="tactical-widget interactive-element">
                <div className="widget-title">7 DAY OUTLOOK</div>
                <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={outlookData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 10 }} />
                            <Line type="monotone" dataKey="extreme" stroke="var(--critical)" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="high" stroke="var(--high)" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="moderate" stroke="var(--low)" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <div className="tactical-widget interactive-element" style={{ flex: 1 }}>
                    <div className="widget-title" style={{ fontSize: 10 }}>FUEL MOISTURE</div>
                    {renderHalfGauge(12, 'var(--critical)', 'Very Dry')}
                </div>
                <div className="tactical-widget interactive-element" style={{ flex: 1 }}>
                    <div className="widget-title" style={{ fontSize: 10 }}>ECOSYSTEM HEALTH</div>
                    {renderHalfGauge(72, 'var(--low)', 'Good')}
                </div>
            </div>

            <div className="tactical-widget interactive-element">
                <div className="widget-title">COMMUNITY RISK</div>
                <div>
                    {riskList.map((c, i) => (
                        <div key={i} className="stat-row" style={{ padding: '6px 0', borderBottom: i === riskList.length - 1 ? 'none' : '1px solid var(--border)' }}>
                            <div className="stat-label" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                            <div className="stat-value" style={{ fontSize: 10, color: c.color, textTransform: 'uppercase' }}>{c.level}</div>
                        </div>
                    ))}
                </div>
                <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>VIEW ALL</button>
            </div>
        </div>
    );
};
