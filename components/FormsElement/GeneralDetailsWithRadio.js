import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {Divider} from './Divider';
import {CardPriceField} from './CardPriceField';
import {Colors} from '../../constants/styles';
import {RadioIcon} from './RadioIcon';

const isRowTappable = (onGroupToggle) => typeof onGroupToggle === 'function';

export const GeneralDetailsWithRadio = ({ groups, onGroupToggle }) => {
  const radioOptions = groups;
  return (
    <FormContainer>
      <Title text={radioOptions.title} required={radioOptions.titleRequired} />
      {radioOptions.groups.map((group, gi) => {
        const isNotLastIndex = gi !== radioOptions.groups.length - 1;
        const rowTappable = isRowTappable(onGroupToggle);
        return (
          <View key={gi} style={{}}>
            {group.title && (
              <>
                {rowTappable ? (
                <RadioWithText
                  title={group.title}
                  name={group.title}
                  setName={() => onGroupToggle(gi)}
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
                            setName={() => {}}
                            index={0}
                            isSelected={true}
                            radioOptionStyle={{ paddingTop: 0 }}
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
            ) : (
              <View style={styles.staticRowWrapper}>
                <View style={[styles.radioOption, { paddingTop: 0, paddingBottom: 20 }]} pointerEvents="box-none">
                  <Text style={styles.radioOptionText}>
                    {group.title}
                    {group.titleRequired && <Text style={styles.requiredStar}>*</Text>}
                  </Text>
                  <View style={styles.radioSpacer} />
                  <RadioIcon isSelected={true} />
                </View>
                {group.fields.map((f, idx) => {
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
                          setName={() => {}}
                          index={0}
                          isSelected={true}
                          radioOptionStyle={{ paddingTop: 0 }}
                          containerStyle={{marginLeft: 20}}
                        />
                      </View>
                    );
                  }
                  return null;
                })}
                {isNotLastIndex && <Divider style={{marginBottom: 15}} />}
              </View>
                )}
              </>
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
  staticRowWrapper: {
    marginBottom: 0,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  radioSpacer: {
    width: 8,
  },
  requiredStar: {
    color: Colors.yellowIcons,
  },
});
