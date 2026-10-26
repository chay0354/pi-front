import {forwardRef, useState} from 'react';
import styles from './Account.module.css';
import subscriptionBackground from '../assets/account/subscription-background.png';

/** Material Design Icons paths — the glyphs the mobile screens use via MaterialCommunityIcons. */
const ICON_PATHS = {
  'chevron-left': 'M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z',
  check: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  close:
    'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
  plus: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
  minus: 'M19,13H5V11H19V13Z',
  eye: 'M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z',
  'eye-off':
    'M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7L7.3,5.47C8.74,4.85 10.33,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z',
  camera:
    'M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z',
  crop: 'M7,17V1H5V5H1V7H5V17A2,2 0 0,0 7,19H17V23H19V19H23V17M17,15H19V7C19,5.89 18.1,5 17,5H9V7H17V15Z',
  copy: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
  share:
    'M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z',
  'check-circle': 'M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z',
  account:
    'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z',
  'account-group':
    'M12,5A3.5,3.5 0 0,0 8.5,8.5A3.5,3.5 0 0,0 12,12A3.5,3.5 0 0,0 15.5,8.5A3.5,3.5 0 0,0 12,5M12,7A1.5,1.5 0 0,1 13.5,8.5A1.5,1.5 0 0,1 12,10A1.5,1.5 0 0,1 10.5,8.5A1.5,1.5 0 0,1 12,7M5.5,8A2.5,2.5 0 0,0 3,10.5C3,11.44 3.53,12.25 4.29,12.68C4.65,12.88 5.06,13 5.5,13C5.94,13 6.35,12.88 6.71,12.68C7.08,12.47 7.39,12.17 7.62,11.81C6.89,10.86 6.5,9.7 6.5,8.5C6.5,8.41 6.5,8.31 6.5,8.22C6.2,8.08 5.86,8 5.5,8M18.5,8C18.14,8 17.8,8.08 17.5,8.22C17.5,8.31 17.5,8.41 17.5,8.5C17.5,9.7 17.11,10.86 16.38,11.81C16.5,12 16.63,12.15 16.78,12.3C16.94,12.45 17.1,12.58 17.29,12.68C17.65,12.88 18.06,13 18.5,13C18.94,13 19.35,12.88 19.71,12.68C20.47,12.25 21,11.44 21,10.5A2.5,2.5 0 0,0 18.5,8M12,14C9.66,14 5,15.17 5,17.5V19H19V17.5C19,15.17 14.34,14 12,14M4.71,14.55C2.78,14.78 0,15.76 0,17.5V19H3V17.07C3,16.06 3.69,15.22 4.71,14.55M19.29,14.55C20.31,15.22 21,16.06 21,17.07V19H24V17.5C24,15.76 21.22,14.78 19.29,14.55M12,16C13.53,16 15.24,16.5 16.23,17H7.77C8.76,16.5 10.47,16 12,16Z',
  'office-building':
    'M19 3V21H13V17.5H11V21H5V3H19M15 7H17V5H15V7M11 7H13V5H11V7M7 7H9V5H7V7M15 11H17V9H15V11M11 11H13V9H11V11M7 11H9V9H7V11M15 15H17V13H15V15M11 15H13V13H11V15M7 15H9V13H7V15M15 19H17V17H15V19M7 19H9V17H7V19M21 1H3V23H21V1Z',
  'home-city':
    'M10,2V4.26L12,5.59V4H22V19H18V21H24V2H10M7.5,5L0,10V21H15V10L7.5,5M14,6V6.93L15.61,8H16V6H14M18,6V8H20V6H18M7.5,7.5L13,11V19H10V13H5V19H2V11L7.5,7.5M18,10V12H20V10H18M18,14V16H20V14H18Z',
  infinity:
    'M18.6,6.62C21.58,6.62 24,9 24,12C24,14.96 21.58,17.37 18.6,17.37C17.15,17.37 15.8,16.81 14.78,15.8L12,13.34L9.17,15.85C8.2,16.82 6.84,17.38 5.4,17.38C2.42,17.38 0,14.96 0,12C0,9.04 2.42,6.62 5.4,6.62C6.84,6.62 8.2,7.18 9.22,8.2L12,10.66L14.83,8.15C15.8,7.18 17.16,6.62 18.6,6.62M7.8,14.39L10.5,12L7.84,9.65C7.16,8.97 6.31,8.62 5.4,8.62C3.53,8.62 2,10.13 2,12C2,13.87 3.53,15.38 5.4,15.38C6.31,15.38 7.16,15.03 7.8,14.39M16.2,9.61L13.5,12L16.16,14.35C16.84,15.03 17.7,15.38 18.6,15.38C20.47,15.38 22,13.87 22,12C22,10.13 20.47,8.62 18.6,8.62C17.69,8.62 16.84,8.97 16.2,9.61Z',
  key: 'M22,18V22H18V19H15V16H12L9.74,13.74C9.19,13.91 8.61,14 8,14A6,6 0 0,1 2,8A6,6 0 0,1 8,2A6,6 0 0,1 14,8C14,8.61 13.91,9.19 13.74,9.74L22,18M7,5A2,2 0 0,0 5,7A2,2 0 0,0 7,9A2,2 0 0,0 9,7A2,2 0 0,0 7,5Z',
  ticket:
    'M14.8 8L16 9.2L9.2 16L8 14.8L14.8 8M4 4H20C21.11 4 22 4.89 22 6V10C20.9 10 20 10.9 20 12S20.9 14 22 14V18C22 19.11 21.11 20 20 20H4C2.9 20 2 19.11 2 18V14C3.11 14 4 13.11 4 12S3.11 10 2 10V6C2 4.89 2.9 4 4 4M4 6V8.54C5.24 9.26 6 10.57 6 12S5.24 14.75 4 15.46V18H20V15.46C18.76 14.74 18 13.43 18 12S18.76 9.26 20 8.54V6H4M9.5 8C10.33 8 11 8.67 11 9.5S10.33 11 9.5 11 8 10.33 8 9.5 8.67 8 9.5 8M14.5 13C15.33 13 16 13.67 16 14.5S15.33 16 14.5 16 13 15.33 13 14.5 13.67 13 14.5 13Z',
  video:
    'M15,8V16H5V8H15M16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5V7A1,1 0 0,0 16,6Z',
};

export function Icon({name, size = 24, color = 'currentColor', className}) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[name]} fill={color} />
    </svg>
  );
}

const cx = (...names) => names.filter(Boolean).join(' ');

/**
 * Full-stage account screen: sticky header (back chevron + centered title) and a centered column.
 * `backdrop` mirrors the mobile subscription-background image + fade.
 */
export function AccountScreen({
  title,
  onBack,
  backLabel = 'חזור',
  backIcon = 'chevron-left',
  backdrop = false,
  surface = false,
  width = 520,
  header,
  className,
  overlay,
  children,
}) {
  return (
    <div className={cx(styles.screen, surface && styles.screenSurface, className)}>
      {backdrop ? (
        <div className={styles.backdrop} aria-hidden="true">
          <img src={subscriptionBackground} alt="" />
        </div>
      ) : null}
      <div className={styles.scroll}>
        <header className={styles.header}>
          {onBack ? (
            <button type="button" className={styles.backBtn} onClick={onBack} aria-label={backLabel}>
              <Icon name={backIcon} size={backIcon === 'close' ? 30 : 34} />
            </button>
          ) : (
            <span className={styles.headerSpacer} />
          )}
          <h1 className={styles.headerTitle}>{title}</h1>
          <span className={styles.headerSpacer} />
        </header>
        {header}
        <main className={styles.column} style={{width}}>
          {children}
        </main>
      </div>
      {overlay}
    </div>
  );
}

/** מנוי steps — 1 is the right-most circle in RTL. */
export function Wizard({step}) {
  return (
    <div className={styles.wizard} aria-label={`שלב ${step} מתוך 3`}>
      {[1, 2, 3].map(n => (
        <div key={n} className={styles.wizardItem}>
          {n > 1 ? <span className={styles.wizardLine} /> : null}
          <span className={cx(styles.wizardStep, n === step && styles.wizardStepActive)}>{n}</span>
        </div>
      ))}
    </div>
  );
}

export function Field({label, required = false, starFirst = false, hint, children, className}) {
  const star = required ? <span className={styles.required}>*</span> : null;
  return (
    <label className={cx(styles.field, className)}>
      {label ? (
        <span className={styles.label}>
          {starFirst ? star : null}
          {label}
          {starFirst ? null : star}
        </span>
      ) : null}
      {children}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

export const TextInput = forwardRef(function TextInput({className, invalid, filled, ...props}, ref) {
  return (
    <input
      ref={ref}
      className={cx(styles.input, invalid && styles.inputInvalid, filled && styles.inputFilled, className)}
      {...props}
    />
  );
});

export function TextArea({className, ...props}) {
  return <textarea className={cx(styles.textarea, className)} {...props} />;
}

export function PasswordInput({value, onChange, placeholder, show, onToggleShow, invalid, autoComplete = 'new-password'}) {
  const [localShow, setLocalShow] = useState(false);
  const visible = show ?? localShow;
  const toggle = onToggleShow ?? (() => setLocalShow(v => !v));
  return (
    <div className={cx(styles.inputRow, invalid && styles.inputInvalid)}>
      <input
        className={styles.inputBare}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={styles.eyeBtn}
        onClick={toggle}
        aria-label={visible ? 'הסתר סיסמה' : 'הצג סיסמה'}>
        <Icon name={visible ? 'eye-off' : 'eye'} size={22} />
      </button>
    </div>
  );
}

/** Mobile phone row: number on the left (LTR), "IL ⌄" country chip at the end. */
export function PhoneInput({value, onChange, placeholder = '00 000 0000'}) {
  return (
    <div className={styles.inputRow}>
      <input
        className={cx(styles.inputBare, styles.phoneBare)}
        type="tel"
        dir="ltr"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="tel-national"
      />
      <span className={styles.country} dir="ltr" aria-hidden="true">
        IL <span className={styles.countryChevron}>⌄</span>
      </span>
    </div>
  );
}

export function Spinner({dark = false}) {
  return <span className={cx(styles.spinner, dark && styles.spinnerDark)} role="status" aria-label="טוען" />;
}

/**
 * Pill CTA. `gold` = the mobile gradient, otherwise the muted #4d4966 pill.
 * Disabled gold buttons fall back to the muted pill (mobile renders the gradient only when enabled).
 */
export function PrimaryButton({children, onClick, disabled, loading, gold = true, type = 'button', className}) {
  const isGold = gold && !disabled;
  return (
    <button
      type={type}
      className={cx(styles.primaryBtn, isGold ? styles.primaryGold : styles.primaryMuted, disabled && styles.primaryDisabled, className)}
      onClick={onClick}
      disabled={disabled || loading}>
      {loading ? <Spinner dark={isGold} /> : children}
    </button>
  );
}

export function TextLink({children, onClick, className, disabled}) {
  return (
    <button type="button" className={cx(styles.textLink, className)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ErrorBox({children, onClose, tone = 'soft'}) {
  if (!children) return null;
  return (
    <div className={cx(styles.errorBox, tone === 'solid' && styles.errorSolid)} role="alert">
      <span className={styles.errorText}>{children}</span>
      {onClose ? (
        <button type="button" className={styles.errorClose} onClick={onClose} aria-label="סגור">
          <Icon name="close" size={18} />
        </button>
      ) : null}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className={styles.orRow}>
      <span className={styles.orLine} />
      <span className={styles.orText}>או</span>
      <span className={styles.orLine} />
    </div>
  );
}

export function RoundCheckbox({checked, onChange, label, children, className}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={cx(styles.checkRow, className)}
      onClick={() => onChange(!checked)}>
      <span className={cx(styles.checkCircle, checked && styles.checkCircleOn)}>
        {checked ? <Icon name="check" size={15} color="#f4ad39" /> : null}
      </span>
      {label ? <span className={styles.checkLabel}>{label}</span> : null}
      {children}
    </button>
  );
}

export function Chip({selected, onClick, children}) {
  return (
    <button type="button" className={cx(styles.chip, selected && styles.chipOn)} onClick={onClick} aria-pressed={selected}>
      {children}
    </button>
  );
}

export function Divider() {
  return <hr className={styles.divider} />;
}

/** Hidden file input + open() — the web version of the mobile image/video pickers. */
export function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

export {styles as accountStyles};
