import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FeedbackPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: localStorage.getItem('name') || '',
        email: '',
        type: 'other',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${BACKEND_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to submit feedback');

            setStatus('success');
            setFormData({ ...formData, message: '', type: 'other' }); // Reset form but keep name/email
            setTimeout(() => navigate('/'), 3000); // Redirect after 3s
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg('Something went wrong. Please try again later.');
        }
    };

    return (
        <div style={containerStyle}>
            <div style={formCard}>
                <h1 style={titleStyle}>We ❤️ Feedback</h1>
                <p style={subtitleStyle}>Help us improve You&Me.</p>

                {status === 'success' ? (
                    <div style={successMessage}>
                        <h2>🎉 Thank You!</h2>
                        <p>Your feedback has been received.</p>
                        <p style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>Redirecting to home...</p>
                        <button onClick={() => navigate('/')} style={secondaryBtn}>Go Back Now</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={formStyle}>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={inputStyle}
                                placeholder="Your Name"
                            />
                        </div>

                        <div style={inputGroup}>
                            <label style={labelStyle}>Email</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                style={inputStyle}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div style={inputGroup}>
                            <label style={labelStyle}>Feedback Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="bug">🐛 Bug Report</option>
                                <option value="feature">✨ Feature Request</option>
                                <option value="other">📝 Other</option>
                            </select>
                        </div>

                        <div style={inputGroup}>
                            <label style={labelStyle}>Message</label>
                            <textarea
                                required
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                                placeholder="Tell us what's on your mind..."
                            />
                        </div>

                        {status === 'error' && <p style={errorText}>{errorMsg}</p>}

                        <div style={buttonGroup}>
                            <button type="button" onClick={() => navigate('/')} style={cancelBtn}>Cancel</button>
                            <button type="submit" disabled={status === 'submitting'} style={submitBtn}>
                                {status === 'submitting' ? 'Sending...' : 'Send Feedback 🚀'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d0d0d',
    color: 'white',
    padding: '20px'
};

const formCard = {
    background: '#1a1a1a',
    padding: '40px',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    border: '1px solid #333'
};

const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '10px',
    textAlign: 'center',
    background: 'linear-gradient(45deg, #fff, #7a35f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
};

const subtitleStyle = {
    color: '#888',
    textAlign: 'center',
    marginBottom: '30px'
};

const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
};

const inputGroup = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ccc',
    marginLeft: '5px'
};

const inputStyle = {
    padding: '12px 15px',
    borderRadius: '10px',
    border: '1px solid #333',
    background: '#222',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    transition: 'border 0.2s',
    fontFamily: 'inherit'
};

const buttonGroup = {
    display: 'flex',
    gap: '15px',
    marginTop: '10px'
};

const submitBtn = {
    flex: 1,
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: '#7a35f0',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
};

const cancelBtn = {
    flex: 1,
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#aaa',
    fontWeight: '600',
    cursor: 'pointer'
};

const successMessage = {
    textAlign: 'center',
    padding: '40px 0'
};

const secondaryBtn = {
    marginTop: '20px',
    padding: '10px 20px',
    background: '#333',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer'
};

const errorText = {
    color: '#ff4757',
    fontSize: '14px',
    textAlign: 'center'
};
