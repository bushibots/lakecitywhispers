import { BookOpen, Shield, Ghost, Key } from 'lucide-react';

export default function Guide() {
  return (
    <div className="page-content">

      <div className="guide-header mt-4">
        <h2><BookOpen className="inline-icon" /> How JLU Whisper Works</h2>
        <p className="text-muted mt-2">
          JLU Whisper is built on a privacy-first architecture. We do not collect emails, phone numbers, or real names.
        </p>
      </div>

      <div className="guide-section mt-4">
        <div className="guide-card">
          <h3><Ghost className="icon-teal" /> Guest Identities</h3>
          <p>
            When you first open JLU Whisper, you are automatically assigned a random anonymous identity (e.g., "Silent Owl"). 
            This identity is stored securely in your browser. 
          </p>
          <div className="alert mt-2">
            <strong>Note:</strong> Guest accounts are temporary. If you don't use the app for 7 days, or if you clear your browser data, your Guest identity will be permanently deleted.
          </div>
        </div>

        <div className="guide-card mt-4">
          <h3><Shield className="icon-teal" /> Registered Accounts</h3>
          <p>
            To keep your identity forever and use it across multiple devices, you can "Secure Your Account" from the Profile page.
            Registration only requires a username and password.
          </p>
          <p className="mt-2">
            Once registered, your account is permanent (unless inactive for 60 days).
          </p>
        </div>

        <div className="guide-card mt-4">
          <h3><Key className="icon-teal" /> Account Recovery</h3>
          <p>
            Because we don't ask for your email, we cannot send you a "forgot password" link. 
          </p>
          <p className="mt-2">
            When you register, you will be given a <strong>Recovery Key</strong> (e.g., <code>JLU-XXXX-XXXX</code>). 
            This is the ONLY way to recover your account if you forget your password. Every time you reset your password, a new key is generated.
          </p>
        </div>
      </div>
    </div>
  );
}
