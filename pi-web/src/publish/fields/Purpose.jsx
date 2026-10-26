import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioButton} from './RadioButton';

export const Purpose = ({purpose, setPurpose}) => (
  <FormContainer>
    <Title text="מטרת הפרסום" required />
    <RadioButton
      data={[
        {name: 'sale', title: 'למכירה'},
        {name: 'rent', title: 'להשכרה'},
      ]}
      condition={purpose}
      setCondition={setPurpose}
    />
  </FormContainer>
);
