import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import {BNB_SERVICE_ICONS} from '../lib/bnbServiceIcons';

export const ServiceAndFacility = ({facilities = {}, toggleFacility, data = [], title}) => (
  <FormContainer>
    <Title text={title || 'סוג הנכס'} required textStyle={{marginBottom: 0}} />
    <div>
      {data.map((item, index) => (
        <RadioWithText
          key={item.name}
          isNotLastIndex={index !== data.length - 1}
          title={item.title}
          name={item.name}
          setName={toggleFacility}
          index={index}
          isSelected={Boolean(facilities?.[item.name])}
          useFigmaStyleIcon
          leftIcon={BNB_SERVICE_ICONS[item.name]}
          styleDevider={{marginTop: 20}}
        />
      ))}
    </div>
  </FormContainer>
);
