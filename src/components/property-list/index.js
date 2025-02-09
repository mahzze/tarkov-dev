import { useMemo } from 'react';
import propertyFormatter from '../../modules/property-format';
import { useTranslation } from 'react-i18next';
import Tippy from '@tippyjs/react';

import './index.css';

const skipProps = ['grid', 'ConflictingItems', '__typename', 'slots'];

const ConditionalWrapper = ({ condition, wrapper, children }) => {
    return condition ? wrapper(children) : children;
};

function PropertyList({ properties }) {
    const { t } = useTranslation();

    const data = useMemo(
        () =>
            Object.entries(properties ?? {})
                .filter(([property, value]) => {
                    return !skipProps.includes(property);
                })
                .map(([property, value]) => {
                    return propertyFormatter(property, value);
                })
                .filter(([property, value]) => value.value !== undefined)
                .filter(([property, value]) => value.value?.length !== 0)
                .sort((a, b) => a[0].localeCompare(b[0])),

        [properties],
    );

    return (
        <div className="property-list">
            {data.map(([property, value]) => {
                return (
                    <div className="property-wrapper" key={property}>
                        <div>
                            {value.value}
                            <div className="property-key-wrapper">
                                <ConditionalWrapper
                                    condition={value.tooltip}
                                    wrapper={(children) => 
                                        <Tippy
                                            content={value.tooltip}
                                            placement="bottom"
                                        >
                                            <div>{children}</div>
                                        </Tippy>
                                    }
                                >
                                    {value.label ? value.label : t(property)}
                                </ConditionalWrapper>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default PropertyList;
