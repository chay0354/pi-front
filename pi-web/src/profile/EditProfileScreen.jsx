import {useEffect, useMemo, useRef, useState} from 'react';
import {mdiCamera, mdiChevronLeft, mdiVideoOutline} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {uploadFile, uploadProfilePicture} from '../api/client';
import CircleCropModal from '../account/CircleCropModal';
import {updateSubscriptionProfile} from '../api/chat';
import {useSession} from '../auth/session';
import {
  isB2BSubscriptionType,
  subscriptionTypes,
  usesOrgLogoAsAvatar,
} from './lib/constant';
import {
  applyProfilePhoneSync,
  canEditSeparateCompanyLogo,
  getProfessionalSpecializationsForTypes,
  getProfileBusinessNameFieldKey,
  getProfileEditFields,
  hydrateProfileEditForm,
} from './lib/profileFields';
import {
  buildProfilePhotoSavePayload,
  getUserCompanyLogoUrl,
  getUserProfilePhotoUrl,
} from './lib/userProfileImage';
import {ProfileAvatar} from './ProfileParts';
import styles from './EditProfileScreen.module.css';

export default function EditProfileScreen({onClose}) {
  const {currentUser, setCurrentUser} = useSession();
  const type = currentUser?.subscription_type || subscriptionTypes.user;
  const subTypeLower = String(type).toLowerCase();
  const logoOnlyProfile = usesOrgLogoAsAvatar(subTypeLower);
  const canEditProfilePhoto = !logoOnlyProfile;
  const canEditProfileVideo = isB2BSubscriptionType(subTypeLower) && !logoOnlyProfile;
  const canEditCompanyLogo = canEditSeparateCompanyLogo(subTypeLower, currentUser);
  const businessNameFieldKey = getProfileBusinessNameFieldKey(type, currentUser);
  const fields = useMemo(() => getProfileEditFields(type, currentUser), [type, currentUser]);

  const [form, setForm] = useState(() => hydrateProfileEditForm(currentUser, getProfileEditFields(type, currentUser)));
  const [photoUrl, setPhotoUrl] = useState(() => getUserProfilePhotoUrl(currentUser) || getUserCompanyLogoUrl(currentUser));
  const [logoUrl, setLogoUrl] = useState(() => getUserCompanyLogoUrl(currentUser));
  const [profileVideoUrl, setProfileVideoUrl] = useState(() =>
    currentUser?.video_url && String(currentUser.video_url).trim() ? String(currentUser.video_url).trim() : null,
  );
  const [pendingProfileVideo, setPendingProfileVideo] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoInput = useRef(null);
  const logoInput = useRef(null);
  const videoInput = useRef(null);
  const [crop, setCrop] = useState(null);

  const busy = saving || uploadingPhoto || uploadingVideo || uploadingLogo;
  const videoPreview = useMemo(
    () => (pendingProfileVideo ? URL.createObjectURL(pendingProfileVideo) : null),
    [pendingProfileVideo],
  );

  useEffect(() => {
    if (!videoPreview) return undefined;
    return () => URL.revokeObjectURL(videoPreview);
  }, [videoPreview]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const setField = (key, value) => setForm(prev => ({...prev, [key]: value}));

  const toggleChip = (field, option, selected) => {
    const current = Array.isArray(form[field.key]) ? form[field.key] : [];
    const next = field.key === 'types' ? (selected ? [] : [option]) : selected ? current.filter(v => v !== option) : [...current, option];
    if (field.key === 'types') {
      const valid = new Set(getProfessionalSpecializationsForTypes(next));
      const specs = (Array.isArray(form.specializations) ? form.specializations : []).filter(s => valid.has(s));
      setForm(prev => ({...prev, types: next, specializations: specs}));
      return;
    }
    setField(field.key, next);
  };

  const beginCrop = (file, target) => {
    if (!file || busy) return;
    if (crop?.uri) URL.revokeObjectURL(crop.uri);
    setCrop({uri: URL.createObjectURL(file), target, name: file.name || 'photo.jpg'});
  };

  const cancelCrop = () => {
    if (crop?.uri) URL.revokeObjectURL(crop.uri);
    setCrop(null);
  };

  const confirmCrop = result => {
    const target = crop?.target;
    const uri = crop?.uri;
    setCrop(null);
    if (uri) URL.revokeObjectURL(uri);
    if (result?.uri && result.uri !== uri) URL.revokeObjectURL(result.uri);
    if (result?.file && target) uploadImage(result.file, target);
    else if (result?.error) window.alert('לא ניתן לחתוך את התמונה');
  };

  const uploadImage = async (file, target) => {
    if (!file || busy) return;
    const setBusy = target === 'logo' ? setUploadingLogo : setUploadingPhoto;
    setBusy(true);
    try {
      const uploaded = target === 'logo' ? await uploadFile(file, 'company-logos') : await uploadProfilePicture(file);
      const url = uploaded?.url || uploaded?.publicUrl;
      if (!url) throw new Error('לא התקבלה כתובת תמונה');
      if (target === 'logo') setLogoUrl(url);
      else setPhotoUrl(url);
    } catch (err) {
      window.alert(err?.message || (target === 'logo' ? 'לא ניתן לבחור לוגו' : 'לא ניתן לבחור תמונה'));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    const subId = currentUser?.id || currentUser?.subscription_id;
    if (!subId) {
      window.alert('לא ניתן לזהות את המשתמש.');
      return;
    }
    const payload = {};
    fields.forEach(f => {
      if (f.type === 'chips' || f.key === 'activity_regions' || f.key === 'types' || f.key === 'specializations') {
        payload[f.key] = Array.isArray(form[f.key]) ? form[f.key].map(v => String(v).trim()).filter(Boolean) : [];
        return;
      }
      payload[f.key] = form[f.key] != null ? String(form[f.key]).trim() : '';
    });
    if (canEditProfilePhoto) Object.assign(payload, buildProfilePhotoSavePayload(photoUrl));
    if (canEditCompanyLogo && logoUrl) payload.company_logo_url = logoUrl;
    applyProfilePhoneSync(payload, type);

    let nextVideoUrl = profileVideoUrl;
    if (canEditProfileVideo && pendingProfileVideo) {
      setUploadingVideo(true);
      try {
        const uploaded = await uploadFile(pendingProfileVideo, 'profile-videos', {timeoutMs: 180000});
        if (uploaded?.url) {
          nextVideoUrl = uploaded.url;
          setProfileVideoUrl(uploaded.url);
          setPendingProfileVideo(null);
        } else throw new Error('לא התקבלה כתובת סרטון');
      } catch (err) {
        window.alert(err?.message || 'העלאת הסרטון נכשלה, נסה/י שוב.');
        setUploadingVideo(false);
        return;
      } finally {
        setUploadingVideo(false);
      }
    }
    const currentVideo = currentUser?.video_url && String(currentUser.video_url).trim() ? String(currentUser.video_url).trim() : null;
    if (canEditProfileVideo && nextVideoUrl !== currentVideo) payload.video_url = nextVideoUrl || null;

    setSaving(true);
    try {
      const res = await updateSubscriptionProfile(subId, payload);
      const updated = res?.subscription || null;
      const photoPatch = canEditProfilePhoto ? buildProfilePhotoSavePayload(photoUrl) : {};
      const logoPatch = canEditCompanyLogo && logoUrl ? {company_logo_url: logoUrl, companyLogoUrl: logoUrl} : {};
      setCurrentUser(prev => (prev ? {...prev, ...(updated || payload), ...photoPatch, ...logoPatch} : prev));
      window.alert('הפרופיל עודכן בהצלחה.');
      onClose?.();
    } catch (err) {
      window.alert(err?.message || 'שמירת הפרופיל נכשלה, נסה/י שוב.');
    } finally {
      setSaving(false);
    }
  };

  const removeProfileVideo = () => {
    if (uploadingVideo || saving) return;
    setPendingProfileVideo(null);
    setProfileVideoUrl(null);
  };

  const subscriberNumber =
    currentUser?.subscriber_number != null && String(currentUser.subscriber_number).trim() !== ''
      ? String(currentUser.subscriber_number)
      : '';

  const videoSrc = videoPreview || profileVideoUrl;
  const photoLabel = photoUrl ? 'שינוי תמונה' : 'העלאת תמונה';
  const logoLabel = logoUrl ? 'שינוי לוגו חברה' : 'העלאת לוגו חברה';

  return (
    <div className={styles.screen} dir="rtl">
      <div className={styles.phone}>
        <header className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
            <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
          </button>
          <h1>עריכת פרופיל</h1>
          <span className={styles.backBtn} />
        </header>
        <div className={styles.body}>
          <section className={styles.avatarSection}>
            {canEditProfilePhoto ? (
              <>
                <button type="button" className={styles.avatarHit} disabled={busy} onClick={() => photoInput.current?.click()}>
                  <span className={styles.avatarWrap}>
                    <ProfileAvatar uri={photoUrl} size={135} subscriptionType={currentUser} />
                    <span className={styles.cameraBadge}>
                      {uploadingPhoto ? <span className={styles.spinner} /> : <MdiIcon path={mdiCamera} size={17} color="#fff" />}
                    </span>
                  </span>
                </button>
                <button type="button" className={styles.changeText} disabled={busy} onClick={() => photoInput.current?.click()}>
                  {photoLabel}
                </button>
                <input
                  ref={photoInput}
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    beginCrop(e.target.files?.[0], 'profile');
                    e.target.value = '';
                  }}
                />
              </>
            ) : (
              <span className={styles.avatarWrap}>
                <ProfileAvatar uri={logoUrl || photoUrl} size={135} subscriptionType={currentUser} />
              </span>
            )}
          </section>
          {canEditProfileVideo ? (
            <section className={styles.videoSection}>
              <p className={styles.label}>סרטון פרופיל</p>
              {videoSrc ? (
                <button type="button" className={styles.videoFrame} disabled={busy} onClick={() => videoInput.current?.click()}>
                  <video className={styles.video} src={videoSrc} muted playsInline />
                  {uploadingVideo ? (
                    <span className={styles.videoOverlay}>
                      <span className={styles.spinner} />
                    </span>
                  ) : null}
                </button>
              ) : (
                <button type="button" className={styles.videoPlaceholder} disabled={busy} onClick={() => videoInput.current?.click()}>
                  <MdiIcon path={mdiVideoOutline} size={36} color="rgba(255,255,255,0.4)" />
                  <span>העלאת סרטון פרופיל</span>
                </button>
              )}
              <div className={styles.videoActions}>
                <button type="button" className={styles.videoLink} disabled={busy} onClick={() => videoInput.current?.click()}>
                  {videoSrc ? 'החלפת סרטון' : 'בחירת סרטון'}
                </button>
                {videoSrc ? (
                  <button type="button" className={styles.removeVideo} disabled={busy} onClick={removeProfileVideo}>
                    הסרת סרטון
                  </button>
                ) : null}
              </div>
              <input
                ref={videoInput}
                hidden
                type="file"
                accept="video/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setPendingProfileVideo(file);
                  e.target.value = '';
                }}
              />
            </section>
          ) : null}
          {currentUser?.email ? (
            <div className={styles.field}>
              <p className={styles.label}>אימייל</p>
              <div className={`${styles.input} ${styles.readonly}`}>{currentUser.email}</div>
            </div>
          ) : null}
        {fields.map(f => {
          const chipOptions =
            f.optionsFrom === 'professionalTypes'
              ? getProfessionalSpecializationsForTypes(Array.isArray(form.types) ? form.types : [])
              : f.options || [];
          const ltr = f.keyboardType === 'phone-pad' || f.keyboardType === 'url';
          return (
            <div key={f.key}>
              <div className={styles.field}>
                <p className={styles.label}>{f.label}</p>
                {f.type === 'chips' ? (
                  chipOptions.length === 0 ? (
                    <p className={styles.hint}>{f.emptyHint || 'אין אפשרויות'}</p>
                  ) : (
                    <div className={styles.chips}>
                      {chipOptions.map(option => {
                        const selected = Array.isArray(form[f.key]) && form[f.key].includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={selected ? styles.chipOn : styles.chip}
                            disabled={busy}
                            onClick={() => toggleChip(f, option, selected)}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : f.multiline ? (
                  <textarea
                    className={`${styles.input} ${styles.area}`}
                    value={form[f.key] ?? ''}
                    placeholder={f.placeholder}
                    disabled={busy}
                    onChange={e => setField(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className={`${styles.input} ${ltr ? styles.ltr : ''}`}
                    value={form[f.key] ?? ''}
                    placeholder={f.placeholder}
                    disabled={busy}
                    dir={ltr ? 'ltr' : undefined}
                    onChange={e => setField(f.key, e.target.value)}
                  />
                )}
                </div>
              {canEditCompanyLogo && f.key === businessNameFieldKey ? (
                <div className={styles.field}>
                  <p className={styles.label}>לוגו חברה</p>
                  <div className={styles.logoRow}>
                    <button type="button" className={styles.avatarHit} disabled={busy} onClick={() => logoInput.current?.click()}>
                      <span className={styles.avatarWrap}>
                        <ProfileAvatar uri={logoUrl} size={130} subscriptionType={currentUser} />
                        <span className={styles.cameraBadge}>
                          {uploadingLogo ? <span className={styles.spinner} /> : <MdiIcon path={mdiCamera} size={17} color="#fff" />}
                        </span>
                      </span>
                    </button>
                    <button type="button" className={styles.changeText} disabled={busy} onClick={() => logoInput.current?.click()}>
                      {logoLabel}
                    </button>
                  </div>
                  <input
                    ref={logoInput}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      beginCrop(e.target.files?.[0], 'logo');
                      e.target.value = '';
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
          {subscriberNumber ? (
            <div className={styles.field}>
              <p className={styles.label}>מספר מנוי</p>
              <div className={`${styles.input} ${styles.readonly}`}>{subscriberNumber}</div>
            </div>
          ) : null}
          <button type="button" className={styles.save} disabled={busy} onClick={handleSave}>
            {saving || uploadingVideo ? <span className={styles.spinnerDark} /> : 'שמירה'}
          </button>
          <button type="button" className={styles.cancel} onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
      {crop ? (
        <CircleCropModal
          imageUri={crop.uri}
          title={crop.target === 'logo' ? 'חתוך את לוגו החברה' : 'חתוך את תמונת הפרופיל'}
          onCancel={cancelCrop}
          onConfirm={confirmCrop}
        />
      ) : null}
    </div>
  );
}
