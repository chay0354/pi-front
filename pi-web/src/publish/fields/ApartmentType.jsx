import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

const APARTMENT_TYPES = [
  {name: 'regular', title: 'דירה רגילה'},
  {name: 'studio', title: 'דירת סטודיו'},
  {name: 'garden', title: 'דירת גן'},
  {name: 'duplex', title: 'דופלקס'},
  {name: 'penthouse', title: 'נטהאוז'},
  {name: 'private', title: 'בית פרטי'},
];

export const ApartmentType = ({preferredApartmentType, setPreferredApartmentType}) => (
  <FormContainer>
    <Title text="סוג דירת השותפים המועדף" required />
    <div>
      {APARTMENT_TYPES.map((item, index) => (
        <RadioWithText
          key={index}
          isNotLastIndex={index !== APARTMENT_TYPES.length - 1}
          title={item.title}
          name={item.name}
          setName={setPreferredApartmentType}
          index={index}
          isSelected={preferredApartmentType === item.name}
        />
      ))}
    </div>
  </FormContainer>
);
