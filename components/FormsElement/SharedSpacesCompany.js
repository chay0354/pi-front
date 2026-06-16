import {FormContainer} from './FormContainer';
import {RadioWithText} from './RadioWithText';

export const SharedSpacesCompany = ({
  isSelected = false,
  onToggle = () => {},
}) => {
  return (
    <FormContainer>
      <RadioWithText
        key={0}
        isNotLastIndex={false}
        title={'אנחנו חברה של חללים משותפים'}
        name={'shared-spaces-company'}
        setName={() => onToggle(!isSelected)}
        index={0}
        isSelected={isSelected}
        radioOptionStyle={{paddingTop: 0}}
      />
    </FormContainer>
  );
};
