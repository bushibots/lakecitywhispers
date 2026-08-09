import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert, Key } from 'lucide-react';
import { login, register, recoverAccount } from '../api';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'recovery_show', 'recover_account'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(username, password);
        if (res.error) setError(res.error);
        else {
          onSuccess();
          onClose();
        }
      } else if (mode === 'register') {
        const res = await register(username, password);
        if (res.error) setError(res.error);
        else if (res.recovery_key) {
          setGeneratedKey(res.recovery_key);
          setMode('recovery_show');
        }
      } else if (mode === 'recover_account') {
        const res = await recoverAccount(username, recoveryKeyInput, password);
        if (res.error) setError(res.error);
        else {
          setGeneratedKey(res.recovery_key);
          setMode('recovery_show');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
    setLoading(false);
  };

  const handleFinishRecoveryView = () => {
    onSuccess();
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={20}/></button>
        
        {mode === 'recovery_show' ? (
          <div className="recovery-view">
            <h2 className="text-danger"><ShieldAlert className="inline-icon" /> Critical: Save This Key</h2>
            <p className="text-muted mt-2">
              JLU Whisper does not collect emails. If you forget your password, this recovery key is the <strong>ONLY</strong> way to regain access to your account.
            </p>
            <div className="recovery-key-box mt-4">
              {generatedKey}
            </div>
            <p className="text-muted mt-2 text-small">Write it down or save it in a password manager.</p>
            <button className="btn-glow mt-4" style={{ width: '100%' }} onClick={handleFinishRecoveryView}>
              I have safely stored this key
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Secure Your Account'}
              {mode === 'recover_account' && 'Recover Account'}
            </h2>
            
            {error && <div className="error-box mt-2">{error}</div>}

            <div className="input-group mt-4">
              <label>Username</label>
              <input 
                type="text" 
                className="composer-textarea border-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>

            {mode === 'recover_account' && (
              <div className="input-group mt-4">
                <label>Recovery Key</label>
                <input 
                  type="text" 
                  className="composer-textarea border-input"
                  value={recoveryKeyInput}
                  onChange={e => setRecoveryKeyInput(e.target.value)}
                  placeholder="JLU-XXXX-XXXX"
                  required
                />
              </div>
            )}

            <div className="input-group mt-4">
              <label>{mode === 'recover_account' ? 'New Password' : 'Password'}</label>
              <input 
                type="password" 
                className="composer-textarea border-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn-glow mt-4" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Processing...' : (
                mode === 'login' ? 'Log In' : 
                mode === 'register' ? 'Register Account' : 
                'Reset Password'
              )}
            </button>

            <div className="auth-links mt-4">
              {mode === 'login' ? (
                <>
                  <span onClick={() => {setMode('register'); setError('');}}>Need an account? Register</span>
                  <span onClick={() => {setMode('recover_account'); setError('');}} className="text-muted"><Key size={14} className="inline-icon" /> Forgot Password?</span>
                </>
              ) : (
                <span onClick={() => {setMode('login'); setError('');}}>Already have an account? Log In</span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
