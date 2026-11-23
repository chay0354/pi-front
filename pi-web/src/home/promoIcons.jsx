import styles from '../screens/HomeScreen.module.css';
import architectRoof from '../assets/figma/home/8630e.svg';
import architectGround from '../assets/figma/home/f4263.svg';
import architectArmA from '../assets/figma/home/1863f.svg';
import architectArmB from '../assets/figma/home/d0638.svg';
import architectRing from '../assets/figma/home/b47ac.svg';
import architectHub from '../assets/figma/home/ef30d.svg';
import architectDot from '../assets/figma/home/2036b.svg';
import architectSparkDot from '../assets/figma/home/d661a.svg';
import brokerHouse from '../assets/figma/home/2617c.svg';
import brokerKey from '../assets/figma/home/ef481.svg';
import brokerWindow from '../assets/figma/home/3234d.svg';
import brokerPostA from '../assets/figma/home/49aad.svg';
import brokerPostB from '../assets/figma/home/05140.svg';
import brokerRoof from '../assets/figma/home/d8899.svg';
import brokerDotA from '../assets/figma/home/8dbe5.svg';
import brokerDotB from '../assets/figma/home/44a56.svg';
import brokerStake from '../assets/figma/home/7fd06.svg';
import interiorShade from '../assets/figma/home/3c1f3.svg';
import interiorBase from '../assets/figma/home/cef3e.svg';
import interiorPole from '../assets/figma/home/61108.svg';
import interiorChair from '../assets/figma/home/6ee4a.svg';
import interiorLamp from '../assets/figma/home/7e96f.svg';
import interiorDot from '../assets/figma/home/73e34.svg';
import interiorSparkDot from '../assets/figma/home/61276.svg';
import appraisalBoard from '../assets/figma/home/5e3d3.svg';
import appraisalSheet from '../assets/figma/home/3e2c4.svg';
import appraisalHouse from '../assets/figma/home/6c283.svg';
import appraisalMark from '../assets/figma/home/3b78c.svg';
import appraisalClip from '../assets/figma/home/5e958.svg';
import appraisalLine from '../assets/figma/home/9479d.svg';
import appraisalPlusH from '../assets/figma/home/cd08b.svg';
import appraisalPlusV from '../assets/figma/home/d2ef8.svg';
import lawyerTop from '../assets/figma/home/abb0c.svg';
import lawyerBase from '../assets/figma/home/8585d.svg';
import lawyerPlus from '../assets/figma/home/ce313.svg';
import lawyerDot from '../assets/figma/home/06410.svg';
import spark from '../assets/figma/home/a8c10.svg';

const art = {display: 'block', width: '100%', height: '100%', maxWidth: 'none'};

function Frame({style, children}) {
  return <span style={{position: 'absolute', ...style}}>{children}</span>;
}

function Art({src, style}) {
  return (
    <span style={{position: 'absolute', ...style}}>
      <img alt="" src={src} style={art} />
    </span>
  );
}

function Icon({clip, children}) {
  return (
    <span className={styles.promoIcon} style={clip ? {overflow: 'hidden'} : undefined}>
      {children}
    </span>
  );
}

function shape({borderColor = '#34f3e0', ...rest}) {
  return {
    position: 'absolute',
    boxSizing: 'border-box',
    border: `1.875px solid ${borderColor}`,
    ...rest,
  };
}

function Dot({src, left, top, size}) {
  return (
    <Frame style={{left, top, width: size, height: size}}>
      <img alt="" src={src} style={{...art, position: 'absolute', inset: 0}} />
    </Frame>
  );
}

function Spark({left, top}) {
  return (
    <Frame style={{left, top, width: 13.75, height: 13.75}}>
      <span
        style={{
          position: 'absolute',
          left: 'calc(50% - 0.5px)',
          top: 'calc(50% - 0.5px)',
          width: 9.519,
          height: 9.519,
          transform: 'translate(-50%, -50%)',
        }}>
        <Art src={spark} style={{top: '-9.85%', right: '-9.85%', bottom: '-9.85%', left: '-9.85%'}} />
      </span>
    </Frame>
  );
}

function Arm({left, transform, src}) {
  return (
    <Frame style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: 62.437, left, top: 35.37, width: 29.114}}>
      <span style={{flex: 'none', transform, width: 7.837, height: 63.592, position: 'relative'}}>
        <Art src={src} style={{top: '-1.47%', right: '-11.97%', bottom: '-0.44%', left: '-12.62%'}} />
      </span>
    </Frame>
  );
}

export function ArchitectIcon() {
  return (
    <Icon>
      <Frame style={{height: 45, left: 62.5, top: 28.75, width: 26.25}}>
        <Art src={architectRoof} style={{top: '-2.4%', right: '-3.57%', bottom: '-2.08%', left: '-3.57%'}} />
      </Frame>
      <Frame style={{height: 21.463, left: 6.25, top: 73.75, width: 89.837}}>
        <Art src={architectGround} style={{top: '-4.37%', right: '-1.04%', bottom: '-4.37%', left: '-1.04%'}} />
      </Frame>
      <Arm left={8.75} transform="rotate(-160deg) scaleY(-1)" src={architectArmA} />
      <Arm left={39.64} transform="rotate(-20deg)" src={architectArmB} />
      <span style={shape({height: 19.081, left: 34.23, top: 1.48, width: 9.54, borderRadius: 20.444, background: 'var(--promo-fill)'})} />
      <Frame style={{left: 27.41, top: 17.15, width: 23.851, height: 23.851}}>
        <Art src={architectRing} style={{top: '-3.93%', right: '-3.93%', bottom: '-3.93%', left: '-3.93%'}} />
      </Frame>
      <Frame style={{left: 34.23, top: 23.97, width: 10.222, height: 10.222}}>
        <Art src={architectHub} style={{top: '-9.17%', right: '-9.17%', bottom: '-9.17%', left: '-9.17%'}} />
      </Frame>
      <span style={shape({height: 6.133, left: 14.46, top: 61.45, width: 47.021, borderRadius: 21.125, background: '#262531', borderColor: '#ffc40a'})} />
      <span style={shape({height: 15.674, left: 35.59, top: 56.68, width: 6.815, borderRadius: 20.444, background: 'var(--promo-fill)'})} />
      <span style={shape({left: 68.75, top: 62.5, width: 3.75, height: 3.75})} />
      <span style={shape({left: 68.75, top: 52.5, width: 3.75, height: 3.75})} />
      <span style={shape({left: 68.75, top: 42.5, width: 3.75, height: 3.75})} />
      <span style={shape({left: 78.75, top: 62.5, width: 3.75, height: 3.75})} />
      <span style={shape({left: 78.75, top: 52.5, width: 3.75, height: 3.75})} />
      <span style={shape({left: 78.75, top: 42.5, width: 3.75, height: 3.75})} />
      <Spark left={55} top={13.75} />
      <Dot src={architectDot} left={52.5} top={12.5} size={3.75} />
      <Dot src={architectSparkDot} left={68.75} top={11.25} size={6.25} />
    </Icon>
  );
}

export function BrokerIcon() {
  return (
    <Icon>
      <Frame style={{top: '11.25%', right: '12.5%', bottom: '20%', left: '18.75%'}}>
        <Art src={brokerHouse} style={{top: '0.65%', right: '0.6%', bottom: '-1.36%', left: '0.6%'}} />
      </Frame>
      <Frame style={{display: 'flex', alignItems: 'center', justifyContent: 'center', left: 68.21, top: 63.21, width: 30.263, height: 30.263}}>
        <span style={{flex: 'none', transform: 'rotate(0.51deg)', width: 30, height: 30, position: 'relative', overflow: 'hidden'}}>
          <span style={{position: 'absolute', top: '8.33%', right: '8.33%', bottom: '8.33%', left: '8.34%'}}>
            <Art src={brokerKey} style={{top: '-3.75%', right: '-3.75%', bottom: '-3.75%', left: '-3.75%'}} />
          </span>
        </span>
      </Frame>
      <span style={shape({height: 20, left: 47.5, top: 60, width: 11.25, borderRadius: '1.25px 1.25px 0 0', background: 'var(--promo-fill)'})} />
      <Frame style={{left: 46.25, top: 37.5, width: 13.75, height: 13.75}}>
        <Art src={brokerWindow} style={{top: '-6.82%', right: '-6.82%', bottom: '-6.82%', left: '-6.82%'}} />
      </Frame>
      <Frame style={{height: 12.5, left: 32.5, top: 60, width: 8.75}}>
        <Art src={brokerPostA} style={{top: '-7.5%', right: '-10.71%', bottom: '-7.5%', left: '-10.71%'}} />
      </Frame>
      <Frame style={{height: 12.5, left: 65, top: 60, width: 8.75}}>
        <Art src={brokerPostB} style={{top: '-7.5%', right: '-10.71%', bottom: '-7.5%', left: '-10.71%'}} />
      </Frame>
      <Frame style={{display: 'flex', alignItems: 'center', justifyContent: 'center', left: 28.17, top: 83.7, width: 2.032, height: 9.152}}>
        <span style={{flex: 'none', transform: 'rotate(-12.52deg)', width: 0, height: 9.375, position: 'relative'}}>
          <Art src={brokerStake} style={{top: '-10%', right: -0.94, bottom: '-10%', left: -0.94}} />
        </span>
      </Frame>
      <Frame style={{display: 'flex', alignItems: 'center', justifyContent: 'center', left: 2.68, top: 62.96, width: 48.158, height: 24.615}}>
        <span
          style={{
            flex: 'none',
            transform: 'rotate(-12.52deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 5,
            borderRadius: 1.25,
            border: '1.875px solid #ffc40a',
            background: 'var(--promo-fill)',
            boxSizing: 'border-box',
          }}>
          <span className={styles.promoSale}>FOR SALE</span>
        </span>
      </Frame>
      <Frame style={{top: '11.25%', right: '12.5%', bottom: '47.5%', left: '18.75%'}}>
        <Art src={brokerRoof} style={{top: '1.09%', right: '0.6%', bottom: '1.03%', left: '0.6%'}} />
      </Frame>
      <Dot src={brokerDotA} left={7.5} top={32.5} size={6.25} />
      <Dot src={brokerDotB} left={23.75} top={16.25} size={3.75} />
      <Spark left={11.25} top={18.75} />
    </Icon>
  );
}

export function InteriorIcon() {
  return (
    <Icon>
      <Frame style={{height: 10.625, width: 5, left: 'calc(50% - 24.33px)', top: 'calc(50% - 3.33px)', transform: 'translate(-50%, -50%)'}}>
        <Art src={interiorShade} style={{top: 0, right: '-18.75%', bottom: '-8.82%', left: '-18.75%'}} />
      </Frame>
      <Frame style={{height: 6.25, width: 22.5, left: 'calc(50% - 31.83px)', top: 'calc(50% + 41.99px)', transform: 'translate(-50%, -50%)'}}>
        <Art src={interiorBase} style={{top: '-15%', right: '-4.17%', bottom: '-15%', left: '-4.17%'}} />
      </Frame>
      <Frame style={{height: 47.5, width: 0, left: 'calc(50% - 31.83px)', top: 'calc(50% + 15.11px)', transform: 'translate(-50%, -50%)'}}>
        <Art src={interiorPole} style={{top: '-1.97%', right: -0.94, bottom: '-1.97%', left: -0.94}} />
      </Frame>
      <Frame style={{height: 71.622, left: 33.65, top: 25, width: 63.953}}>
        <Art src={interiorChair} style={{top: '-1.31%', right: '-1.47%', bottom: '-1.31%', left: '-1.47%'}} />
      </Frame>
      <Frame style={{height: 26.875, width: 32.446, left: 'calc(50% - 31.86px)', top: 'calc(50% - 22.7px)', transform: 'translate(-50%, -50%)'}}>
        <Art src={interiorLamp} style={{top: '-3.49%', right: '-1.72%', bottom: '-3.49%', left: '-1.72%'}} />
      </Frame>
      <Spark left={33.13} top={7.5} />
      <Dot src={interiorDot} left={45.63} top={5} size={3.75} />
      <Dot src={interiorSparkDot} left={51.25} top={10} size={6.25} />
    </Icon>
  );
}

export function AppraisalIcon() {
  return (
    <Icon>
      <Frame style={{top: '20%', right: '25%', bottom: '7.5%', left: '8.75%'}}>
        <Art src={appraisalBoard} style={{top: '-1.29%', right: '-1.42%', bottom: '-1.29%', left: '-1.42%'}} />
      </Frame>
      <Frame style={{top: '13.75%', right: '18.75%', bottom: '1.25%', left: '2.5%'}}>
        <Art src={appraisalSheet} style={{top: '-1.1%', right: '-1.19%', bottom: '-1.1%', left: '-1.19%'}} />
      </Frame>
      <Frame style={{top: '33.75%', right: 0, bottom: '21.25%', left: '55%'}}>
        <Art src={appraisalHouse} style={{top: 0, right: '-0.12%', bottom: '-2.08%', left: '-0.12%'}} />
      </Frame>
      <span style={shape({top: '63.75%', right: '18.75%', bottom: '21.25%', left: '73.75%', borderRadius: '5px 5px 0 0'})} />
      <span style={shape({top: '59.93%', right: '71.25%', bottom: '27.57%', left: '16.25%', borderRadius: 1.351})} />
      <span style={shape({top: '40%', right: '71.25%', bottom: '47.5%', left: '16.25%', borderRadius: 1.351})} />
      <Frame style={{top: '40%', right: '70.61%', bottom: '51.79%', left: '20%'}}>
        <Art src={appraisalMark} style={{top: '-11.42%', right: '-9.99%', bottom: '-16.78%', left: '-9.99%'}} />
      </Frame>
      <Frame style={{top: '-1.01%', right: '38.99%', bottom: '76.49%', left: '20.24%'}}>
        <Art src={appraisalClip} style={{top: '-3.82%', right: '-2.3%', bottom: '-3.82%', left: '-2.3%'}} />
      </Frame>
      <Frame style={{top: '47.28%', right: '52.5%', bottom: '52.72%', left: '35%'}}>
        <Art src={appraisalLine} style={{top: -0.87, right: '-6.94%', bottom: -0.87, left: '-6.94%'}} />
      </Frame>
      <Frame style={{top: '66.03%', right: '52.5%', bottom: '33.97%', left: '35%'}}>
        <Art src={appraisalLine} style={{top: -0.87, right: '-6.94%', bottom: -0.87, left: '-6.94%'}} />
      </Frame>
      <Frame style={{top: '3.75%', right: '3.75%', bottom: '82.5%', left: '82.5%'}}>
        <span style={{position: 'absolute', left: 'calc(50% - 0.5px)', top: 'calc(50% - 0.5px)', width: 9.519, height: 0, transform: 'translate(-50%, -50%)'}}>
          <Art src={appraisalPlusH} style={{top: -0.94, right: '-9.85%', bottom: -0.94, left: '-9.85%'}} />
        </span>
        <span
          style={{
            position: 'absolute',
            left: 'calc(50% - 0.5px)',
            top: 'calc(50% - 0.5px)',
            width: 0,
            height: 9.519,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <span style={{flex: 'none', transform: 'rotate(-90deg)', width: 9.519, height: 0, position: 'relative'}}>
            <Art src={appraisalPlusV} style={{top: -0.94, right: '-9.85%', bottom: -0.94, left: '-9.85%'}} />
          </span>
        </span>
      </Frame>
      <Frame style={{top: '3.75%', right: '17.5%', bottom: '92.5%', left: '78.75%'}}>
        <img alt="" src={interiorDot} style={{...art, position: 'absolute', inset: 0}} />
      </Frame>
    </Icon>
  );
}

export function LawyerIcon() {
  return (
    <Icon clip>
      <Frame style={{height: 59.659, left: 39.77, top: 2.27, width: 58.522}}>
        <Art src={lawyerTop} style={{top: '-1.57%', right: '-0.75%', bottom: '-1.57%', left: '-0.76%'}} />
      </Frame>
      <Frame style={{height: 67.502, left: 2.27, top: 22.73, width: 83.306}}>
        <Art src={lawyerBase} style={{top: 0, right: 0, bottom: '-1.39%', left: '-1.13%'}} />
      </Frame>
      <Frame style={{left: 11.25, top: 10, width: 16.25, height: 16.25}}>
        <span
          style={{
            position: 'absolute',
            left: 'calc(50% - 0.75px)',
            top: 'calc(50% - 0.75px)',
            width: 11.25,
            height: 11.25,
            transform: 'translate(-50%, -50%)',
          }}>
          <Art src={lawyerPlus} style={{top: '-8.33%', right: '-8.33%', bottom: '-8.33%', left: '-8.33%'}} />
        </span>
      </Frame>
      <Dot src={interiorDot} left={25.63} top={6.88} size={3.75} />
      <Dot src={lawyerDot} left={8.75} top={23.75} size={3.75} />
    </Icon>
  );
}
