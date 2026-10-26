import {mdiCheck} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import {GOLD_GRADIENT_CSS} from '../lib/goldGradient';
import {dp, toWebStyle} from '../lib/rnStyle';

// Figma-style circular checkbox used across TikTok-feed bottom filters.
const PILL_BORDER = '#4D4966';
const DOT_BG = '#27262F';
const CHECK_COLOR = '#F4AD39';
const BORDER_GOLD = '#CCA447';

const round = {display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%'};

/** `size` is in mobile dp (same prop as mobile); rendered ×1.3. */
function CheckVariant({checked, size, style}) {
  const px = dp(size);
  if (!checked) {
    return (
      <span
        aria-hidden
        style={{...round, width: px, height: px, border: `${dp(1.5)}px solid ${PILL_BORDER}`, ...toWebStyle(style)}}
      />
    );
  }
  const inner = Math.max(px - dp(4), 0);
  return (
    <span aria-hidden style={{...round, width: px, height: px, background: GOLD_GRADIENT_CSS, ...toWebStyle(style)}}>
      <span style={{...round, width: inner, height: inner, background: DOT_BG}}>
        <MdiIcon path={mdiCheck} size={Math.round(px * 0.58)} color={CHECK_COLOR} />
      </span>
    </span>
  );
}

function DotVariant({checked, size, style}) {
  const px = dp(size);
  const dot = Math.round(px * 0.4);
  return (
    <span
      aria-hidden
      style={{
        ...round,
        width: px,
        height: px,
        border: `1px solid ${checked ? BORDER_GOLD : PILL_BORDER}`,
        background: DOT_BG,
        ...toWebStyle(style),
      }}>
      {checked ? <span style={{...round, width: dot, height: dot, background: GOLD_GRADIENT_CSS}} /> : null}
    </span>
  );
}

export const FigmaCheckbox = ({checked, size, style, variant = 'check'}) => {
  if (variant === 'dot') {
    return <DotVariant checked={checked} size={size ?? 22} style={style} />;
  }
  return <CheckVariant checked={checked} size={size ?? 24} style={style} />;
};

export default FigmaCheckbox;
