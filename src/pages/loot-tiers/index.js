import { useState, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import Icon from '@mdi/react';
import {mdiFinance} from '@mdi/js';

import useStateWithLocalStorage from '../../hooks/useStateWithLocalStorage';

import SEO from '../../components/SEO';
import ItemGrid from '../../components/item-grid';
import {
    Filter,
    ToggleFilter,
    SelectFilter,
    InputFilter,
} from '../../components/filter';

import QueueBrowserTask from '../../modules/queue-browser-task';
import capitalizeFirst from '../../modules/capitalize-first';

import { useItemsQuery } from '../../features/items/queries';

import './index.css';

const defaultGroupNames = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

const DEFAULT_MAX_ITEMS = 244;

const arrayChunk = (inputArray, chunkLength) => {
    return inputArray.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / chunkLength);

        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
        }

        resultArray[chunkIndex].push(item);

        return resultArray;
    }, []);
};

function LootTier(props) {
    const [numberFilter, setNumberFilter] = useState(DEFAULT_MAX_ITEMS);
    const [minPrice, setMinPrice] = useStateWithLocalStorage('minPrice', 0);
    const hasFlea = useSelector((state) => state.settings.hasFlea);
    const [includeMarked, setIncludeMarked] = useStateWithLocalStorage(
        'includeMarked',
        false,
    );
    const [groupByType, setGroupByType] = useStateWithLocalStorage(
        'groupByType',
        false,
    );
    const { t } = useTranslation();
    const filterOptions = [
        {
            value: 'barter',
            label: t('Barters'),
            default: true,
        },
        {
            value: 'keys',
            label: t('Keys'),
            default: true,
        },
        // {
        //     value: 'marked',
        //     label: t('Marked'),
        //     default: false,
        // },
        {
            value: 'mods',
            label: t('Mods'),
            default: true,
        },
        {
            value: 'provisions',
            label: t('Provisions'),
            default: true,
        },
        {
            value: 'wearable',
            label: t('Wearables'),
            default: true,
        },
        {
            value: 'gun',
            label: t('Guns'),
            default: true,
        },
    ];
    const [filters, setFilters] = useStateWithLocalStorage('filters', {
        name: '',
        types: filterOptions
            .map((filter) => {
                if (filter.default) {
                    return filter.value;
                }

                return false;
            })
            .filter(Boolean),
    });

    const { data: items } = useItemsQuery();

    const handleFilterChange = (selectedFilters) => {
        QueueBrowserTask.task(() => {
            setFilters({
                ...filters,
                types:
                    selectedFilters?.map((selectedValue) => {
                        return selectedValue.value;
                    }) ||
                    filterOptions
                        .map((filter) => {
                            if (filter.default) {
                                return filter.value;
                            }

                            return false;
                        })
                        .filter(Boolean),
            });
        });
    };

    const itemData = useMemo(() => {
        return items
            .map((item) => {
                if (item.types.includes('gun')) {
                    // Overrides guns' dimensions using their default height and width.
                    // Fixes a bug where PPS was calculated using just a weapon receiver.
                    item.height = item.properties.defaultHeight;
                    item.width = item.properties.defaultWidth;
                    item.slots = item.height * item.width;

                    item.types = item.types.filter((type) => type !== 'wearable');
                }

                let sellTo = item.traderName;
                let sellToNormalized = item.traderNormalizedName;
                let priceRUB = item.traderTotalPriceRUB;

                if (hasFlea && !item.types.includes('noFlea')) {
                    const fleaPrice = item.avg24hPrice - item.fee;
                    if (fleaPrice >= item.traderTotalPriceRUB) {
                        sellTo = 'Flea Market';
                        sellToNormalized = 'flea-market';
                        priceRUB = fleaPrice;
                    }
                }

                return {
                    ...item,
                    sellTo: sellTo,
                    sellToNormalized: sellToNormalized,
                    pricePerSlot: Math.floor(priceRUB / item.slots)
                }
            })
            .filter((item) => {
                if (item.types.includes('unLootable')) {
                    return false;
                }

                return true;
            });
    }, [hasFlea, items]);

    const typeFilteredItems = useMemo(() => {
        const innerTypeFilteredItems = itemData.filter((item) => {
            if (!includeMarked && item.types.includes('markedOnly')) {
                return false;
            }

            const intersection = item.types.filter((type) =>
                filters.types?.includes(type),
            );

            // No categories matching
            if (intersection.length === 0) {
                return false;
            }

            if (minPrice && item.pricePerSlot < minPrice) {
                return false;
            }

            return true;
        });

        return innerTypeFilteredItems;
    }, [filters.types, includeMarked, itemData, minPrice]);

    const filteredItems = useMemo(() => {
        const items = typeFilteredItems.filter((item) => {
            if (
                filters.name.length > 0 &&
                item.name.toLowerCase().indexOf(filters.name) === -1 &&
                item.shortName?.toLowerCase().indexOf(filters.name) === -1
            ) {
                return false;
            }

            return true;
        });

        items.sort((itemA, itemB) => {
            if (itemA.pricePerSlot > itemB.pricePerSlot) {
                return -1;
            }

            if (itemA.pricePerSlot < itemB.pricePerSlot) {
                return 1;
            }

            return 0;
        });

        return items;
    }, [filters.name, typeFilteredItems]);

    const minPriceHandler = debounce((event) => {
        console.log('debouncer called');
        const newValue = Number(event.target.value);
        setMinPrice(newValue);

        if (newValue > 0) {
            setNumberFilter(99999);
        } else {
            setNumberFilter(DEFAULT_MAX_ITEMS);
        }
    }, 400);

    const selectedItems = useMemo(() => {
        return filteredItems.slice(
            0,
            Math.min(filteredItems.length, numberFilter),
        );
    }, [filteredItems, numberFilter]);

    const { groupNames, itemChunks } = useMemo(() => {
        let innerGroupNames;
        let innerItemChunks;

        if (groupByType) {
            const activeFiltersSet = new Set();

            for (const item of selectedItems) {
                for (const activeFilter of filters.types) {
                    if (!item.types.includes(activeFilter)) {
                        continue;
                    }

                    activeFiltersSet.add(activeFilter);
                }
            }
            innerGroupNames = Array.from(activeFiltersSet);

            const chunkMap = {};

            for (const item of selectedItems) {
                for (const activeFilter of filters.types) {
                    if (!item.types.includes(activeFilter)) {
                        continue;
                    }

                    if (!chunkMap[activeFilter]) {
                        chunkMap[activeFilter] = [];
                    }

                    chunkMap[activeFilter].push(item);
                }
            }

            innerItemChunks = Object.values(chunkMap);
        } else {
            innerGroupNames = defaultGroupNames;

            innerItemChunks = arrayChunk(
                selectedItems,
                Math.ceil(selectedItems.length / innerGroupNames.length),
            );
        }

        for (let i = 0; i < innerItemChunks.length; i = i + 1) {
            innerItemChunks[i] = innerItemChunks[i]?.sort((itemA, itemB) => {
                if (itemA.height > itemB.height) {
                    return -1;
                }

                if (itemA.height === itemB.height) {
                    if (itemA.slots > itemB.slots) {
                        return -1;
                    }
                    else if (itemA.slots === itemB.slots) {
                        return 0;
                    }
                    else if (itemA.slots < itemB.slots) {
                        return 1;
                    }
                }
                
                if (itemA.height < itemB.height) {
                    return 1;
                }

                return 0;
            });
        }

        return {
            groupNames: innerGroupNames,
            itemChunks: innerItemChunks,
        };
    }, [filters.types, groupByType, selectedItems]);

    const handleFilterNameChange = useCallback(
        (e) => {
            if (typeof window !== 'undefined') {
                const name = e.target.value.toLowerCase();

                // schedule this for the next loop so that the UI
                // has time to update but we do the filtering as soon as possible
                QueueBrowserTask.task(() => {
                    setFilters({
                        ...filters,
                        name,
                    });
                });
            }
        },
        [filters, setFilters],
    );

    return [
        <SEO 
            title={`${t('Loot tiers')} - ${t('Escape from Tarkov')} - ${t('Tarkov.dev')}`}
            description={t('loot-tiers-page-description', 'Learn about the different types of loot available in the game, their value, rarity, and what to keep and what to trash.')}
            key="seo-wrapper"
        />,
        <div
            className="display-wrapper loot-tiers-main-wrapper"
            key={'display-wrapper'}
        >
            <div className='loot-tiers-wrapper'>
                <h1 className='loot-tiers-text'>
                    {t('Escape from Tarkov')}
                    <Icon path={mdiFinance} size={1.5} className="icon-with-text" /> 
                    {t('Loot tiers')}
                </h1>
                <p className='loot-tiers-text'>{t('Ranking the most valuable items in the game')}</p>
            </div>
            <Filter fullWidth>
                <ToggleFilter
                    label={t('Include Marked')}
                    onChange={(e) => setIncludeMarked(!includeMarked)}
                    checked={includeMarked}
                />
                <ToggleFilter
                    label={t('Group by type')}
                    onChange={(e) => setGroupByType(!groupByType)}
                    checked={groupByType}
                />
                <SelectFilter
                    defaultValue={filters.types?.map((filter) => {
                        return filterOptions.find(
                            (defaultFilter) => defaultFilter.value === filter,
                        );
                    })}
                    isMulti
                    options={filterOptions}
                    onChange={handleFilterChange}
                />
                <InputFilter
                    defaultValue={minPrice || ''}
                    placeholder={t('min value')}
                    type={'number'}
                    onChange={minPriceHandler}
                />
                <InputFilter
                    defaultValue={filters.name || ''}
                    placeholder={t('filter on item')}
                    type={'text'}
                    onChange={handleFilterNameChange}
                />
            </Filter>
            {itemChunks.map((items, index) => (
                <ItemGrid
                    key={`barter-group-${groupNames[index]}`}
                    name={t(capitalizeFirst(groupNames[index]))}
                    items={items}
                />
            ))}
        </div>,
    ];
}

export default LootTier;
