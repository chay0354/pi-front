/* Illustration layers from the home screen Figma (file g4OfSRrqz4VHqO2wc9B9bE, node 244:33110). */
import {tw} from '../../figma/tw';
import imgGroup1000003457 from '../../assets/figma/home/49e79.svg';
import imgGroup1000003461 from '../../assets/figma/home/6eacb.svg';
import imgGroup1000003443 from '../../assets/figma/home/e35d2.svg';
import imgVector129 from '../../assets/figma/home/8322c.svg';
import imgVector133 from '../../assets/figma/home/46f44.svg';
import imgEllipse15 from '../../assets/figma/home/4a7d9.svg';
import imgEllipse16 from '../../assets/figma/home/094c9.svg';
import imgVector from '../../assets/figma/home/df90e.svg';
import imgGroup from '../../assets/figma/home/929ff.svg';
import imgVector1 from '../../assets/figma/home/e17be.svg';
import imgVector29 from '../../assets/figma/home/5944c.svg';
import imgVector30 from '../../assets/figma/home/759f3.svg';
import imgVector31 from '../../assets/figma/home/fb7e0.svg';
import imgVector32 from '../../assets/figma/home/71e4c.svg';
import imgVector33 from '../../assets/figma/home/ba296.svg';
import imgVector2 from '../../assets/figma/home/aa776.svg';
import imgMaskGroup from '../../assets/figma/home/2540f.svg';
import imgGroup1000003441 from '../../assets/figma/home/911b4.svg';
import imgGroup1000003444 from '../../assets/figma/home/4ab49.svg';
import imgMaskGroup1 from '../../assets/figma/home/a0a1d.svg';
import imgVector130 from '../../assets/figma/home/2c1ae.svg';
import imgGroup1000003459 from '../../assets/figma/home/9db39.svg';
import imgGroup1000003458 from '../../assets/figma/home/e69dc.svg';
import imgChatUnion from '../../assets/figma/home/5750e.svg';
import imgChatPlane from '../../assets/figma/home/e3008.svg';
import imgChatPi from '../../assets/figma/home/1b35b.svg';
import imgChatDot from '../../assets/figma/home/15662.svg';
import imgMortgageGlass from '../../assets/figma/home/f4405.svg';
import imgMortgageCoins from '../../assets/figma/home/de275.svg';
import imgMortgageHouse from '../../assets/figma/home/df42c.svg';
import imgMortgageDollar from '../../assets/figma/home/2536d.svg';
import imgMortgageSpark from '../../assets/figma/home/a8c10.svg';
import imgMortgageDotA from '../../assets/figma/home/dc770.svg';
import imgMortgageDotB from '../../assets/figma/home/44e57.svg';

const FILL = 'absolute block inset-0 max-w-none size-full';
const BLOCK = 'block max-w-none size-full';
const SIZE = {containerType: 'size'};
const masked = (src, cls) => ({...tw(cls), maskImage: `url("${src}")`});

function Fill({src, cls = FILL}) {
  return <img alt="" style={tw(cls)} src={src} />;
}

/** Turned shape: an outer box sized in container units, rotated/skewed inside a container-size frame. */
function Turned({frame, inner, src, wrap}) {
  return (
    <div style={{...tw(`absolute flex ${frame} items-center justify-center`), ...SIZE}}>
      <div style={tw(`flex-none ${inner}`)}>
        {wrap ? wrap : (
          <div style={tw('relative size-full')}>
            <Fill src={src} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Masked brush stroke inside the mascot's hand (Figma "Mask group" 1803:26128). */
function MaskedStroke({frame, inner, position, outset, src, blend = ''}) {
  return (
    <Turned
      frame={`${frame} ${blend}`}
      inner={inner}
      wrap={
        <div
          style={masked(
            imgVector29,
            `mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[${position}] mask-size-[18.257px_15.899px] relative size-full`,
          )}>
          <div style={tw(`absolute inset-[${outset}]`)}>
            <img alt="" style={tw(BLOCK)} src={src} />
          </div>
        </div>
      }
    />
  );
}

/** Pi mascot holding a magnifier (Figma "Component 9", 120×82). */
export function PiAiMascot() {
  return (
    <div style={tw('h-[82px] relative shrink-0 w-[120px]')} aria-hidden>
      <div style={tw('absolute inset-[48.9%_14.26%_26.59%_67.51%]')}>
        <Fill src={imgGroup1000003457} />
      </div>
      <div style={tw('absolute inset-[25.44%_0_1.46%_69.48%]')}>
        <Fill src={imgGroup1000003461} />
      </div>
      <div style={tw('absolute inset-[54.82%_29.44%_16.68%_51.94%]')}>
        <Fill src={imgGroup1000003443} />
      </div>
      <Turned
        frame="inset-[18.58%_56.91%_0_0]"
        inner="h-[hypot(-1.9959cqw,98.8031cqh)] rotate-[0.91deg] skew-x-[0.01deg] w-[hypot(98.0041cqw,1.19689cqh)]"
        src={imgVector129}
      />
      <Turned
        frame="inset-[18.58%_56.91%_0_0]"
        inner="h-[hypot(-1.9959cqw,98.8031cqh)] rotate-[0.91deg] skew-x-[0.01deg] w-[hypot(98.0041cqw,1.19689cqh)]"
        src={imgVector133}
      />
      <div style={tw('absolute contents inset-[18.58%_56.91%_0_0]')}>
        <div
          style={masked(
            imgEllipse15,
            'absolute inset-[64.19%_71.46%_23.93%_20.46%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-37.026px_-55.344px] mask-size-[77.904px_98.544px] mix-blend-multiply',
          )}>
          <div style={tw('absolute inset-[-50.31%_-50.51%]')}>
            <img alt="" style={tw(BLOCK)} src={imgEllipse16} />
          </div>
        </div>
      </div>
      <div style={tw('absolute contents inset-[32.27%_65.08%_25.62%_17.69%]')}>
        <Turned
          frame="inset-[62.43%_77.73%_29.87%_19.12%]"
          inner="-scale-x-100 h-[hypot(12.1475cqw,95.9759cqh)] rotate-[-4.38deg] skew-x-[0.06deg] w-[hypot(-87.8525cqw,4.02414cqh)]"
          src={imgVector}
        />
        <Turned frame="inset-[32.27%_65.08%_30.93%_17.69%]" inner="-scale-x-100 h-[100cqh] w-[100cqw]" src={imgGroup} />
        <Turned
          frame="inset-[60.46%_70.95%_25.62%_18.37%]"
          inner="-scale-x-100 h-[hypot(6.21575cqw,91.9562cqh)] rotate-[-4.38deg] skew-x-[0.06deg] w-[hypot(-93.7842cqw,8.04376cqh)]"
          src={imgVector1}
        />
        <div style={{...tw('absolute contents inset-[60.45%_70.95%_25.62%_18.37%]'), ...SIZE}}>
          <MaskedStroke
            frame="inset-[58.11%_70.32%_29.41%_24.6%]"
            inner="h-[hypot(12.566cqw,95.8559cqh)] rotate-[-4.56deg] skew-x-[-0.1deg] w-[hypot(87.434cqw,-4.14406cqh)]"
            position="-10.712px_3.387px"
            outset="-10.91%_-20.07%"
            src={imgVector30}
          />
          <MaskedStroke
            frame="inset-[66.77%_78.72%_26.29%_17.98%]"
            inner="h-[hypot(-31.1996cqw,-88.0828cqh)] rotate-[165.99deg] skew-x-[-0.21deg] w-[hypot(-68.8004cqw,11.9172cqh)]"
            position="1.262px_-7.355px"
            outset="-10.87%_-20.01%"
            src={imgVector31}
          />
          <MaskedStroke
            frame="inset-[69.16%_73.85%_23.79%_21.64%]"
            inner="h-[hypot(-59.7703cqw,-69.3336cqh)] rotate-[140.79deg] skew-x-[-0.37deg] w-[hypot(-40.2297cqw,30.6664cqh)]"
            position="-5.365px_-10.313px"
            outset="-18.46%_-33.89%"
            src={imgVector32}
          />
          <MaskedStroke
            frame="inset-[66.62%_75.77%_28.77%_20.7%]"
            inner="h-[hypot(73.1869cqw,55.1671cqh)] rotate-[-56.29deg] skew-x-[-0.33deg] w-[hypot(26.8131cqw,-44.8329cqh)]"
            position="-3.669px_-7.162px"
            outset="-18.48%_-33.85%"
            src={imgVector33}
          />
          <MaskedStroke
            frame="inset-[64.19%_78.57%_31.2%_17.91%]"
            inner="h-[hypot(73.1869cqw,55.1671cqh)] rotate-[-56.29deg] skew-x-[-0.33deg] w-[hypot(26.8131cqw,-44.8329cqh)]"
            position="1.389px_-4.147px"
            outset="-18.48%_-33.85%"
            src={imgVector33}
          />
          <MaskedStroke
            frame="inset-[61.08%_75.39%_26.5%_18.38%]"
            blend="mix-blend-multiply"
            inner="-scale-x-100 h-[hypot(9.74211cqw,94.9018cqh)] rotate-[-4.41deg] skew-x-[0.1deg] w-[hypot(-90.2579cqw,5.09818cqh)]"
            position="0.541px_-0.3px"
            outset="-2.6%_-3.72%"
            src={imgVector2}
          />
        </div>
        <Turned
          frame="inset-[62.43%_77.72%_29.87%_19.12%]"
          inner="h-[hypot(12.1305cqw,95.9697cqh)] rotate-[-4.38deg] skew-x-[-0.06deg] w-[hypot(87.8695cqw,-4.03027cqh)]"
          src={imgMaskGroup}
        />
      </div>
      <div style={tw('absolute inset-[26.37%_36.96%_46.2%_51.23%]')}>
        <div style={tw('absolute inset-[0_-2.57%_-10.42%_0]')}>
          <img alt="" style={tw(BLOCK)} src={imgGroup1000003441} />
        </div>
      </div>
      <div style={tw('absolute inset-[27.01%_26.56%_46.59%_63.67%]')}>
        <div style={tw('absolute inset-[0_0_-10.82%_-6.52%]')}>
          <img alt="" style={tw(BLOCK)} src={imgGroup1000003444} />
        </div>
      </div>
      <div style={tw('absolute inset-[32.27%_65.08%_30.93%_17.69%]')}>
        <Fill src={imgMaskGroup1} />
      </div>
      <Turned
        frame="inset-[0_5.4%_61.37%_18.47%]"
        inner="h-[hypot(-0.517897cqw,95.4755cqh)] rotate-[0.91deg] skew-x-[0.01deg] w-[hypot(99.4821cqw,4.52452cqh)]"
        src={imgVector130}
      />
      <div style={tw('absolute h-[27.444px] left-[83.31px] top-[23.77px] w-[23.809px]')}>
        <Fill src={imgGroup1000003459} />
      </div>
      <div style={tw('absolute inset-[45.09%_9.66%_35.67%_77.73%]')}>
        <Fill src={imgGroup1000003458} />
      </div>
    </div>
  );
}

/** "PiChat" mark from the chat pi button (Figma 950:24921), 97 wide. */
export function PiChatMark({unread = false}) {
  return (
    <div style={tw('flex flex-col items-start relative shrink-0 w-[97px]')} aria-hidden>
      <div style={tw('h-[43.352px] relative shrink-0 w-full')}>
        <Fill src={imgChatUnion} />
      </div>
      <div style={tw('absolute inset-[10.53%_25.88%_63.64%_54.12%]')}>
        <Fill src={imgChatPlane} />
      </div>
      <div style={tw('absolute h-[22.824px] left-[13.11%] right-[52.21%] top-[8.76px]')}>
        <Fill src={imgChatPi} />
      </div>
      <p
        style={{
          ...tw(
            "absolute font-['Rubik:Medium'] h-[10.271px] leading-[normal] left-[45.46px] text-[14.84px] text-[color:#1e1d27] top-[20.05px] w-[34.235px]",
          ),
          textBoxEdge: 'cap alphabetic',
          textBoxTrim: 'trim-both',
        }}
        dir="auto">
        Chat
      </p>
      {unread && (
        <div style={tw('absolute right-0 size-[13.694px] top-0')}>
          <Fill src={imgChatDot} />
        </div>
      )}
    </div>
  );
}

/** Mortgage-advisors icon (Figma "categories" 682:9685), 100×100. */
export function MortgageIcon() {
  return (
    <div style={tw('relative shrink-0 size-[100px]')} aria-hidden>
      <div style={tw('-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+6.18px)] size-[82.5px] top-[calc(50%-7.57px)]')}>
        <div style={tw('absolute inset-[-1.14%]')}>
          <img alt="" style={tw(BLOCK)} src={imgMortgageGlass} />
        </div>
      </div>
      <div style={tw('absolute inset-[61.25%_60.94%_4.69%_5%]')}>
        <div style={tw('absolute inset-[-2.75%]')}>
          <img alt="" style={tw(BLOCK)} src={imgMortgageCoins} />
        </div>
      </div>
      <div style={tw('-translate-x-1/2 -translate-y-1/2 absolute h-[30.261px] left-[calc(50%-3.91px)] top-[calc(50%-18.62px)] w-[29.672px]')}>
        <div style={tw('absolute inset-[-3.1%_-3.16%]')}>
          <img alt="" style={tw(BLOCK)} src={imgMortgageHouse} />
        </div>
      </div>
      <div style={tw('absolute h-[30px] left-[43.41px] top-[69.38px] w-[16.5px]')}>
        <div style={tw('absolute inset-[5%_5.3%]')}>
          <div style={tw('absolute inset-[-3.47%_-6.36%]')}>
            <img alt="" style={tw(BLOCK)} src={imgMortgageDollar} />
          </div>
        </div>
      </div>
      <div style={tw('absolute left-[82.5px] size-[13.75px] top-[43.75px]')}>
        <div style={tw('-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[9.519px] top-1/2')}>
          <div style={tw('absolute inset-[-9.85%]')}>
            <img alt="" style={tw(BLOCK)} src={imgMortgageSpark} />
          </div>
        </div>
      </div>
      <div style={tw('absolute left-[83.75px] size-[3.75px] top-[37.5px]')}>
        <Fill src={imgMortgageDotA} />
      </div>
      <div style={tw('absolute left-[93.13px] size-[5px] top-[59.38px]')}>
        <Fill src={imgMortgageDotB} />
      </div>
    </div>
  );
}
