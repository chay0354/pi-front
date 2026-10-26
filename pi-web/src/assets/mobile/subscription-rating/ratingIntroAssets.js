/** Figma pop-up rating assets (nodes 11:23751 / 10:11499). RN SvgXml needs inline XML. */

export const RATING_INTRO_GIFT_XML = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6 11V12H34V11V10H6V11ZM36 13H35V17H36H37V13H36ZM34 19V18H6V19V20H34V19ZM4 17H5V13H4H3V17H4ZM6 19V18C5.44772 18 5 17.5523 5 17H4H3C3 18.6569 4.34315 20 6 20V19ZM36 17H35C35 17.5523 34.5523 18 34 18V19V20C35.6569 20 37 18.6569 37 17H36ZM34 11V12C34.5523 12 35 12.4477 35 13H36H37C37 11.3431 35.6569 10 34 10V11ZM6 11V10C4.34315 10 3 11.3431 3 13H4H5C5 12.4477 5.44772 12 6 12V11Z" fill="#FFC40A"/>
<path d="M7 19H33V35C33 36.1046 32.1046 37 31 37H9C7.89543 37 7 36.1046 7 35V19Z" stroke="#FFC40A" stroke-width="2"/>
<path d="M9 7C9 4.79086 10.7909 3 13 3H14.5C17.5376 3 20 5.46243 20 8.5V11H13C10.7909 11 9 9.20914 9 7Z" stroke="url(#ratingIntroGift0)" stroke-width="2"/>
<path d="M31 7C31 4.79086 29.2091 3 27 3H25.5C22.4624 3 20 5.46243 20 8.5V11H27C29.2091 11 31 9.20914 31 7Z" stroke="url(#ratingIntroGift1)" stroke-width="2"/>
<path d="M20 11V37" stroke="url(#ratingIntroGift2)" stroke-width="2" stroke-linecap="round"/>
<defs>
<linearGradient id="ratingIntroGift0" x1="9.36667" y1="2.33864" x2="20.4931" y2="6.1503" gradientUnits="userSpaceOnUse">
<stop stop-color="#34F3E0"/>
<stop offset="1" stop-color="#04CFE1"/>
</linearGradient>
<linearGradient id="ratingIntroGift1" x1="30.6333" y1="2.33864" x2="19.5069" y2="6.1503" gradientUnits="userSpaceOnUse">
<stop stop-color="#34F3E0"/>
<stop offset="1" stop-color="#04CFE1"/>
</linearGradient>
<linearGradient id="ratingIntroGift2" x1="20.0333" y1="8.85058" x2="21.1634" y2="8.86141" gradientUnits="userSpaceOnUse">
<stop stop-color="#34F3E0"/>
<stop offset="1" stop-color="#04CFE1"/>
</linearGradient>
</defs>
</svg>`;

const STAR_PATH =
  'M13.5449 0.760714C14.2554 -0.25357 15.7446 -0.253572 16.4551 0.760712L20.4041 7.29935C20.6303 7.62228 20.9553 7.86099 21.3291 7.97861L28.7463 10.0321C29.9203 10.4015 30.3805 11.8329 29.6456 12.8292L24.669 18.367C24.435 18.6842 24.3109 19.0704 24.3157 19.4661L25.2912 28.1747C25.3063 29.4173 24.1015 30.3019 22.9369 29.9034L15.5717 27.6881C15.2009 27.5612 14.7991 27.5612 14.4283 27.6881L7.06314 29.9034C5.89846 30.3019 4.69366 29.4173 4.7088 28.1747L5.68432 19.4661C5.68914 19.0704 5.56497 18.6842 5.33097 18.367L0.354447 12.8292C-0.380505 11.8329 0.079687 10.4015 1.25372 10.0321L8.67086 7.97861C9.04466 7.86099 9.36975 7.62228 9.59594 7.29935L13.5449 0.760714Z';

function numberedStarXml(id, from, to) {
  return `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="${STAR_PATH}" fill="url(#${id})"/>
<defs>
<linearGradient id="${id}" x1="6.10131" y1="4.5535" x2="23.7527" y2="31.9799" gradientUnits="userSpaceOnUse">
<stop stop-color="${from}"/>
<stop offset="1" stop-color="${to}"/>
</linearGradient>
</defs>
</svg>`;
}

export const RATING_INTRO_NUMBERED_STARS = [
  numberedStarXml('ratingIntroStar1', '#FFF3EF', 'white'),
  numberedStarXml('ratingIntroStar2', '#FFF9F5', '#FFD7A5'),
  numberedStarXml('ratingIntroStar3', '#FFEFD0', '#FFDD6C'),
  numberedStarXml('ratingIntroStar4', '#FFF6B4', '#FFD82A'),
  numberedStarXml('ratingIntroStar5', '#FFEFB3', '#FFBA09'),
];
