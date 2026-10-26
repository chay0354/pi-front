import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioButton} from './RadioButton';

export const PropertyCondition = ({condition, setCondition}) => (
  <FormContainer>
    <Title text="מצב הנכס" required />
    <RadioButton
      data={[
        {name: 'new', title: 'חדש'},
        {name: 'renovated', title: 'משופץ'},
        {name: 'old', title: 'ישן'},
      ]}
      condition={condition}
      setCondition={setCondition}
    />
  </FormContainer>
);
