import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {Text} from 'react-native';
import {Divider} from './Divider';
import {CardPriceField} from './CardPriceField';

export const GeneralDetailsWithRadio = ({groups}) => {
  const radioOptions = groups;
  return (
    <FormContainer>
      <Title text={radioOptions.title} required={radioOptions.titleRequired} />
      {radioOptions.groups.map((group, gi) => {
        const isNotLastIndex = gi !== radioOptions.groups.length - 1;
        return (
          <View key={gi} style={{}}>
            {group.title && (
              <RadioWithText
                title={group.title}
                name={group.title}
                setName={() => {}}
                index={gi}
                isSelected={group.isSelected}
                radioOptionStyle={{
                  paddingTop: 0,
                  paddingBottom: group.isSelected || isNotLastIndex ? 20 : 0,
                }}
                isRequired={group.titleRequired}
                isNotLastIndex={!group.isSelected && isNotLastIndex}
                styleDevider={{marginBottom: 15}}>
                {group.isSelected &&
                  group.fields.map((f, idx) => {
                    const isLast = idx === group.fields.length - 1;

                    if (f.type === 'count') {
                      return (
                        <>
                          {f.subTitle && (
                            <Text style={styles.subFields}>
                              {f.subTitle}
                              {f.subTitleRequired && '*'}
                            </Text>
                          )}
                          <CountUpdate
                            key={f.key || `${gi}-${idx}`}
                            title={f.title}
                            count={f.value}
                            setCount={f.onChange}
                            isArea={!!f.isArea}
                            isDivider={false}
                            isLast={!isNotLastIndex}
                            containerStyle={{marginBottom: 0}}
                          />
                        </>
                      );
                    }

                    // price field
                    if (f.type === 'price') {
                      return (
                        <>
                          {f.subTitle && (
                            <Text style={styles.subFields}>
                              {f.subTitle}
                              {f.subTitleRequired && '*'}
                            </Text>
                          )}
                          <CardPriceField
                            price={f.value}
                            setPrice={f.onChange}
                          />
                        </>
                      );
                    }

                    if (f.type === 'radiowithtext') {
                      return (
                        <View style={{marginRight: 16, marginBottom: 20}}>
                          <RadioWithText
                            key={0}
                            isNotLastIndex={false}
                            title={f.title}
                            name={f.name}
                            // setName={() => updateLand(idx, {unit: f.name})}
                            index={0}
                            isSelected={true}
                            radioOptionStyle={{
                              paddingTop: 0,
                            }}
                            containerStyle={{marginLeft: 20}}
                          />
                        </View>
                      );
                    }

                    return null;
                  })}
                {isNotLastIndex && group.isSelected && (
                  <Divider style={{marginBottom: 20}} />
                )}
              </RadioWithText>
            )}
          </View>
        );
      })}
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  subFields: {
    fontSize: 14,
    color: '#D2D0DC',
    marginBottom: 10,
    textAlign: 'right',
    marginRight: 16,
    fontFamily: 'Rubik-Regular',
  },
});
