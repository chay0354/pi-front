/**
 * Right-panel "מקד את החיפוש שלי" filters per category.
 * Same tables, ids, API fields and icons as the mobile sidebar (TikTokFeedScreen.js
 * *_SIDEBAR_FILTERS + sidebarFiltersForFeed). `svg` entries are color builders
 * (white, #FFC40A when selected); `icon` entries are the mobile PNGs.
 */
import {officeSidebarSvgs} from '../assets/sidebar/officeSvgIcons';
import {bnbSidebarSvgs} from '../assets/sidebar/bnbSvgIcons';
import iconNew from '../assets/sidebar/new.png';
import iconOfficeNew from '../assets/sidebar/new-2.png';
import iconPresale from '../assets/sidebar/presale.png';
import iconBuilt from '../assets/sidebar/built.png';
import iconUnderConstruction from '../assets/sidebar/under-construction.png';
import iconPosts from '../assets/sidebar/posts.png';
import iconServices from '../assets/sidebar/services.png';
import iconPartnersEnter from '../assets/sidebar/partners-enter.png';
import iconPartnersBringIn from '../assets/sidebar/partners-bring-in.png';
import iconPartnersPartner from '../assets/sidebar/partners-partner.png';
import iconPartnersPosts from '../assets/sidebar/partners-posts.png';
import iconPartnersProfessional from '../assets/sidebar/partners-professional.png';

const personal = {id: 'personal', label: 'פרטי', subscription_type: 'user', ads_only: true, svg: officeSidebarSvgs.personal};
const broker = {id: 'broker', label: 'תיווך', subscription_type: 'broker', ads_only: true, svg: officeSidebarSvgs.broker};
const renderings = {
  id: 'renderings',
  label: 'הדמיות',
  subscription_type: 'company',
  ads_only: true,
  has_video: true,
  svg: officeSidebarSvgs.renderings,
};
const news = {id: 'new', label: 'חדשות', condition: 'new', ads_only: true, icon: iconNew};
const posts = {id: 'posts', label: 'פוסטים', feed_post: true, svg: officeSidebarSvgs.posts};
const service = {
  id: 'service',
  label: 'נותני שירות',
  subscription_type: 'professional',
  feed_post: true,
  svg: officeSidebarSvgs.service,
};

/** חדש מקבלן (1). */
export const NEW_FROM_DEVELOPER_SIDEBAR_FILTERS = [
  renderings,
  {id: 'presale', label: 'פריסייל', subscription_type: 'company', ads_only: true, icon: iconPresale},
  {id: 'built', label: 'בנוי', subscription_type: 'company', ads_only: true, icon: iconBuilt},
  {
    id: 'under_construction',
    label: 'בבנייה',
    subscription_type: 'company',
    ads_only: true,
    icon: iconUnderConstruction,
  },
  {...posts, svg: undefined, icon: iconPosts},
  {...service, svg: undefined, icon: iconServices},
];

/** דירות (10). */
export const APARTMENTS_SIDEBAR_FILTERS = [personal, broker, renderings, news, posts, service];

/** Default table (and משרדים with the new-2 icon). */
export const OFFICE_SIDEBAR_FILTERS = [personal, broker, {...news, label: 'חדשים'}, renderings, posts, service];

/** קרקעות (7). */
export const LAND_SIDEBAR_FILTERS = [
  {...personal, id: 'land_personal'},
  {...broker, id: 'land_broker'},
  {id: 'land_permit', label: 'היתר', permit: 'there_is', svg: officeSidebarSvgs.permit},
  {id: 'land_plan', label: 'תב״ע', plan_approval: 'there_is', svg: officeSidebarSvgs.plan},
  {...posts, id: 'land_posts'},
  {...service, id: 'land_service'},
];

/** מסחר (8). */
export const COMMERCIAL_SIDEBAR_FILTERS = [personal, broker, renderings, news, posts, service];

/** שותפים (3). */
export const PARTNERS_SIDEBAR_FILTERS = [
  {id: 'partners_enter', label: 'מחפש להיכנס', search_purpose: 'enter', icon: iconPartnersEnter},
  {id: 'partners_bring_in', label: 'מחפש להכניס', search_purpose: 'bring_in', icon: iconPartnersBringIn},
  {id: 'partners_partner', label: 'מחפש שותף', search_purpose: 'partner', icon: iconPartnersPartner},
  {id: 'partners_posts', label: 'פוסטים', feed_post: true, icon: iconPartnersPosts},
  {
    id: 'partners_professional',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    icon: iconPartnersProfessional,
  },
];

/** BnB (5): אופי האירוח + פוסטים. */
export const BNB_SIDEBAR_FILTERS = [
  {id: 'bnb_landscapes', label: 'נופים', hospitality_nature: 'landscapes', svg: bnbSidebarSvgs.landscapes},
  {id: 'bnb_beach', label: 'על הים', hospitality_nature: 'on_the_beach', svg: bnbSidebarSvgs.beach},
  {id: 'bnb_pool', label: 'עם בריכה', hospitality_nature: 'with_pool', svg: bnbSidebarSvgs.pool},
  {id: 'bnb_nature', label: 'טבע', hospitality_nature: 'nature', svg: bnbSidebarSvgs.nature},
  {id: 'bnb_experiences', label: 'חוויות', hospitality_nature: 'experiences', svg: bnbSidebarSvgs.experiences},
  {id: 'bnb_rural', label: 'כפרי', hospitality_nature: 'rural', svg: bnbSidebarSvgs.rural},
  {id: 'bnb_desert', label: 'מדבר', hospitality_nature: 'desert', svg: bnbSidebarSvgs.desert},
  {id: 'bnb_urban', label: 'עירוני', hospitality_nature: 'urban', svg: bnbSidebarSvgs.urban},
  {id: 'bnb_posts', label: 'פוסטים', feed_post: true, svg: bnbSidebarSvgs.posts},
];

/** מגזר דתי / גלובל / יוקרה: office table with "חדשות", חדשות ⟷ הדמיות swapped. */
const NEWS_FIRST_SIDEBAR_FILTERS = [personal, broker, renderings, news, posts, service];

const OFFICE_CATEGORY_SIDEBAR_FILTERS = OFFICE_SIDEBAR_FILTERS.map(f =>
  f.id === 'new' ? {...f, icon: iconOfficeNew} : f,
);

const BY_CATEGORY = {
  1: NEW_FROM_DEVELOPER_SIDEBAR_FILTERS,
  2: OFFICE_CATEGORY_SIDEBAR_FILTERS,
  3: PARTNERS_SIDEBAR_FILTERS,
  4: NEWS_FIRST_SIDEBAR_FILTERS,
  5: BNB_SIDEBAR_FILTERS,
  6: NEWS_FIRST_SIDEBAR_FILTERS,
  7: LAND_SIDEBAR_FILTERS,
  8: COMMERCIAL_SIDEBAR_FILTERS,
  10: APARTMENTS_SIDEBAR_FILTERS,
  12: NEWS_FIRST_SIDEBAR_FILTERS,
};

export function sidebarFiltersForCategory(category) {
  return BY_CATEGORY[Number(category)] ?? OFFICE_SIDEBAR_FILTERS;
}

export const isNewsSidebarFilterDef = filter => filter?.id === 'new' && filter?.ads_only === true;

export const isRenderingsSidebarFilterDef = filter =>
  filter?.id === 'renderings' &&
  String(filter?.subscription_type || '').toLowerCase() === 'company' &&
  filter?.ads_only === true;
