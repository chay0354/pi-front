import {Fragment} from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {Divider} from './Divider';
import {CardPriceField} from './CardPriceField';
import {isListingOffersSectionTitle} from '../lib/publishRules';
import styles from './fields.module.css';

const companyOfficeFigmaCard = {padding: 24};
const companyOfficeSectionDivider = {marginVertical: 0, backgroundColor: '#1E1D27'};
const companyOfficeToggleRow = {paddingTop: 0, paddingBottom: 0};
const optionSpacing = {marginRight: 20};
const noop = () => {};

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
  const radioOptions = groups;
  const useFigmaStyleForSection =
    radioOptions?.title === 'פרטים כלליים' ||
    isListingOffersSectionTitle(radioOptions?.title) ||
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

  if (companyOfficeGeneralDetailsFigma && radioOptions?.title === 'פרטים כלליים') {
    const rows = radioOptions.groups || [];
    return (
      <FormContainer style={companyOfficeFigmaCard}>
        <span className={styles.coSectionHeading}>{radioOptions.title}</span>
        {rows.map((group, gi) => {
          const countField = group.fields?.find(x => x.type === 'count');
          const toggleField = group.fields?.find(x => x.type === 'boolean_toggle');
          const keyBase = offerToggleKeyPrefix ? `${offerToggleKeyPrefix}-${gi}` : String(gi);

          if (countField) {
            const hasFollowingRow = gi < rows.length - 1;
            return (
              <div key={`co-${keyBase}-count`}>
                <div className={styles.coBlock}>
                  <CountUpdate
                    variant="figmaOffice"
                    title={group.title}
                    required={!!group.titleRequired}
                    count={countField.value}
                    setCount={typeof countField.onChange === 'function' ? countField.onChange : noop}
                    isArea={!!countField.isArea}
                    isDivider={false}
                    isLast
                    min={0}
                  />
                </div>
                {hasFollowingRow ? <Divider style={companyOfficeSectionDivider} /> : null}
              </div>
            );
          }

          if (toggleField) {
            const selected = Number(toggleField.value) > 0;
            return (
              <div key={`co-${keyBase}-toggle`} className={styles.coBlock}>
                <RadioWithText
                  title={group.title}
                  name={group.title}
                  setName={() => toggleField.onChange(!selected)}
                  index={gi}
                  isSelected={selected}
                  useFigmaStyleIcon
                  isRequired={false}
                  isNotLastIndex={false}
                  radioOptionStyle={companyOfficeToggleRow}
                  styleDevider={{}}
                />
              </div>
            );
          }

          return null;
        })}
      </FormContainer>
    );
  }

  const groupList = radioOptions?.groups || [];

  return (
    <FormContainer>
      <Title text={radioOptions?.title} required={radioOptions?.titleRequired} />
      {toggleableOfferGroups && !accordionGroups ? (
        <p className={styles.gdrToggleHint}>לחצו על השורה כדי להסיר או להחזיר סוג דירה מהמודעה</p>
      ) : null}
      {groupList.map((group, gi) => {
        const isAddRepeatRow = group.isAddRepeatRow === true;
        const isNotLastIndex = gi !== groupList.length - 1;
        const included = groupIncluded(group);
        const expanded = groupExpanded(group);
        const showFields = !isAddRepeatRow && included && group.isSelected !== false && expanded;
        const rowPress =
          isAddRepeatRow && typeof onAddRepeatableRow === 'function'
            ? () => onAddRepeatableRow(radioOptions.title)
            : accordionGroups && onToggleOfferExpand
              ? () => onToggleOfferExpand(group.title)
              : toggleableOfferGroups && onToggleOfferGroup
                ? () => onToggleOfferGroup(group.title)
                : noop;
        const rowLongPress =
          isAddRepeatRow || !toggleableOfferGroups || !accordionGroups || !onToggleOfferGroup
            ? undefined
            : () => onToggleOfferGroup(group.title);
        const iconSelected = isAddRepeatRow
          ? false
          : toggleableOfferGroups && accordionGroups && isListingOffersSectionTitle(radioOptions?.title)
            ? included && expanded
            : toggleableOfferGroups && !accordionGroups
              ? included
              : toggleableOfferGroups && accordionGroups
                ? included
                : accordionGroups
                  ? expanded
                  : included;
        return (
          <div key={offerToggleKeyPrefix ? `${offerToggleKeyPrefix}-${gi}` : gi}>
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
                  (group.fields || []).map((f, idx) => {
                    const key = f.key || `field-${gi}-${idx}`;

                    if (f.type === 'count') {
                      return (
                        <Fragment key={key}>
                          {f.subTitle && (
                            <span className={styles.gdrSubFields}>
                              {f.subTitle}
                              {f.subTitleRequired ? '*' : ''}
                            </span>
                          )}
                          <CountUpdate
                            title={f.title}
                            count={f.value}
                            setCount={typeof f.onChange === 'function' ? f.onChange : noop}
                            isArea={!!f.isArea}
                            isDivider={false}
                            isLast={!isNotLastIndex}
                            variant="figmaOffice"
                            containerStyle={{marginBottom: 0}}
                          />
                        </Fragment>
                      );
                    }

                    if (f.type === 'price') {
                      return (
                        <Fragment key={key}>
                          {f.subTitle && (
                            <span className={styles.gdrSubFields}>
                              {f.subTitle}
                              {f.subTitleRequired ? '*' : ''}
                            </span>
                          )}
                          <CardPriceField price={f.value} setPrice={typeof f.onChange === 'function' ? f.onChange : noop} />
                        </Fragment>
                      );
                    }

                    if (f.type === 'radiowithtext') {
                      return (
                        <div key={key} className={styles.gdrRadioField}>
                          <RadioWithText
                            isNotLastIndex={false}
                            title={f.title}
                            name={f.name}
                            index={0}
                            isSelected
                            radioOptionStyle={{paddingTop: 0}}
                            containerStyle={optionSpacing}
                          />
                        </div>
                      );
                    }

                    return null;
                  })}
                {isNotLastIndex && showFields && <Divider style={{marginBottom: 20}} />}
              </RadioWithText>
            )}
          </div>
        );
      })}
    </FormContainer>
  );
};
