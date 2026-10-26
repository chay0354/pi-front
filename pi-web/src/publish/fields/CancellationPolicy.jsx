import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const CancellationPolicy = ({cancellationPolicy, setCancellationPolicy, data = [], title}) => (
  <FormContainer>
    <Title text={title || 'מדיניות ביטולים'} textStyle={{marginBottom: 0}} />
    <div>
      {data.map((item, index) => (
        <RadioWithText
          key={index}
          isNotLastIndex={index !== data.length - 1}
          title={item.title}
          name={item.name}
          setName={setCancellationPolicy}
          index={index}
          isSelected={item.name === cancellationPolicy}
        />
      ))}
    </div>
  </FormContainer>
);
