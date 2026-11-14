import {tw} from '../../figma/tw';
import guestIcon from '../../assets/figma/piai/avatar/b046b.svg';
import v from '../../assets/figma/piai/avatar/33b20.svg';
import v1 from '../../assets/figma/piai/avatar/96cab.svg';
import v2 from '../../assets/figma/piai/avatar/7346e.svg';
import v25 from '../../assets/figma/piai/avatar/213c2.svg';
import v3 from '../../assets/figma/piai/avatar/aa1ac.svg';
import v26 from '../../assets/figma/piai/avatar/3091e.svg';
import v4 from '../../assets/figma/piai/avatar/a55c3.svg';
import maskA from '../../assets/figma/piai/avatar/312ef.svg';
import maskB from '../../assets/figma/piai/avatar/ba74b.svg';
import v28 from '../../assets/figma/piai/avatar/0c6f7.svg';
import v29 from '../../assets/figma/piai/avatar/83fe0.svg';
import v30 from '../../assets/figma/piai/avatar/e8d98.svg';
import g443 from '../../assets/figma/piai/avatar/3215c.svg';
import v127 from '../../assets/figma/piai/avatar/9b8b6.svg';
import v134 from '../../assets/figma/piai/avatar/8a3f9.svg';
import v129 from '../../assets/figma/piai/avatar/83a74.svg';
import v133 from '../../assets/figma/piai/avatar/f1876.svg';
import ell15 from '../../assets/figma/piai/avatar/302a7.svg';
import ell16 from '../../assets/figma/piai/avatar/42dad.svg';
import v5 from '../../assets/figma/piai/avatar/ce446.svg';
import group from '../../assets/figma/piai/avatar/0880f.svg';
import v6 from '../../assets/figma/piai/avatar/0bd56.svg';
import maskC from '../../assets/figma/piai/avatar/1b5ed.svg';
import v32 from '../../assets/figma/piai/avatar/9dce1.svg';
import v33 from '../../assets/figma/piai/avatar/ce255.svg';
import v34 from '../../assets/figma/piai/avatar/e2db2.svg';
import v35 from '../../assets/figma/piai/avatar/9cc5d.svg';
import v7 from '../../assets/figma/piai/avatar/5616f.svg';
import maskD from '../../assets/figma/piai/avatar/28e96.svg';
import v130 from '../../assets/figma/piai/avatar/4182d.svg';
import g441 from '../../assets/figma/piai/avatar/715e5.svg';
import g444 from '../../assets/figma/piai/avatar/663ea.svg';
import maskE from '../../assets/figma/piai/avatar/520c4.svg';

const FILL = 'absolute block inset-0 max-w-none size-full';

function Box({cls, children, mask}) {
  const style = {...tw(cls)};
  if (mask) style.maskImage = `url("${mask}")`;
  return <div style={style}>{children}</div>;
}

function Glyph({src, cls = FILL}) {
  return <img alt="" src={src} style={tw(cls)} />;
}

function Turned({frame, spin, w, h, src, mask, position, outset}) {
  const sized = tw(`h-[${h}] relative w-[${w}]`);
  let inner;
  if (mask) {
    inner = (
      <div style={{...sized, ...tw(position || ''), maskImage: `url("${mask}")`}}>
        <div style={tw(outset)}>
          <Glyph src={src} />
        </div>
      </div>
    );
  } else if (outset) {
    inner = (
      <div style={sized}>
        <div style={tw(outset)}>
          <Glyph src={src} />
        </div>
      </div>
    );
  } else {
    inner = (
      <div style={sized}>
        <Glyph src={src} />
      </div>
    );
  }
  return (
    <Box cls={`-translate-x-1/2 -translate-y-1/2 absolute flex items-center justify-center ${frame}`}>
      <div style={tw(`flex-none ${spin}`)}>{inner}</div>
    </Box>
  );
}

/** Guest silhouette, 34px circle (Figma profile type "משתמש לא רשום"). */
export function GuestAvatar() {
  return (
    <span style={tw('relative block shrink-0 size-[34px]')} aria-hidden>
      <span style={tw('absolute bg-[#262532] inset-0 rounded-[1000px]')} />
      <img alt="" src={guestIcon} width={16} height={17.5} style={{position: 'absolute', left: 9, top: 7.25}} />
    </span>
  );
}

/** Pi mark inside the same 34px circle (Figma profile type4). */
export function PiAvatar() {
  return (
    <span style={tw('relative block shrink-0 size-[34px]')} aria-hidden>
      <span style={tw('absolute bg-[#262532] inset-0 rounded-[1000px]')} />
      <span style={tw('absolute -translate-x-1/2 -translate-y-1/2 h-[18px] left-[calc(50%+0.1px)] overflow-clip top-[calc(50%-0.97px)] w-[28px]')}>
        <Turned frame="h-[6.009px] left-[calc(50%+8.02px)] top-[calc(50%+0.35px)] w-[5.805px]" spin="rotate-[-13.25deg]" w="4.775px" h="5.049px" src={v} />
        <Turned frame="h-[3.885px] left-[calc(50%+8.44px)] top-[calc(50%+1.33px)] w-[4.954px]" spin="rotate-[-13.25deg]" w="4.393px" h="2.957px" src={v1} />
        <Turned frame="h-[3.572px] left-[calc(50%+11.2px)] top-[calc(50%+0.49px)] w-[3.839px]" spin="rotate-[-13.25deg]" w="3.26px" h="2.902px" src={v2} />
        <Turned frame="h-[1.203px] left-[calc(50%+11.1px)] mix-blend-multiply top-[calc(50%+1.12px)] w-[0.94px]" spin="rotate-[11.33deg]" w="0.742px" h="1.078px" src={v25} outset="absolute inset-[-24.67%_-35.82%]" />
        <Turned frame="h-[0.799px] left-[calc(50%+11.39px)] top-[calc(50%+1.4px)] w-[0.97px]" spin="rotate-[-13.25deg]" w="0.851px" h="0.62px" src={v3} />
        <Turned frame="h-[0.599px] left-[calc(50%+11.24px)] mix-blend-multiply top-[calc(50%+1.26px)] w-[0.623px]" spin="rotate-[11.33deg]" w="0.534px" h="0.503px" src={v26} outset="absolute inset-[-25.36%_-23.89%]" />
        <Turned frame="h-[0.871px] left-[calc(50%+11.22px)] top-[calc(50%+1px)] w-[1.105px]" spin="rotate-[-13.25deg]" w="0.979px" h="0.664px" src={v4} />
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute flex h-[1.221px] items-center justify-center left-[calc(50%+11.22px)] top-[calc(50%+1px)] w-[1.343px]">
          <div style={tw('flex-none rotate-[11.33deg]')}>
            <div style={tw('h-[1.011px] relative w-[1.167px]')}>
              <Glyph src={maskA} />
            </div>
          </div>
        </Box>
        <Turned
          frame="h-[0.92px] left-[calc(50%+10.57px)] mix-blend-multiply top-[calc(50%+0.47px)] w-[0.315px]"
          spin="rotate-[11.33deg]"
          w="0.139px"
          h="0.91px"
          src={v28}
          mask={maskB}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.781px_-0.883px] mask-size-[2.976px_2.948px]"
          outset="absolute inset-[-7.24%_-47.3%_-7.24%_-45.38%]"
        />
        <Turned
          frame="h-[1.138px] left-[calc(50%+10.04px)] top-[calc(50%-0.59px)] w-[0.988px]"
          spin="rotate-[-37.44deg]"
          w="0.354px"
          h="1.162px"
          src={v29}
          mask={maskB}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0.083px_0.285px] mask-size-[2.976px_2.948px]"
          outset="absolute inset-[-15.57%_-51.03%_-15.57%_-49.11%]"
        />
        <Turned
          frame="h-[0.918px] left-[calc(50%+11.82px)] top-[calc(50%-0.49px)] w-[1.601px]"
          spin="rotate-[-92.35deg]"
          w="0.855px"
          h="1.568px"
          src={v30}
          mask={maskB}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-1.392px_0.077px] mask-size-[2.976px_2.948px]"
          outset="absolute inset-[-11.54%_-21.17%]"
        />
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute h-[5.129px] left-[calc(50%+2.23px)] top-[calc(50%+3.43px)] w-[4.923px]">
          <Glyph src={g443} />
        </Box>
        <Turned frame="h-[13.159px] left-[calc(50%+8.44px)] top-[calc(50%+2.16px)] w-[8.07px]" spin="rotate-[0.9deg]" w="7.867px" h="13.037px" src={v127} />
        <Turned frame="h-[13.159px] left-[calc(50%+8.44px)] top-[calc(50%+2.16px)] w-[8.07px]" spin="rotate-[0.9deg]" w="7.867px" h="13.037px" src={v134} />
        <Turned frame="h-[14.655px] left-[calc(50%-8.27px)] top-[calc(50%+1.67px)] w-[11.395px]" spin="rotate-[0.9deg]" w="11.168px" h="14.481px" src={v129} />
        <Turned frame="h-[14.655px] left-[calc(50%-8.27px)] top-[calc(50%+1.67px)] w-[11.395px]" spin="rotate-[0.9deg]" w="11.168px" h="14.481px" src={v133} />
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-7.49px)] mix-blend-multiply size-[2.139px] top-[calc(50%+3.62px)]" mask={ell15}>
          <div style={tw('absolute inset-[-49.99%_-50%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-5.409px_-8.034px] mask-size-[11.382px_14.305px]')}>
            <Glyph src={ell16} />
          </div>
        </Box>
        <Turned frame="h-[1.385px] left-[calc(50%-8.49px)] top-[calc(50%+2.93px)] w-[0.833px]" spin="-scale-y-100 rotate-[175.65deg]" w="0.734px" h="1.333px" src={v5} />
        <Turned frame="h-[6.624px] left-[calc(50%-7.01px)] top-[calc(50%+0.12px)] w-[4.555px]" spin="-scale-y-100 rotate-180" w="4.555px" h="6.624px" src={group} />
        <Turned frame="h-[2.507px] left-[calc(50%-7.7px)] top-[calc(50%+3.14px)] w-[2.823px]" spin="-scale-y-100 rotate-[175.65deg]" w="2.656px" h="2.312px" src={v6} />
        <Turned
          frame="h-[2.246px] left-[calc(50%-6.79px)] top-[calc(50%+2.58px)] w-[1.344px]"
          spin="rotate-[-4.51deg]"
          w="1.177px"
          h="2.16px"
          src={v32}
          mask={maskC}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-1.565px_0.491px] mask-size-[2.667px_2.309px]"
          outset="absolute inset-[-10.83%_-19.88%]"
        />
        <Turned
          frame="h-[1.248px] left-[calc(50%-8.78px)] top-[calc(50%+3.64px)] w-[0.872px]"
          spin="rotate-[166.09deg]"
          w="0.617px"
          h="1.133px"
          src={v33}
          mask={maskC}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0.184px_-1.068px] mask-size-[2.667px_2.309px]"
          outset="absolute inset-[-10.8%_-19.81%]"
        />
        <Turned
          frame="h-[1.269px] left-[calc(50%-7.65px)] top-[calc(50%+4.08px)] w-[1.193px]"
          spin="rotate-[140.97deg]"
          w="0.617px"
          h="1.133px"
          src={v34}
          mask={maskC}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.784px_-1.498px] mask-size-[2.667px_2.309px]"
          outset="absolute inset-[-18.31%_-33.6%]"
        />
        <Turned
          frame="h-[0.83px] left-[calc(50%-8.03px)] top-[calc(50%+3.41px)] w-[0.932px]"
          spin="rotate-[-56.12deg]"
          w="0.448px"
          h="0.821px"
          src={v35}
          mask={maskC}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.536px_-1.04px] mask-size-[2.667px_2.309px]"
          outset="absolute inset-[-18.31%_-33.6%]"
        />
        <Turned
          frame="h-[0.83px] left-[calc(50%-8.76px)] top-[calc(50%+2.97px)] w-[0.932px]"
          spin="rotate-[-56.12deg]"
          w="0.448px"
          h="0.821px"
          src={v35}
          mask={maskC}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0.203px_-0.602px] mask-size-[2.667px_2.309px]"
          outset="absolute inset-[-18.31%_-33.6%]"
        />
        <Turned
          frame="h-[2.234px] left-[calc(50%-8.28px)] mix-blend-multiply top-[calc(50%+3.11px)] w-[1.648px]"
          spin="-scale-y-100 rotate-[175.65deg]"
          w="1.491px"
          h="2.127px"
          src={v7}
          mask={maskC}
          position="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0.079px_-0.044px] mask-size-[2.667px_2.309px]"
          outset="absolute inset-[-2.58%_-3.68%]"
        />
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute flex h-[1.385px] items-center justify-center left-[calc(50%-8.49px)] top-[calc(50%+2.93px)] w-[0.833px]">
          <div style={tw('flex-none rotate-[-4.35deg]')}>
            <div style={tw('h-[1.333px] relative w-[0.734px]')}>
              <Glyph src={maskD} />
            </div>
          </div>
        </Box>
        <Turned frame="h-[6.952px] left-[calc(50%+1.03px)] top-[calc(50%-5.52px)] w-[20.131px]" spin="rotate-[0.9deg]" w="20.029px" h="6.639px" src={v130} />
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute h-[4.937px] left-[calc(50%+1.14px)] top-[calc(50%-1.78px)] w-[3.124px]">
          <div style={tw('absolute inset-[0_-2.47%_-10.34%_0]')}>
            <Glyph src={g441} />
          </div>
        </Box>
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute h-[4.753px] left-[calc(50%+4.16px)] top-[calc(50%-1.76px)] w-[2.585px]">
          <div style={tw('absolute inset-[0_0_-10.74%_-6.34%]')}>
            <Glyph src={g444} />
          </div>
        </Box>
        <Box cls="-translate-x-1/2 -translate-y-1/2 absolute h-[6.624px] left-[calc(50%-7.01px)] top-[calc(50%+0.12px)] w-[4.555px]">
          <Glyph src={maskE} />
        </Box>
      </span>
    </span>
  );
}
