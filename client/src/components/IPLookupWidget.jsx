import { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

export default function IPLookupWidget() {
    const [ip, setIp] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLookup = async () => {
        if (!ip.trim()) return;
        setLoading(true);
        setError('');
        setData(null);
        try {
            const res = await fetch(`http://api.ipstack.com/${ip.trim()}?access_key=d8b95a2b57ce03d9bda835bda86ce706`);
            if (!res.ok) throw new Error('Network error or invalid key');
            const result = await res.json();
            if (result.error) throw new Error(result.error.info || 'API Error');
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="feed-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} className="icon-teal"/> IPStack Lookup
            </h2>
            <div className="search-bar-small" style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)' }}>
                <Search size={16} className="text-muted"/>
                <input 
                    type="text" 
                    placeholder="Enter IP address (e.g. 8.8.8.8)" 
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
            </div>
            <button className="btn-glow w-100" onClick={handleLookup} disabled={loading}>
                {loading ? 'Looking up...' : 'Lookup IP'}
            </button>
            
            {error && <div style={{ color: '#ff4444', marginTop: '1rem' }}>{error}</div>}
            
            {data && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <p style={{ margin: '0.5rem 0' }}><strong>IP:</strong> {data.ip}</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>Type:</strong> {data.type}</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>Continent:</strong> {data.continent_name}</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>Country:</strong> {data.country_name} {data.location?.country_flag_emoji}</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>Region:</strong> {data.region_name}</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>City:</strong> {data.city}</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>ZIP:</strong> {data.zip}</p>
                    {/* ponytail: omitted longitude/latitude map rendering, add when mapping is needed */}
                </div>
            )}
        </div>
    );
}
