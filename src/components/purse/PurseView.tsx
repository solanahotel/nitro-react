import { FriendlyTime, HabboClubLevelEnum } from '@nitrots/nitro-renderer';
import { FC, useMemo } from 'react';
import { CreateLinkEvent, GetConfiguration, LocalizeText } from '../../api';
import { Column, Flex, Grid, LayoutCurrencyIcon, Text } from '../../common';
import { usePurse, useWalletBalances } from '../../hooks';
import { CurrencyView } from './views/CurrencyView';
import { WalletCurrencyView } from './views/WalletCurrencyView';

export const PurseView: FC<{}> = props =>
{
    const { purse = null, hcDisabled = false } = usePurse();
    const { sol = null, hotel = null } = useWalletBalances();

    const currencyDisplayNumberShort = useMemo(() => GetConfiguration<boolean>('currency.display.number.short', false), []);

    const getClubText = (() =>
    {
        if(!purse) return null;

        const totalDays = ((purse.clubPeriods * 31) + purse.clubDays);
        const minutesUntilExpiration = purse.minutesUntilExpiration;

        if(purse.clubLevel === HabboClubLevelEnum.NO_CLUB) return LocalizeText('purse.clubdays.zero.amount.text');

        else if((minutesUntilExpiration > -1) && (minutesUntilExpiration < (60 * 24))) return FriendlyTime.shortFormat(minutesUntilExpiration * 60);
        
        else return FriendlyTime.shortFormat(totalDays * 86400);
    })();

    if(!purse) return null;

    return (
        <Column alignItems="end" className="nitro-purse-container" gap={ 1 }>
            <Flex className="nitro-purse rounded-bottom p-1">
                <Grid fullWidth gap={ 1 }>
                    <Column justifyContent="center" size={ hcDisabled ? 10 : 6 } gap={ 0 }>
                        <CurrencyView type={ -1 } amount={ purse.credits } short={ currencyDisplayNumberShort } />
                        <WalletCurrencyView kind="sol" amount={ sol } />
                    </Column>
                    { !hcDisabled &&
                        <Column center pointer size={ 4 } gap={ 1 } className="nitro-purse-subscription rounded" onClick={ event => CreateLinkEvent('habboUI/open/hccenter') }>
                            <LayoutCurrencyIcon type="hc" />
                            <Text variant="white">{ getClubText }</Text>
                        </Column> }
                    <Column justifyContent="center" size={ 2 } gap={ 0 }>
                        <Flex center pointer fullHeight className="nitro-purse-button p-1 rounded" onClick={ event => CreateLinkEvent('help/show') }>
                            <i className="icon icon-help"/>
                        </Flex>
                        <Flex center pointer fullHeight className="nitro-purse-button p-1 rounded" onClick={ event => CreateLinkEvent('user-settings/toggle') } >
                            <i className="icon icon-cog"/>
                        </Flex>
                    </Column>
                </Grid>
            </Flex>
            <WalletCurrencyView kind="hotel" amount={ hotel } />
        </Column>
    );
}
