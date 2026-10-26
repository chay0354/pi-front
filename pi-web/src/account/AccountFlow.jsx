import {useCallback, useEffect, useRef, useState} from 'react';
import {useSession} from '../auth/session';
import {subscriptionTypes} from './constants';
import LoginScreen from './screens/LoginScreen';
import UserRegistrationScreen from './screens/UserRegistrationScreen';
import {SecretCodeRecoveryScreen, SecretCodeRecoverySentScreen} from './screens/SecretCodeRecoveryScreen';
import PlanScreen from './screens/PlanScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import SubscriptionFormScreen from './screens/SubscriptionFormScreen';
import VerificationScreen from './screens/VerificationScreen';
import RatingIntroScreen from './screens/RatingIntroScreen';
import SuccessScreen from './screens/SuccessScreen';
import JoinAgencyScreen from './screens/JoinAgencyScreen';
import AgencyJoinCodeScreen from './screens/AgencyJoinCodeScreen';
import TermsOfUseScreen from './screens/TermsOfUseScreen';

let entryId = 0;
const entry = (screen, props = {}) => ({id: ++entryId, screen, props});

/** Mobile SideMenu `onOpenSubscription(type)` → first screen of that account type's flow. */
export function subscriptionEntry(type) {
  if (type === subscriptionTypes.company) return {screen: 'plan', props: {variant: 'company'}};
  if (type === subscriptionTypes.projectMarketer) return {screen: 'plan', props: {variant: 'marketer'}};
  if (type === subscriptionTypes.professional) return {screen: 'subscription', props: {subscriptionType: type}};
  return {screen: 'subscription', props: {subscriptionType: subscriptionTypes.broker}};
}

/**
 * Account-opening navigator. Every pushed screen stays mounted (only the top one is visible) so
 * going back keeps what was typed, like the mobile stack. `onExit('back')` closes the flow onto the
 * menu; `onExit('home')` also closes the menu and lands on the feed.
 */
export default function AccountFlow({start, onExit}) {
  const {currentUser, setCurrentUser} = useSession();
  const [stack, setStack] = useState(() => [entry(start.screen, start.props)]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback((screen, props) => setStack(prev => [...prev, entry(screen, props)]), []);
  const pop = useCallback(
    (count = 1) => {
      if (stackRef.current.length <= count) {
        onExit('back');
        return;
      }
      setStack(prev => prev.slice(0, prev.length - count));
    },
    [onExit],
  );
  const signIn = useCallback(
    user => {
      if (user) setCurrentUser(user);
    },
    [setCurrentUser],
  );

  useEffect(() => {
    // Capture phase so the menu underneath never sees this Escape; open crop modals handle their own.
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      const top = stackRef.current[stackRef.current.length - 1];
      if (top?.screen === 'terms') return;
      pop();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pop]);

  const render = ({screen, props}) => {
    switch (screen) {
      case 'login':
        return (
          <LoginScreen
            onClose={() => pop()}
            onForgotPassword={email => push('recovery', {userEmail: email, fromLogin: true})}
            onLoginSuccess={sub => {
              signIn(sub);
              onExit('home');
            }}
          />
        );
      case 'userRegistration':
        return (
          <UserRegistrationScreen
            {...props}
            onCancel={() => pop()}
            onSuccess={user => {
              const {_justCreated, ...cleanUser} = user || {};
              const lock = props.bnbHostLock;
              signIn(_justCreated && lock ? {...cleanUser, bnb_host_lock: lock} : cleanUser);
              if (props.continuePublish) {
                onExit({continuePublish: props.continuePublish});
                return;
              }
              onExit(props.exitTo || 'back');
            }}
          />
        );
      case 'recovery':
        return (
          <SecretCodeRecoveryScreen
            {...props}
            onClose={() => pop()}
            onSent={email => push('recoverySent', {email})}
          />
        );
      case 'recoverySent':
        return <SecretCodeRecoverySentScreen {...props} onBack={() => pop(2)} />;
      case 'plan':
        return (
          <PlanScreen
            {...props}
            onClose={() => pop()}
            onSelectPlan={plan =>
              push(
                'subscription',
                props.variant === 'marketer'
                  ? {subscriptionType: subscriptionTypes.projectMarketer, marketerPlan: plan}
                  : {subscriptionType: subscriptionTypes.company, companyPlan: plan},
              )
            }
            onJoinAgency={() => push('joinAgency')}
          />
        );
      case 'subscription':
        return (
          <SubscriptionScreen
            subscriptionType={props.subscriptionType}
            onClose={() => pop()}
            onStart={() => push('form', props)}
          />
        );
      case 'form':
        return (
          <SubscriptionFormScreen
            {...props}
            onClose={() => pop()}
            onNext={draft => push('verification', {subscriptionType: props.subscriptionType, ...draft})}
          />
        );
      case 'verification': {
        const toRating = subscription =>
          push('rating', {
            subscriptionType: props.subscriptionType,
            subscription,
            localProfileImage: props.localProfileImage,
          });
        return (
          <VerificationScreen
            subscriptionType={props.subscriptionType}
            email={props.email}
            subscriptionId={props.subscriptionId}
            pendingSubmit={props.pendingSubmit}
            onClose={() => pop()}
            onVerified={toRating}
            onSkipVerifiedTest={toRating}
          />
        );
      }
      case 'rating':
        return (
          <RatingIntroScreen
            subscriptionType={props.subscriptionType}
            onClose={() => pop()}
            onContinue={() => push('success', props)}
          />
        );
      case 'success': {
        const finish = () => {
          signIn(props.subscription);
          onExit('home');
        };
        return <SuccessScreen {...props} onClose={() => pop()} onGoHome={finish} onStartPublishing={finish} />;
      }
      case 'joinAgency':
        return (
          <JoinAgencyScreen
            onClose={() => pop()}
            onJoined={sub => {
              signIn(sub);
              onExit('home');
            }}
          />
        );
      case 'agencyJoinCode':
        return <AgencyJoinCodeScreen currentUser={currentUser} onClose={() => pop()} />;
      case 'terms':
        return <TermsOfUseScreen onClose={() => pop()} />;
      default:
        return null;
    }
  };

  return (
    <>
      {stack.map((item, index) => {
        const isTop = index === stack.length - 1;
        return (
          <div
            key={item.id}
            style={{position: 'absolute', inset: 0, display: isTop ? 'block' : 'none'}}
            inert={isTop ? undefined : true}
            aria-hidden={isTop ? undefined : true}>
            {render(item)}
          </div>
        );
      })}
    </>
  );
}
