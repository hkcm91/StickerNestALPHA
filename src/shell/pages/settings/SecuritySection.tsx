/**
 * Security Section — MFA/2FA setup UI for settings page.
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  enrollMFA,
  challengeMFA,
  verifyMFA,
  unenrollMFA,
  listMFAFactors,
  type MFAFactor,
} from '../../../kernel/auth';

export const SecuritySection: React.FC = () => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadFactors = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMFAFactors();
      setFactors(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA factors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  const handleEnroll = useCallback(async () => {
    setEnrolling(true);
    setError(null);
    try {
      const result = await enrollMFA();
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll MFA');
      setEnrolling(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId || !verifyCode.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const { challengeId } = await challengeMFA(factorId);
      await verifyMFA(factorId, challengeId, verifyCode.trim());
      setEnrolling(false);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode('');
      await loadFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setVerifying(false);
    }
  }, [factorId, verifyCode, loadFactors]);

  const handleUnenroll = useCallback(async (id: string) => {
    setError(null);
    try {
      await unenrollMFA(id);
      await loadFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove MFA');
    }
  }, [loadFactors]);

  const verifiedFactors = factors.filter((f) => f.status === 'verified');
  const hasMFA = verifiedFactors.length > 0;

  return (
    <div data-testid="security-section">
      <h2 style={{ marginBottom: 8, fontSize: 18 }}>Two-Factor Authentication</h2>
      <p style={{ color: 'var(--sn-text-muted, #6b7280)', fontSize: 14, marginBottom: 20 }}>
        Add an extra layer of security to your account with a TOTP authenticator app.
      </p>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#b91c1c',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 14 }}>Loading...</p>
      ) : (
        <>
          {/* Current factors */}
          {verifiedFactors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Active Factors</h3>
              {verifiedFactors.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--sn-border, #e5e7eb)',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {f.friendlyName ?? 'Authenticator App'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>
                      TOTP — Verified
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnenroll(f.id)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      background: '#fff',
                      color: '#dc2626',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Enrollment */}
          {!enrolling && !hasMFA && (
            <button
              data-testid="enable-mfa"
              onClick={handleEnroll}
              style={{
                padding: '10px 20px',
                background: 'var(--sn-accent, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Enable Two-Factor Authentication
            </button>
          )}

          {enrolling && qrCode && (
            <div
              style={{
                padding: 20,
                border: '1px solid var(--sn-border, #e5e7eb)',
                borderRadius: 12,
                maxWidth: 400,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Scan QR Code
              </h3>
              <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', marginBottom: 12 }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
              </p>
              <div
                style={{
                  textAlign: 'center',
                  padding: 16,
                  background: '#fff',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <img src={qrCode} alt="TOTP QR Code" width={200} height={200} />
              </div>

              {secret && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)', marginBottom: 4 }}>
                    Manual entry key:
                  </div>
                  <code
                    style={{
                      display: 'block',
                      padding: '8px 12px',
                      background: 'var(--sn-bg, #f3f4f6)',
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {secret}
                  </code>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="mfa-code" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Verification Code
                </label>
                <input
                  id="mfa-code"
                  data-testid="mfa-code-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--sn-border, #e5e7eb)',
                    borderRadius: 6,
                    fontSize: 16,
                    fontFamily: 'monospace',
                    letterSpacing: 4,
                    textAlign: 'center',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  data-testid="mfa-verify"
                  onClick={handleVerify}
                  disabled={verifying || verifyCode.length < 6}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: 'var(--sn-accent, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: verifying ? 'not-allowed' : 'pointer',
                  }}
                >
                  {verifying ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  onClick={() => {
                    setEnrolling(false);
                    setQrCode(null);
                    setSecret(null);
                    setFactorId(null);
                    setVerifyCode('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid var(--sn-border, #e5e7eb)',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
