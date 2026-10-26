import {useMemo, useState} from 'react';
import {checkEmailAvailable} from '../../api/client';
import {
  AccountScreen,
  Chip,
  Divider,
  ErrorBox,
  Field,
  Icon,
  PrimaryButton,
  RoundCheckbox,
  TextArea,
  TextInput,
  Wizard,
  accountStyles as ui,
  pickFile,
} from '../AccountUi';
import CircleCropModal from '../CircleCropModal';
import {
  BROKER_ACTIVITY_REGIONS,
  BROKER_SPECIALIZATIONS,
  PROFESSIONAL_SIGNUP_TYPES,
  getHeaderTitle,
  getProfessionalSpecializationsForTypes,
  subscriptionTypes,
} from '../constants';
import userIcon from '../../assets/account/user-icon.png';
import styles from './FormScreens.module.css';

const isRemoteUri = uri => typeof uri === 'string' && /^https?:\/\//.test(uri);

const webPickedFile = (file, prefix) => ({
  uri: URL.createObjectURL(file),
  type: file.type,
  name: file.name || `${prefix}-${Date.now()}`,
  file,
});

function ProfilePictureUpload({image, onPick, onEdit}) {
  return (
    <div className={styles.mediaBlock}>
      <span className={styles.mediaTitle}>
        תמונת פרופיל <span className={styles.requiredStar}>*</span>
      </span>
      <button type="button" className={styles.dashedBox} onClick={onPick}>
        {image ? (
          <span className={styles.photoPreview}>
            <img src={image.uri} alt="" />
          </span>
        ) : (
          <span className={styles.dashedEmpty}>
            <img src={userIcon} alt="" className={styles.userIcon} />
            <span className={styles.dashedText}>תמונת פרופיל</span>
            <span className={styles.uploadPill}>העלאת תמונה</span>
          </span>
        )}
      </button>
      {image ? (
        <button type="button" className={styles.editChip} onClick={onEdit}>
          <Icon name="crop" size={18} />
          עריכה
        </button>
      ) : null}
    </div>
  );
}

/** Wizard step 1 — the org/profile details form for company, marketer, broker and professional. */
export default function SubscriptionFormScreen({
  subscriptionType = subscriptionTypes.broker,
  marketerPlan = null,
  companyPlan = null,
  onClose,
  onNext,
}) {
  const isProjectMarketerFlow = subscriptionType === subscriptionTypes.projectMarketer;
  const isCompanyFlow = subscriptionType === subscriptionTypes.company || isProjectMarketerFlow;
  const isBroker = subscriptionType === subscriptionTypes.broker;
  const isProfessional = subscriptionType === subscriptionTypes.professional;
  const orgNameLabel = isProjectMarketerFlow ? 'שם המשווק' : 'שם החברה';
  const orgLogoLabel = isProjectMarketerFlow ? 'משווק' : 'חברה';
  const companyLogoLabel = `לוגו ${orgLogoLabel}`;
  const orgWebsiteLabel = isProjectMarketerFlow ? 'כתובת אתר המשווק' : 'כתובת אתר החברה';

  const [activeTab, setActiveTab] = useState('images');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [addDescription, setAddDescription] = useState(false);

  const [brokerageLicenseNumber, setBrokerageLicenseNumber] = useState('');
  const [brokerOfficeName, setBrokerOfficeName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [dealerNumber, setDealerNumber] = useState('');
  const [phone1, setPhone1] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phone2, setPhone2] = useState('');

  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureSourceUri, setProfilePictureSourceUri] = useState(null);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [video, setVideo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [crop, setCrop] = useState(null);

  const specializationOptions = useMemo(() => getProfessionalSpecializationsForTypes(selectedTypes), [selectedTypes]);

  const toggleType = type => {
    const next = selectedTypes.includes(type) ? [] : [type];
    const valid = new Set(getProfessionalSpecializationsForTypes(next));
    setSelectedTypes(next);
    setSelectedSpecializations(prev => prev.filter(spec => valid.has(spec)));
  };
  const toggleIn = setter => value =>
    setter(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  const toggleSpecialization = toggleIn(setSelectedSpecializations);
  const toggleRegion = toggleIn(setSelectedRegions);

  const pickProfilePicture = async () => {
    const file = await pickFile('image/*');
    if (!file) return;
    const uri = URL.createObjectURL(file);
    setProfilePictureSourceUri(uri);
    setCrop({target: 'profile', uri});
  };

  const pickCompanyLogo = async () => {
    const file = await pickFile('image/*');
    if (file) setCrop({target: 'logo', uri: URL.createObjectURL(file)});
  };

  const pickVideo = async () => {
    const file = await pickFile('video/*');
    if (file) setVideo(webPickedFile(file, 'video'));
  };

  const handleCropConfirm = result => {
    const target = crop?.target;
    setCrop(null);
    if (result?.error) {
      window.alert(`שגיאה\n\n${result.error}`);
      return;
    }
    if (!result?.uri) return;
    if (target === 'logo') setCompanyLogo({...result, name: `logo-${Date.now()}.jpg`});
    else setProfilePicture({...result, name: `profile-${Date.now()}.jpg`});
  };

  const profileMediaOk = !!profilePicture && !!companyLogo;
  const companyCanProceed =
    companyName.trim() && contactPersonName.trim() && officePhone.trim() && companyEmail.trim() && businessAddress.trim() && !!companyLogo;
  const brokerCanProceed =
    brokerageLicenseNumber.trim() && brokerOfficeName.trim() && agentName.trim() && phone1.trim() && email.trim() && profileMediaOk;
  const professionalCanProceed =
    businessName.trim() && businessAddress.trim() && phone1.trim() && email.trim() && profileMediaOk;
  const canProceed = isCompanyFlow ? companyCanProceed : isBroker ? brokerCanProceed : professionalCanProceed;

  const handleSubmit = async () => {
    setErrorMessage(null);
    try {
      const missing = [];
      if (isCompanyFlow) {
        if (!companyLogo) missing.push(companyLogoLabel);
        if (!companyName) missing.push(orgNameLabel);
        if (!contactPersonName) missing.push('שם איש קשר');
        if (!companyEmail) missing.push('כתובת מייל');
        if (!officePhone) missing.push('מספר טלפון משרד');
        if (!businessAddress.trim()) missing.push('כתובת חברה');
      } else if (isBroker) {
        if (!profilePicture) missing.push('תמונת פרופיל');
        if (!companyLogo) missing.push(companyLogoLabel);
        if (!brokerageLicenseNumber) missing.push('מספר רשיון תיווך');
        if (!brokerOfficeName) missing.push('שם משרד המתווך');
        if (!agentName) missing.push('שם הסוכן');
        if (!email) missing.push('כתובת מייל');
        if (!phone1) missing.push('מספר טלפון');
      } else {
        if (!profilePicture) missing.push('תמונת פרופיל');
        if (!companyLogo) missing.push(companyLogoLabel);
        if (!businessName) missing.push('שם העסק');
        if (!businessAddress) missing.push('כתובת בית העסק');
        if (!email) missing.push('כתובת מייל');
        if (!phone1) missing.push('מספר טלפון');
      }
      if (missing.length > 0) {
        setErrorMessage(`אנא מלא את השדות הבאים: ${missing.join(', ')}`);
        return;
      }

      setIsSubmitting(true);
      const registrationEmail = isCompanyFlow ? companyEmail.trim() : email.trim();
      const emailCheck = await checkEmailAvailable(registrationEmail);
      if (!emailCheck?.available) {
        setErrorMessage(emailCheck?.error || 'כתובת המייל כבר רשומה במערכת. התחבר עם המייל הקיים או השתמש במייל אחר.');
        return;
      }

      const formData = {
        subscriptionType,
        ...(isCompanyFlow
          ? {
              businessName: companyName,
              contactPersonName,
              companyId,
              officePhone,
              mobilePhone,
              email: companyEmail,
              companyWebsite,
              businessAddress: businessAddress.trim(),
              description: addDescription ? description : null,
              ...(isProjectMarketerFlow && marketerPlan ? {marketerPlan} : null),
              ...(!isProjectMarketerFlow && companyPlan ? {companyPlan} : null),
            }
          : isBroker
            ? {
                name: agentName,
                brokerageLicenseNumber,
                brokerOfficeName,
                agentName,
                dealerNumber,
                phone: phone1,
                email,
                description,
                specializations: selectedSpecializations,
                activityRegions: selectedRegions,
              }
            : {
                name: businessName,
                businessName,
                businessAddress,
                dealerNumber,
                phone: phone1,
                phone2,
                email,
                description,
                types: selectedTypes,
                specializations: selectedSpecializations,
              }),
        agreedToTerms: true,
        deferVerificationEmail: true,
      };

      const files = {};
      if (isCompanyFlow) {
        if (isRemoteUri(companyLogo?.uri)) {
          formData.profile_picture_url = companyLogo.uri;
          formData.company_logo_url = companyLogo.uri;
        } else if (companyLogo) {
          files.profilePicture = companyLogo;
          files.companyLogo = companyLogo;
        }
      } else {
        if (isRemoteUri(profilePicture?.uri)) formData.profile_picture_url = profilePicture.uri;
        else if (profilePicture) files.profilePicture = profilePicture;
        if (isRemoteUri(companyLogo?.uri)) formData.company_logo_url = companyLogo.uri;
        else if (companyLogo) files.companyLogo = companyLogo;
        if (video) files.video = video;
      }

      onNext?.({
        email: isCompanyFlow ? companyEmail : email,
        localProfileImage: isCompanyFlow ? companyLogo?.uri || null : profilePicture?.uri || companyLogo?.uri || null,
        pendingSubmit: {formData, files},
      });
    } catch (error) {
      setErrorMessage(error.message || 'נכשל בשליחת הטופס. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const req = (label, value, setter, placeholder, extra = {}) => (
    <Field label={label} required={extra.required} starFirst>
      <TextInput
        value={value}
        onChange={e => setter(e.target.value)}
        placeholder={placeholder}
        type={extra.type || 'text'}
        dir={extra.dir}
        autoComplete={extra.autoComplete}
      />
    </Field>
  );
  const cropModal = crop ? (
    <CircleCropModal
      imageUri={crop.uri}
      title={crop.target === 'logo' ? `חתוך את לוגו ה${orgLogoLabel}` : 'חתוך את תמונת הפרופיל'}
      onCancel={() => setCrop(null)}
      onConfirm={handleCropConfirm}
    />
  ) : null;

  return (
    <AccountScreen
      title={getHeaderTitle(subscriptionType)}
      onBack={onClose}
      backdrop
      width={520}
      header={<Wizard step={1} />}
      overlay={cropModal}>
      {errorMessage ? (
        <ErrorBox tone="solid" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </ErrorBox>
      ) : null}

      {!isCompanyFlow ? (
        <>
          <div className={styles.mediaType}>
            <span className={ui.sectionTitle}>בחר את סוג התצוגה של הפרופיל שלך</span>
            <div className={styles.tabTrack} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'images'}
                className={`${styles.tabPill} ${activeTab === 'images' ? styles.tabPillActive : ''}`}
                onClick={() => setActiveTab('images')}>
                תמונה
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'video'}
                className={`${styles.tabPill} ${activeTab === 'video' ? styles.tabPillActive : ''}`}
                onClick={() => setActiveTab('video')}>
                סרטון
              </button>
            </div>
          </div>

          {activeTab === 'images' ? (
            <ProfilePictureUpload
              image={profilePicture}
              onPick={pickProfilePicture}
              onEdit={() => setCrop({target: 'profile', uri: profilePictureSourceUri || profilePicture?.uri})}
            />
          ) : (
            <div className={styles.mediaBlock}>
              <span className={styles.mediaTitle}>סרטון</span>
              {video ? (
                <div className={styles.videoPreview}>
                  <video src={video.uri} muted playsInline preload="metadata" onClick={pickVideo} />
                  <button type="button" className={styles.videoRemove} onClick={() => setVideo(null)} aria-label="הסר סרטון">
                    <Icon name="close" size={22} />
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.videoPlaceholder} onClick={pickVideo}>
                  <Icon name="video" size={72} color="rgba(255,255,255,0.4)" />
                  <span className={styles.videoPlaceholderText}>העלה סרטון</span>
                  <span className={styles.uploadPill}>העלאת סרטון</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : null}

      <div className={styles.logoWrap}>
        <button type="button" className={styles.logoTouch} onClick={pickCompanyLogo} aria-label={companyLogoLabel}>
          <span className={styles.logoCircle}>
            <span className={styles.logoInner}>
              {companyLogo ? (
                <img src={companyLogo.uri} alt="" />
              ) : (
                <span className={styles.logoPlaceholder}>
                  לוגו
                  <br />
                  {orgLogoLabel}
                </span>
              )}
            </span>
          </span>
          <span className={styles.logoBadge}>
            <Icon name="camera" size={15} color="#fff" />
          </span>
        </button>
      </div>
      <Divider />

      {isProfessional ? (
        <>
          <section className={styles.chipSection}>
            <h3 className={styles.chipTitle}>סוג</h3>
            <div className={ui.chips}>
              {PROFESSIONAL_SIGNUP_TYPES.map(type => (
                <Chip key={type} selected={selectedTypes.includes(type)} onClick={() => toggleType(type)}>
                  {type}
                </Chip>
              ))}
            </div>
          </section>
          <section className={styles.chipSection}>
            <h3 className={styles.chipTitle}>התמחות</h3>
            {specializationOptions.length === 0 ? (
              <p className={styles.chipHint}>בחר סוג כדי לראות התמחויות רלוונטיות</p>
            ) : (
              <div className={ui.chips}>
                {specializationOptions.map(spec => (
                  <Chip key={spec} selected={selectedSpecializations.includes(spec)} onClick={() => toggleSpecialization(spec)}>
                    {spec}
                  </Chip>
                ))}
              </div>
            )}
          </section>
          <Divider />
        </>
      ) : null}

      {isBroker ? (
        <>
          <section className={styles.chipSection}>
            <h3 className={styles.sectionHeading}>תחומי התמחות</h3>
            <div className={ui.chips}>
              {BROKER_SPECIALIZATIONS.map(spec => (
                <Chip key={spec} selected={selectedSpecializations.includes(spec)} onClick={() => toggleSpecialization(spec)}>
                  {spec}
                </Chip>
              ))}
            </div>
          </section>
          <section className={styles.chipSection}>
            <h3 className={styles.sectionHeading}>אזור פעילות</h3>
            <div className={ui.chips}>
              {BROKER_ACTIVITY_REGIONS.map(region => (
                <Chip key={region} selected={selectedRegions.includes(region)} onClick={() => toggleRegion(region)}>
                  {region}
                </Chip>
              ))}
            </div>
          </section>
          <Divider />
        </>
      ) : null}

      <section className={styles.formSection}>
        <h3 className={styles.sectionHeading}>פרטים כלליים</h3>

        {isCompanyFlow ? (
          <>
            {req(orgNameLabel, companyName, setCompanyName, 'הזן שם מלא', {required: true})}
            {req('שם איש קשר', contactPersonName, setContactPersonName, 'הזן שם איש קשר', {required: true})}
            {req('מספר- ח.פ/עוסק/פטור', companyId, setCompanyId, 'הזן מספר- ח.פ/עוסק/פטור')}
            {req('מספר טלפון משרד', officePhone, setOfficePhone, 'הזן מספר טלפון', {required: true, type: 'tel'})}
            {req('מספר נייד', mobilePhone, setMobilePhone, 'הזן מספר נייד', {type: 'tel'})}
            {req('כתובת מייל', companyEmail, setCompanyEmail, 'הזן כתובת מייל', {required: true, type: 'email', autoComplete: 'email'})}
            {req(orgWebsiteLabel, companyWebsite, setCompanyWebsite, 'הזן כתובת אתר (אופציונלי)', {type: 'url'})}
            {req('כתובת חברה', businessAddress, setBusinessAddress, 'הזן כתובת חברה', {required: true})}
            <RoundCheckbox checked={addDescription} onChange={setAddDescription} label="הוסף תיאור" />
            {addDescription ? (
              <TextArea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={isProjectMarketerFlow ? 'כתוב תיאור כללי על השירות שלך' : 'כתוב תיאור כללי על החברה'}
              />
            ) : null}
          </>
        ) : isBroker ? (
          <>
            {req('מספר רשיון תיווך', brokerageLicenseNumber, setBrokerageLicenseNumber, 'הזן מספר רישיון', {required: true})}
            {req('שם משרד המתווך', brokerOfficeName, setBrokerOfficeName, 'הזן שם משרד', {required: true})}
            {req('שם הסוכן', agentName, setAgentName, 'הזן שם מלא', {required: true})}
            {req('מספר- ח.פ/עוסק/פטור', dealerNumber, setDealerNumber, 'הזן מספר- ח.פ/עוסק/פטור (אופציונאלי)')}
            {req('מספר טלפון', phone1, setPhone1, 'הזן מספר טלפון', {required: true, type: 'tel'})}
            {req('כתובת מייל', email, setEmail, 'הזן כתובת מייל', {required: true, type: 'email', autoComplete: 'email'})}
            <Field label="תיאור" starFirst>
              <TextArea value={description} onChange={e => setDescription(e.target.value)} placeholder="כתוב תיאור כללי על השירות שלך" />
            </Field>
          </>
        ) : (
          <>
            {req('שם העסק', businessName, setBusinessName, 'הזן שם', {required: true})}
            {req('כתובת בית העסק', businessAddress, setBusinessAddress, 'הזן כתובת', {required: true})}
            {req('מספר- ח.פ/עוסק/פטור', dealerNumber, setDealerNumber, 'הזן מספר- ח.פ/עוסק/פטור (אופציונאלי)')}
            {req('מספר טלפון 1', phone1, setPhone1, 'הזן מספר טלפון', {required: true, type: 'tel'})}
            {req('מספר טלפון 2', phone2, setPhone2, 'הזן מספר טלפון (אופציונאלי)', {type: 'tel'})}
            {req('כתובת מייל', email, setEmail, 'הזן כתובת מייל', {required: true, type: 'email', autoComplete: 'email'})}
            <Field label="תיאור" starFirst>
              <TextArea value={description} onChange={e => setDescription(e.target.value)} placeholder="כתוב תיאור כללי על השירות שלך" />
            </Field>
          </>
        )}
      </section>

      <PrimaryButton gold={false} disabled={!canProceed} loading={isSubmitting} onClick={handleSubmit}>
        הבא
      </PrimaryButton>
    </AccountScreen>
  );
}
