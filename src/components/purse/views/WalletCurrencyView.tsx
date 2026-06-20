import { FC } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Flex, Text } from '../../../common';
import hotelIcon from '../../../assets/images/toolbar/icons/hotel-token.png';
import solanaIcon from '../../../assets/images/toolbar/icons/solana.svg';

interface WalletCurrencyViewProps
{
    kind: 'sol' | 'hotel';
    amount: number | null;
}

// Purse slots repurposed for the player's on-chain wallet balances: SOL (was Ducks) and $HOTEL (was
// Diamonds). Icons are sized to match the credits icon (.nitro-currency-icon = 15x15).
export const WalletCurrencyView: FC<WalletCurrencyViewProps> = props =>
{
    const { kind, amount = null } = props;

    const icon = kind === 'sol' ? solanaIcon : hotelIcon;
    const label = kind === 'sol' ? 'SOL in your wallet' : '$HOTEL in your wallet';
    const display = amount === null
        ? '...'
        : amount.toLocaleString(undefined, { maximumFractionDigits: kind === 'sol' ? 4 : 2 });

    return (
        <OverlayTrigger placement="left" overlay={ <Tooltip id={ `tooltip-${ kind }` }>{ label }</Tooltip> }>
            <Flex justifyContent="end" pointer gap={ 1 } className="nitro-purse-button rounded">
                <Text truncate textEnd variant="white" grow>{ display }</Text>
                <div className="nitro-currency-icon" style={ { backgroundImage: `url(${ icon })`, backgroundSize: 'contain' } } />
            </Flex>
        </OverlayTrigger>
    );
};
