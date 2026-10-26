import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

const HOSPITALITY_NATURE_DATA = [
  {name: 'landscapes', title: 'נופים'},
  {name: 'on_the_beach', title: 'על הים'},
  {name: 'with_pool', title: 'עם בריכה'},
  {name: 'nature', title: 'טבע'},
  {name: 'experiences', title: 'חוויות'},
  {name: 'special', title: 'מיוחדים'},
  {name: 'rural', title: 'כפרי'},
  {name: 'desert', title: 'מדבר'},
  {name: 'urban', title: 'עירוני'},
];

export const HospitalityNature = ({preferredApartmentType, setPreferredApartmentType}) => (
  <FormContainer>
    <Title text="אופי האירוח" required />
    <div>
      {HOSPITALITY_NATURE_DATA.map((item, index) => (
        <RadioWithText
          key={index}
          isNotLastIndex={index !== HOSPITALITY_NATURE_DATA.length - 1}
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
