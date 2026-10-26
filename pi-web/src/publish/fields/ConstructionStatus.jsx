import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const ConstructionStatus = ({constructionStatus, setConstructionStatus, data = [], title}) => (
  <FormContainer>
    <Title text={title || 'מצב בניה'} required textStyle={{marginBottom: 0}} />
    <div>
      {data.map((item, index) => (
        <RadioWithText
          key={index}
          isNotLastIndex={index !== data.length - 1}
          title={item.title}
          name={item.name}
          setName={setConstructionStatus}
          index={index}
          isSelected={item.name === constructionStatus}
        />
      ))}
    </div>
  </FormContainer>
);
