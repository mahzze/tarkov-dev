import { Link } from 'react-router-dom';

import MenuItem from '../menu/MenuItem';
import LoadingSmall from '../loading-small';
import { useBossDetails } from '../../features/bosses/queries';

import './index.css';


// BossPageList component for the main boss page
export function BossPageList() {
    // Fetch bosses
    const bosses = useBossDetails();

    // If no maps have been returned yet, return 'loading'
    if (!bosses || bosses.length === 0) {
        return <LoadingSmall />;
    }

    // Return the home page boss React component
    return (
        <>
            {bosses.filter(boss => boss.maps.length > 0).map((boss) => {

                // Format the boss name for links
                var key = boss.normalizedName;

                return (
                    <Link to={`/boss/${key}`} className="screen-link" key={`boss-${key}`}>
                        <h2 className="center-title">{boss.name}</h2>
                        <img
                            alt={boss.name}
                            loading='lazy'
                            src={`${process.env.PUBLIC_URL}/images/bosses/${key}-portrait.png`}
                        />
                    </Link>
                )
            })}
        </>
    );
}

// BossListNav component for homepage nav bar
export function BossListNav(onClick) {
    // Fetch bosses
    const bosses = useBossDetails();

    // If no maps have been returned yet, return 'loading'
    if (!bosses || bosses.length === 0) {
        return null;
    }

    // Return the home page nav boss React component
    return (
        <>
            <ul>
                {bosses.map((boss) => {
                    // Format the boss name for links
                    var key = boss.normalizedName;

                    return (
                        <MenuItem
                            displayText={boss.name}
                            key={key}
                            to={`/boss/${key}`}
                            onClick={onClick.onClick}
                        />
                    )
                })}
            </ul>
        </>
    );
}

// BossList component for homepage
function BossList() {
    // Fetch bosses
    const bosses = useBossDetails();

    // If no maps have been returned yet, return 'loading'
    if (!bosses || bosses.length === 0) {
        return <LoadingSmall />;
    }

    // Return the home page boss React component
    return (
        <>
            {bosses.filter(boss => boss.maps.length > 0).map((boss) => {

                // Format the boss name for links
                var key = boss.normalizedName;

                return (
                    <li key={`boss-link-${key}`}>
                        <Link to={`/boss/${key}`} key={`boss-${key}`}>
                            <img
                                alt={boss.name}
                                loading='lazy'
                                className="boss-icon"
                                src={`${process.env.PUBLIC_URL}/images/bosses/${key}-icon.jpg`}
                            />
                            {boss.name}
                        </Link>
                    </li>
                )
            })}
        </>
    );
}

export default BossList;
