import React from 'react';
import {StyleSheet, View, I18nManager} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {Text} from 'react-native';
import {Divider} from './Divider';
import {CardPriceField} from './CardPriceField';
import {Colors} from '../../constants/styles';
import {flexEnd} from '../../index';

export const GeneralDetailsWithRadio = ({
  groups,
  toggleableOfferGroups = false,
  offerToggleKeyPrefix = '',
  isOfferGroupIncluded,
  onToggleOfferGroup,
  accordionGroups = false,
  isOfferGroupExpanded,
  onToggleOfferExpand,
  /** Company office (category 2): section title + tap "הוסף משרד" / "הוסף קומה שלמה" */
  onAddRepeatableRow,
  /** Company office listing form — flat פרטים כלליים card per Figma */
  companyOfficeGeneralDetailsFigma = false,
}) => {
  const sideMargin16 = {marginLeft: 16};
  const optionSpacing = {marginRight: 20};
  const radioOptions = groups;
  const useFigmaStyleForSection =
    radioOptions?.title === 'פרטים כלליים' ||
    radioOptions?.title === 'הפרויקט מציע' ||
    radioOptions?.title === 'הפרוייקט מציע משרדים בגדלים של' ||
    radioOptions?.title === 'הפרוייקט מציע קומה שלמה';
  const groupIncluded = group => {
    if (!toggleableOfferGroups || !isOfferGroupIncluded) {
      return group.isSelected !== false;
    }
    return isOfferGroupIncluded(group.title);
  };
  const groupExpanded = group => {
    if (!accordionGroups || !isOfferGroupExpanded) {
      return true;
    }
    return isOfferGroupExpanded(group.title);
  };

  if (
    companyOfficeGeneralDetailsFigma &&
    radioOptions?.title === 'פרטים כלליים'
  ) {
    const rows = radioOptions.groups || [];
    return (
      <FormContainer style={styles.companyOfficeFigmaCard}>
        <Text
          style={[
            styles.companyOfficeSectionHeading,
            {textAlign: 'left', alignSelf: flexEnd},
          ]}>
          {radioOptions.title}
        </Text>
        {rows.map((group, gi) => {
          const countField = group.fields?.find(x => x.type === 'count');
          const toggleField = group.fields?.find(
            x => x.type === 'boolean_toggle',
          );
          const keyBase = offerToggleKeyPrefix
            ? `${offerToggleKeyPrefix}-${gi}`
            : String(gi);

          if (countField) {
            const hasFollowingRow = gi < rows.length - 1;
            return (
              <View key={`co-${keyBase}-count`}>
                <View style={styles.companyOfficeBlock}>
                  <CountUpdate
                    variant="figmaOffice"
                    title={group.title}
                    required={!!group.titleRequired}
                    count={countField.value}
                    setCount={
                      typeof countField.onChange === 'function'
                        ? countField.onChange
                        : () => {}
                    }
                    isArea={!!countField.isArea}
                    isDivider={false}
                    isLast
                    min={0}
                  />
                </View>
                {hasFollowingRow ? (
                  <Divider style={styles.companyOfficeSectionDivider} />
                ) : null}
              </View>
            );
          }

          if (toggleField) {
            const selected = Number(toggleField.value) > 0;
            return (
              <View
                key={`co-${keyBase}-toggle`}
                style={styles.companyOfficeToggleWrap}>
                <RadioWithText
                  title={group.title}
                  name={group.title}
                  setName={() => toggleField.onChange(!selected)}
                  index={gi}
                  isSelected={selected}
                  useFigmaStyleIcon
                  isRequired={false}
                  isNotLastIndex={false}
                  radioOptionStyle={styles.companyOfficeToggleRow}
                  styleDevider={{}}
                />
              </View>
            );
          }

          return null;
        })}
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <Title text={radioOptions.title} required={radioOptions.titleRequired} />
      {toggleableOfferGroups && !accordionGroups ? (
        <Text style={[styles.toggleHint, {textAlign: 'left'}]}>
          לחצו על השורה כדי להסיר או להחזיר סוג דירה מהמודעה
        </Text>
      ) : null}
      {radioOptions.groups.map((group, gi) => {
        const isAddRepeatRow = group.isAddRepeatRow === true;
        const isNotLastIndex = gi !== radioOptions.groups.length - 1;
        const included = groupIncluded(group);
        const expanded = groupExpanded(group);
        const showFields =
          !isAddRepeatRow && included && group.isSelected !== false && expanded;
        const rowPress =
          isAddRepeatRow && typeof onAddRepeatableRow === 'function'
            ? () => onAddRepeatableRow(radioOptions.title)
            : accordionGroups && onToggleOfferExpand
              ? () => onToggleOfferExpand(group.title)
              : toggleableOfferGroups && onToggleOfferGroup
                ? () => onToggleOfferGroup(group.title)
                : () => {};
        const rowLongPress =
          isAddRepeatRow ||
          !toggleableOfferGroups ||
          !accordionGroups ||
          !onToggleOfferGroup
            ? undefined
            : () => onToggleOfferGroup(group.title);
        const iconSelected = isAddRepeatRow
          ? false
          : toggleableOfferGroups &&
              accordionGroups &&
              radioOptions.title === 'הפרויקט מציע'
            ? included && expanded
            : toggleableOfferGroups && !accordionGroups
              ? included
              : toggleableOfferGroups && accordionGroups
                ? included
                : accordionGroups
                  ? expanded
                  : included;
        return (
          <View
            key={offerToggleKeyPrefix ? `${offerToggleKeyPrefix}-${gi}` : gi}
            style={{}}>
            {group.title && (
              <RadioWithText
                title={group.title}
                name={group.title}
                setName={rowPress}
                onLongPress={rowLongPress}
                index={gi}
                isSelected={iconSelected}
                useFigmaStyleIcon={useFigmaStyleForSection}
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
                            <Text
                              style={[styles.subFields, {textAlign: 'left'}]}>
                              {f.subTitle}
                              {f.subTitleRequired && '*'}
                            </Text>
                          )}
                          <CountUpdate
                            title={f.title}
                            count={f.value}
                            setCount={
                              typeof f.onChange === 'function'
                                ? f.onChange
                                : () => {}
                            }
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
                            <Text
                              style={[styles.subFields, {textAlign: 'left'}]}>
                              {f.subTitle}
                              {f.subTitleRequired && '*'}
                            </Text>
                          )}
                          <CardPriceField
                            price={f.value}
                            setPrice={
                              typeof f.onChange === 'function'
                                ? f.onChange
                                : () => {}
                            }
                          />
                        </React.Fragment>
                      );
                    }

                    if (f.type === 'radiowithtext') {
                      const key = f.key || `field-${gi}-${idx}`;
                      return (
                        <View
                          key={key}
                          style={[sideMargin16, {marginBottom: 20}]}>
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
                            containerStyle={optionSpacing}
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
  companyOfficeFigmaCard: {
    padding: 24,
  },
  companyOfficeSectionHeading: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  companyOfficeBlock: {
    paddingVertical: 10,
  },
  companyOfficeSectionDivider: {
    marginVertical: 0,
    backgroundColor: '#1E1D27',
  },
  companyOfficeToggleWrap: {
    paddingVertical: 10,
  },
  companyOfficeToggleRow: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  toggleHint: {
    fontSize: 13,
    color: 'rgba(210,208,220,0.75)',
    marginBottom: 8,
    fontFamily: 'Rubik-Regular',
  },
  subFields: {
    fontSize: 14,
    color: '#D2D0DC',
    marginBottom: 10,
    fontFamily: 'Rubik-Regular',
  },
});
