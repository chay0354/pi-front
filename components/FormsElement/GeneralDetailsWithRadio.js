import React from 'react';
import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {Text} from 'react-native';
import {Divider} from './Divider';
import {CardPriceField} from './CardPriceField';

export const GeneralDetailsWithRadio = ({
  groups,
  toggleableOfferGroups = false,
  offerToggleKeyPrefix = '',
  isOfferGroupIncluded,
  onToggleOfferGroup,
}) => {
  const radioOptions = groups;
  const groupIncluded = (group) => {
    if (!toggleableOfferGroups || !isOfferGroupIncluded) {
      return group.isSelected !== false;
    }
    return isOfferGroupIncluded(group.title);
  };
  return (
    <FormContainer>
      <Title text={radioOptions.title} required={radioOptions.titleRequired} />
      {toggleableOfferGroups ? (
        <Text style={styles.toggleHint}>
          לחצו על השורה כדי להסיר או להחזיר סוג דירה מהמודעה
        </Text>
      ) : null}
      {radioOptions.groups.map((group, gi) => {
        const isNotLastIndex = gi !== radioOptions.groups.length - 1;
        const included = groupIncluded(group);
        const showFields = included && group.isSelected !== false;
        return (
          <View key={offerToggleKeyPrefix ? `${offerToggleKeyPrefix}-${gi}` : gi} style={{}}>
            {group.title && (
              <RadioWithText
                title={group.title}
                name={group.title}
                setName={
                  toggleableOfferGroups && onToggleOfferGroup
                    ? () => onToggleOfferGroup(group.title)
                    : () => {}
                }
                index={gi}
                isSelected={included}
                radioOptionStyle={{
                  paddingTop: 0,
                  paddingBottom: showFields || isNotLastIndex ? 20 : 0,
                }}
                isRequired={group.titleRequired}
                isNotLastIndex={!showFields && isNotLastIndex}
                styleDevider={{marginBottom: 15}}>
                {showFields &&
                  group.fields.map((f, idx) => {
                    const isLast = idx === group.fields.length - 1;

                    if (f.type === 'count') {
                      const key = f.key || `field-${gi}-${idx}`;
                      return (
                        <React.Fragment key={key}>
                          {f.subTitle && (
                            <Text style={styles.subFields}>
                              {f.subTitle}
                              {f.subTitleRequired && '*'}
                            </Text>
                          )}
                          <CountUpdate
                            title={f.title}
                            count={f.value}
                            setCount={typeof f.onChange === 'function' ? f.onChange : () => {}}
                            isArea={!!f.isArea}
                            isDivider={false}
                            isLast={!isNotLastIndex}
                            containerStyle={{marginBottom: 0}}
                          />
                        </React.Fragment>
                      );
                    }

                    // price field
                    if (f.type === 'price') {
                      const key = f.key || `field-${gi}-${idx}`;
                      return (
                        <React.Fragment key={key}>
                          {f.subTitle && (
                            <Text style={styles.subFields}>
                              {f.subTitle}
                              {f.subTitleRequired && '*'}
                            </Text>
                          )}
                          <CardPriceField
                            price={f.value}
                            setPrice={typeof f.onChange === 'function' ? f.onChange : () => {}}
                          />
                        </React.Fragment>
                      );
                    }

                    if (f.type === 'radiowithtext') {
                      const key = f.key || `field-${gi}-${idx}`;
                      return (
                        <View key={key} style={{marginRight: 16, marginBottom: 20}}>
                          <RadioWithText
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
                {isNotLastIndex && showFields && (
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
  toggleHint: {
    fontSize: 13,
    color: 'rgba(210,208,220,0.75)',
    textAlign: 'right',
    marginBottom: 8,
    marginRight: 4,
    fontFamily: 'Rubik-Regular',
  },
  subFields: {
    fontSize: 14,
    color: '#D2D0DC',
    marginBottom: 10,
    textAlign: 'right',
    marginRight: 16,
    fontFamily: 'Rubik-Regular',
  },
});
