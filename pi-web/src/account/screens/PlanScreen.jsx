import {AccountScreen, Icon} from '../AccountUi';
import {COMPANY_PLANS, MARKETER_PLANS} from '../constants';
import styles from './SubscriptionScreens.module.css';

const COMPANY_OPTIONS = [
  {id: COMPANY_PLANS.projects5, title: 'מנוי ל-5 פרוייקטים', subtitle: 'עד 5 מודעות פעילות במקביל', icon: 'home-city'},
  {id: COMPANY_PLANS.projects10, title: 'מנוי ל-10 פרוייקטים', subtitle: 'עד 10 מודעות פעילות במקביל', icon: 'office-building'},
  {id: COMPANY_PLANS.multi, title: 'מנוי-ללא הגבלה פאי מולטי', subtitle: 'ללא הגבלה על מספר המודעות', icon: 'infinity'},
];

const MARKETER_OPTIONS = [
  {id: MARKETER_PLANS.single, title: 'משווק אחד', subtitle: 'עד 5 פרויקטים', icon: 'account'},
  {id: MARKETER_PLANS.team5, title: 'חמש משווקים', subtitle: 'עד 10 פרויקטים', icon: 'account-group'},
  {id: MARKETER_PLANS.team10, title: 'עשר משווקים', subtitle: 'משרד — ללא הגבלה על פרויקטים', icon: 'office-building'},
];

function PlanCard({icon, title, subtitle, onClick, muted}) {
  return (
    <button type="button" className={`${styles.planCard} ${muted ? styles.planCardMuted : ''}`} onClick={onClick}>
      <span className={styles.planIcon}>
        <Icon name={icon} size={26} color="#FFBF3E" />
      </span>
      <span className={styles.planTexts}>
        <span className={styles.planTitle}>{title}</span>
        <span className={styles.planSubtitle}>{subtitle}</span>
      </span>
      <Icon name="chevron-left" size={26} color="rgba(255,255,255,0.6)" />
    </button>
  );
}

/** CompanyPlanScreen / ProjectMarketerPlanScreen — `variant` is 'company' | 'marketer'. */
export default function PlanScreen({variant, onClose, onSelectPlan, onJoinAgency}) {
  const isMarketer = variant === 'marketer';
  const options = isMarketer ? MARKETER_OPTIONS : COMPANY_OPTIONS;

  return (
    <AccountScreen
      title={isMarketer ? 'משווק פרויקטים' : 'מנוי לחברות'}
      onBack={onClose}
      backdrop
      width={520}>
      <p className={styles.planLead}>בחרו את סוג המנוי שמתאים לכם</p>
      <div className={styles.planList}>
        {options.map(plan => (
          <PlanCard key={plan.id} {...plan} onClick={() => onSelectPlan?.(plan.id)} />
        ))}
        {isMarketer ? (
          <>
            <span className={styles.planDivider} />
            <PlanCard
              muted
              icon="key"
              title="הצטרף לסוכנות קיימת"
              subtitle="באמצעות קוד הצטרפות שקיבלת ממנהל הסוכנות"
              onClick={() => onJoinAgency?.()}
            />
          </>
        ) : null}
      </div>
    </AccountScreen>
  );
}
