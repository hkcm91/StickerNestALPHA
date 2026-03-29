/**
 * ProfileSection — profile editing form for the Settings page.
 *
 * Allows users to upload avatar/banner, edit bio, display name,
 * username, location, website, and visibility.
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { UserProfile, UpdateProfileInput, ProfileVisibility } from '@sn/types';

import {
  getProfile,
  updateProfile,
  isUsernameAvailable,
} from '../../../kernel/social-graph';
import {
  validateProfileImage,
  uploadProfileImage,
  resizeImage,
} from '../../../kernel/storage';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { ImageCropModal } from '../../components/ImageCropModal';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--sn-text, #1a1a2e)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  borderRadius: 'var(--sn-radius, 8px)',
  border: '1px solid var(--sn-border, #e5e7eb)',
  background: 'var(--sn-bg, #f9fafb)',
  color: 'var(--sn-text, #1a1a2e)',
  fontFamily: 'var(--sn-font-family, system-ui)',
  boxSizing: 'border-box' as const,
};

const btnBase: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 'var(--sn-radius, 8px)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-accent, #6366f1)',
  color: '#fff',
};

const fieldGroup: React.CSSProperties = {
  marginBottom: 20,
};

const errorText: React.CSSProperties = {
  color: '#EF4444',
  fontSize: 13,
  marginTop: 4,
};

const successText: React.CSSProperties = {
  color: '#10B981',
  fontSize: 13,
  marginTop: 4,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProfileSection: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [bannerUrl, setBannerUrl] = useState<string | undefined>();

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Image crop state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'banner'>('avatar');
  const [uploading, setUploading] = useState(false);

  // Hidden file inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load profile
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getProfile(userId).then((result) => {
      if (result.success && result.data) {
        const p = result.data;
        setProfile(p);
        setDisplayName(p.displayName);
        setUsername(p.username);
        setBio(p.bio ?? '');
        setLocation(p.location ?? '');
        setWebsiteUrl(p.websiteUrl ?? '');
        setVisibility(p.visibility);
        setAvatarUrl(p.avatarUrl);
        setBannerUrl(p.bannerUrl);
      } else {
        setError('Failed to load profile.');
      }
      setLoading(false);
    });
  }, [userId]);

  // Check username availability (debounced)
  useEffect(() => {
    if (!profile || username === profile.username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      const available = await isUsernameAvailable(username);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [username, profile]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (type: 'avatar' | 'banner') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const validation = validateProfileImage(file, type);
      if (!validation.valid) {
        setError(validation.error ?? 'Invalid image.');
        return;
      }
      setError(null);
      setCropType(type);
      setCropFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [],
  );

  // Handle cropped image upload
  const handleCrop = useCallback(
    async (blob: Blob) => {
      setCropFile(null);
      setUploading(true);
      setError(null);
      try {
        // Resize after crop
        const resizedFile = new File([blob], 'crop.jpg', { type: 'image/jpeg' });
        const maxW = cropType === 'avatar' ? 400 : 1500;
        const maxH = cropType === 'avatar' ? 400 : 500;
        const resized = await resizeImage(resizedFile, maxW, maxH);

        const result = await uploadProfileImage({ userId, file: resized, type: cropType });

        // Update profile with new URL
        await updateProfile(userId, { [`${cropType}Url`]: result.publicUrl } as UpdateProfileInput, userId);

        if (cropType === 'avatar') {
          setAvatarUrl(result.publicUrl);
        } else {
          setBannerUrl(result.publicUrl);
        }
        setSuccess(`${cropType === 'avatar' ? 'Avatar' : 'Banner'} updated!`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [userId, cropType],
  );

  // Save text fields
  const handleSave = useCallback(async () => {
    if (!profile) return;
    if (usernameStatus === 'taken') {
      setError('Username is already taken.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const input: UpdateProfileInput = {};
    if (displayName !== profile.displayName) input.displayName = displayName;
    if (username !== profile.username) input.username = username;
    if (bio !== (profile.bio ?? '')) input.bio = bio || undefined;
    if (location !== (profile.location ?? '')) input.location = location || undefined;
    if (websiteUrl !== (profile.websiteUrl ?? '')) input.websiteUrl = websiteUrl || undefined;
    if (visibility !== profile.visibility) input.visibility = visibility;

    if (Object.keys(input).length === 0) {
      setSaving(false);
      setSuccess('No changes to save.');
      setTimeout(() => setSuccess(null), 3000);
      return;
    }

    const result = await updateProfile(userId, input, userId);
    if (result.success) {
      setProfile(result.data);
      setSuccess('Profile saved!');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error.message ?? 'Failed to save profile.');
    }
    setSaving(false);
  }, [profile, userId, displayName, username, bio, location, websiteUrl, visibility, usernameStatus]);

  if (loading) {
    return <div data-testid="profile-section-loading" style={{ padding: 20, color: 'var(--sn-text-muted, #6b7280)' }}>Loading profile...</div>;
  }

  if (!profile) {
    return <div style={{ padding: 20, color: '#EF4444' }}>Could not load profile.</div>;
  }

  return (
    <div data-testid="profile-section">
      {/* Banner */}
      <div style={{ position: 'relative', marginBottom: 60 }}>
        <div
          data-testid="profile-banner-preview"
          style={{
            height: 160,
            background: bannerUrl
              ? `url(${bannerUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, var(--sn-accent, #6366f1) 0%, #8B5CF6 100%)',
            borderRadius: 'var(--sn-radius, 8px)',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={() => bannerInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Change banner image"
        >
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--sn-radius, 8px)',
            opacity: 0, transition: 'opacity 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
          >
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
              {uploading && cropType === 'banner' ? 'Uploading...' : 'Change Banner'}
            </span>
          </div>
        </div>

        {/* Avatar overlapping banner */}
        <div
          data-testid="profile-avatar-preview"
          style={{
            width: 96, height: 96, borderRadius: '50%',
            border: '4px solid var(--sn-surface, #fff)',
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover no-repeat`
              : 'var(--sn-accent, #6366f1)',
            position: 'absolute', bottom: -40, left: 24,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 32, fontWeight: 700,
          }}
          onClick={() => avatarInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Change profile photo"
        >
          {!avatarUrl && displayName.charAt(0).toUpperCase()}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {uploading && cropType === 'avatar' ? '...' : 'Edit'}
            </span>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFileSelect('avatar')} />
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFileSelect('banner')} />

      {/* Feedback */}
      {error && <div data-testid="profile-error" style={errorText}>{error}</div>}
      {success && <div data-testid="profile-success" style={successText}>{success}</div>}

      {/* Form Fields */}
      <div style={fieldGroup}>
        <label style={fieldLabel}>Display Name</label>
        <input
          data-testid="input-display-name"
          style={inputStyle}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          placeholder="Your display name"
        />
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Username</label>
        <input
          data-testid="input-username"
          style={inputStyle}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          maxLength={30}
          placeholder="your_username"
        />
        {usernameStatus === 'checking' && (
          <span style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>Checking...</span>
        )}
        {usernameStatus === 'available' && (
          <span style={{ fontSize: 12, color: '#10B981' }}>Available!</span>
        )}
        {usernameStatus === 'taken' && (
          <span style={{ fontSize: 12, color: '#EF4444' }}>Already taken</span>
        )}
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Bio</label>
        <textarea
          data-testid="input-bio"
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          placeholder="Tell us about yourself..."
        />
        <span style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>{bio.length}/500</span>
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Location</label>
        <input
          data-testid="input-location"
          style={inputStyle}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          placeholder="City, Country"
        />
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Website</label>
        <input
          data-testid="input-website"
          style={inputStyle}
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          type="url"
          placeholder="https://yoursite.com"
        />
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Profile Visibility</label>
        <select
          data-testid="select-visibility"
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ProfileVisibility)}
        >
          <option value="public">Public — anyone can view</option>
          <option value="followers">Followers only</option>
          <option value="private">Private — only you</option>
        </select>
      </div>

      <button
        data-testid="btn-save-profile"
        style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

      {/* Crop Modal */}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspectRatio={cropType === 'avatar' ? 1 : 3}
          title={cropType === 'avatar' ? 'Crop Profile Photo' : 'Crop Banner Image'}
          onCrop={handleCrop}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
};
