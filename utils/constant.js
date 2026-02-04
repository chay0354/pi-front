export const categoryImages = {
  1: require('../assets/tik1.png'),
  2: require('../assets/tik2.png'),
  3: require('../assets/tik3.png'),
  4: require('../assets/tik4.png'),
  5: require('../assets/tik5.png'),
  6: require('../assets/tik6.png'),
  7: require('../assets/tik7.png'),
  8: require('../assets/tik8.png'),
  9: require('../assets/tik9.png'),
  10: require('../assets/tik10.png'),
  11: require('../assets/tik11.png'),
  12: require('../assets/tik12.png'),
};

export const subscriptionTypes = {
  user: 'user',
  company: 'company',
  professional: 'professional',
  broker: 'broker',
};

export const userCategories = [
  // {id: 1, name: 'חדש מקבלן', image: require('../assets/tik1.png')},
  {id: 2, name: 'משרדים', image: require('../assets/tik2.png')},
  {id: 3, name: 'שותפים', image: require('../assets/tik3.png')},
  {id: 4, name: 'גלובל', image: require('../assets/tik4.png')},
  {id: 5, categoryName: 'BNB', image: require('../assets/tik5.png')},
  {id: 6, name: 'מגזר דתי', image: require('../assets/tik6.png')},
  {id: 7, name: 'קרקעות', image: require('../assets/tik7.png')},
  {id: 8, name: 'מסחר', image: require('../assets/tik8.png')},
  // {id: 9, name: '', image: require('../assets/tik9.png')},
  {id: 10, name: 'דירות', image: require('../assets/tik10.png')},
  // {id: 11, name: '', image: require('../assets/tik11.png')},
  {id: 12, name: 'אקסלוסיב', image: require('../assets/tik12.png')},
];

export const brokerCategories = [
  {id: 1, name: 'חדש מקבלן', image: require('../assets/tik1.png')},
  {id: 2, name: 'משרדים', image: require('../assets/tik2.png')},
  // {id: 3, name: 'שותפים', image: require('../assets/tik3.png')},
  {id: 4, name: 'גלובל', image: require('../assets/tik4.png')},
  // {id: 5, categoryName: 'BNB', image: require('../assets/tik5.png')},
  {id: 6, name: 'מגזר דתי', image: require('../assets/tik6.png')},
  {id: 7, name: 'קרקעות', image: require('../assets/tik7.png')},
  {id: 8, name: 'מסחר', image: require('../assets/tik8.png')},
  // {id: 9, name: '', image: require('../assets/tik9.png')},
  {id: 10, name: 'דירות', image: require('../assets/tik10.png')},
  // {id: 11, name: '', image: require('../assets/tik11.png')},
  {id: 12, name: 'אקסלוסיב', image: require('../assets/tik12.png')},
];

export const companyCategories = [
  // {id: 1, name: 'חדש מקבלן', image: require('../assets/tik1.png')},
  {id: 2, name: 'משרדים', image: require('../assets/tik2.png')},
  // {id: 3, name: 'שותפים', image: require('../assets/tik3.png')},
  {id: 4, name: 'גלובל', image: require('../assets/tik4.png')},
  // {id: 5, categoryName: 'BNB', image: require('../assets/tik5.png')},
  {id: 6, name: 'מגזר דתי', image: require('../assets/tik6.png')},
  {id: 7, name: 'קרקעות', image: require('../assets/tik7.png')},
  {id: 8, name: 'מסחר', image: require('../assets/tik8.png')},
  // {id: 9, name: '', image: require('../assets/tik9.png')},
  {id: 10, name: 'דירות', image: require('../assets/tik10.png')},
  // {id: 11, name: '', image: require('../assets/tik11.png')},
  {id: 12, name: 'אקסלוסיב', image: require('../assets/tik12.png')},
];

export const getHeaderTitle = subscriptionType => {
  switch (subscriptionType) {
    case subscriptionTypes.company:
      return 'מנוי לחברות';
    case subscriptionTypes.professional:
      return 'מנוי לבעלי מקצוע';
    case subscriptionTypes.broker:
    default:
      return 'מנוי למתווכים';
  }
};
