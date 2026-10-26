import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const PropertyType = ({propertyType, setPropertyType, propertyTypes = [], title}) => (
  <FormContainer>
    <Title text={title || 'סוג הנכס'} required textStyle={{marginBottom: 0}} />
    <div>
      {propertyTypes.map((item, index) => (
        <RadioWithText
          key={index}
          isNotLastIndex={index !== propertyTypes.length - 1}
          title={item.title}
          name={item.name}
          setName={setPropertyType}
          index={index}
          isSelected={item.name === propertyType}
        />
      ))}
    </div>
  </FormContainer>
);
