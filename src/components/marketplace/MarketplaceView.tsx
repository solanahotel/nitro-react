import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { AddEventLinkTracker, EnsureMarketplaceMessagesRegistered, MarketplaceBidComposer, MarketplaceBuyComposer, MarketplaceCancelComposer, MarketplaceCreateComposer, MarketplaceGetListingsComposer, MarketplaceGetMyListingsComposer, MarketplaceGetSellableComposer, MarketplaceListing, MarketplaceListingsEvent, MarketplaceMyListingsEvent, MarketplaceResultEvent, MarketplaceSellable, MarketplaceSellableEvent, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { Button, Column, Flex, LayoutFurniIconImageView, NitroCardContentView, NitroCardHeaderView, NitroCardSubHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';

type Tab = 'item_market' | 'credit_exchange' | 'auction';
type Mode = 'browse' | 'mine' | 'sell';

const RARITIES = [ 'common', 'uncommon', 'rare', 'very_rare', 'legendary' ];
const RARITY_LABEL: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', very_rare: 'Very Rare', legendary: 'Legendary' };
const RARITY_COLOR: Record<string, string> = { common: '#9aa6c0', uncommon: '#4caf50', rare: '#6ea8ff', very_rare: '#7c3aed', legendary: '#b45309' };
const DURATIONS = [ 6, 12, 24, 48 ];
const MIN_INCREMENT = 5;

const cardStyle: CSSProperties = { width: 152, border: '1px solid #2c3650', borderRadius: 8, background: '#eef2f8' };
const inputStyle: CSSProperties = { padding: '6px 9px', borderRadius: 6, border: '1px solid #2c3650', background: '#1a2030', color: '#e8ecf5' };

const isHotel = (l: MarketplaceListing) => !!l.priceHotel && l.priceHotel !== '0';
const fmtTime = (secs: number) =>
{
    if(secs <= 0) return 'ended';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    if(h > 0) return `${ h }h ${ m }m`;
    if(m > 0) return `${ m }m ${ s }s`;
    return `${ s }s`;
};

export const MarketplaceView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ tab, setTab ] = useState<Tab>('item_market');
    const [ mode, setMode ] = useState<Mode>('browse');
    const [ listings, setListings ] = useState<MarketplaceListing[]>([]);
    const [ myListings, setMyListings ] = useState<MarketplaceListing[]>([]);
    const [ sellable, setSellable ] = useState<MarketplaceSellable[]>([]);
    const [ selectedSell, setSelectedSell ] = useState<number>(0);
    const [ price, setPrice ] = useState<string>('');
    const [ duration, setDuration ] = useState<number>(24);
    const [ status, setStatus ] = useState<string>('');
    const [ rarityFilter, setRarityFilter ] = useState<string>('');
    const [ search, setSearch ] = useState<string>('');
    const [ bidInputs, setBidInputs ] = useState<Record<number, string>>({});
    const [ now, setNow ] = useState<number>(Math.floor(Date.now() / 1000));

    const isExchange = tab === 'credit_exchange';
    const isAuction = tab === 'auction';

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                switch(parts[1])
                {
                    case 'show': setIsVisible(true); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); return;
                }
            },
            eventUrlPrefix: 'marketplace/'
        };
        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    // live countdown tick while viewing auctions
    useEffect(() =>
    {
        if(!isVisible || !isAuction) return;
        const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => window.clearInterval(id);
    }, [ isVisible, isAuction ]);

    const requestForMode = () =>
    {
        if(mode === 'browse') SendMessageComposer(new MarketplaceGetListingsComposer(tab));
        else if(mode === 'mine') SendMessageComposer(new MarketplaceGetMyListingsComposer());
        else if(mode === 'sell') SendMessageComposer(new MarketplaceGetSellableComposer(tab));
    };

    useEffect(() =>
    {
        if(!isVisible) return;
        if(!EnsureMarketplaceMessagesRegistered()) return;
        setStatus('');
        setSelectedSell(0);
        requestForMode();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ isVisible, tab, mode ]);

    useMessageEvent<MarketplaceListingsEvent>(MarketplaceListingsEvent, event => setListings(event.getParser().listings));
    useMessageEvent<MarketplaceMyListingsEvent>(MarketplaceMyListingsEvent, event => setMyListings(event.getParser().listings));
    useMessageEvent<MarketplaceSellableEvent>(MarketplaceSellableEvent, event => setSellable(event.getParser().items));
    useMessageEvent<MarketplaceResultEvent>(MarketplaceResultEvent, event => { setStatus(event.getParser().message); requestForMode(); });

    const filteredListings = useMemo(() =>
    {
        const q = search.trim().toLowerCase();
        return listings.filter(l =>
            (isExchange || isAuction || !rarityFilter || l.rarity === rarityFilter) &&
            (!q || (l.name || '').toLowerCase().includes(q)));
    }, [ listings, rarityFilter, search, isExchange, isAuction ]);

    const submitListing = () =>
    {
        if(!selectedSell) { setStatus('Pick an item to list.'); return; }
        if(isExchange)
        {
            const p = price.trim();
            if(!p || isNaN(Number(p)) || Number(p) <= 0) { setStatus('Enter a valid $HOTEL price.'); return; }
            SendMessageComposer(new MarketplaceCreateComposer('credit_exchange', 0, p, 0, [ selectedSell ]));
        }
        else if(isAuction)
        {
            const value = parseInt(price, 10);
            if(!value || value <= 0) { setStatus('Enter a valid starting price.'); return; }
            SendMessageComposer(new MarketplaceCreateComposer('auction', value, '0', duration, [ selectedSell ]));
        }
        else
        {
            const value = parseInt(price, 10);
            if(!value || value <= 0) { setStatus('Enter a valid credit price.'); return; }
            SendMessageComposer(new MarketplaceCreateComposer('item_market', value, '0', 0, [ selectedSell ]));
        }
        setSelectedSell(0);
        setPrice('');
        setMode('mine');
    };

    const placeBid = (listing: MarketplaceListing) =>
    {
        const min = listing.highestBid > 0 ? listing.highestBid + MIN_INCREMENT : listing.startPrice;
        const value = parseInt(bidInputs[listing.id] ?? '', 10);
        if(!value || value < min) { setStatus(`Bid must be at least ${ min } credits.`); return; }
        SendMessageComposer(new MarketplaceBidComposer(listing.id, value));
        setBidInputs(prev => ({ ...prev, [listing.id]: '' }));
    };

    if(!isVisible) return null;

    const tabButton = (key: Tab, label: string) => (
        <Button variant={ tab === key ? 'primary' : 'secondary' } onClick={ () => { setTab(key); setMode('browse'); } }>{ label }</Button>
    );
    const modeButton = (key: Mode, label: string) => (
        <Button variant={ mode === key ? 'primary' : 'secondary' } onClick={ () => setMode(key) }>{ label }</Button>
    );
    const rarityBadge = (rarity: string) => (
        <Text small bold style={ { color: RARITY_COLOR[rarity] ?? '#9aa6c0' } }>{ RARITY_LABEL[rarity] ?? 'Common' }</Text>
    );
    const itemImage = (assetId: number) => (
        <Flex center style={ { height: 56 } }><LayoutFurniIconImageView productType="s" productClassId={ assetId } /></Flex>
    );
    const nameText = (name: string) => (
        <Text bold center truncate className="w-100" title={ name }>{ name }</Text>
    );

    return (
        <NitroCardView uniqueKey="marketplace" className="nitro-marketplace" theme="primary" style={ { width: 640 } }>
            <NitroCardHeaderView headerText="Marketplace" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardSubHeaderView gap={ 1 }>
                <Flex gap={ 1 }>
                    { tabButton('item_market', 'Item Market') }
                    { tabButton('credit_exchange', 'Credit Exchange') }
                    { tabButton('auction', 'Auction House') }
                </Flex>
            </NitroCardSubHeaderView>
            <NitroCardContentView gap={ 2 }>
                <Flex gap={ 1 } alignItems="center">
                    { modeButton('browse', 'Browse') }
                    { modeButton('mine', 'My listings') }
                    { modeButton('sell', 'Sell an item') }
                </Flex>

                { mode === 'browse' &&
                    <Column gap={ 2 } overflow="hidden">
                        <input type="text" placeholder="Search items..." value={ search } onChange={ e => setSearch(e.target.value) } style={ { ...inputStyle } } />
                        { !isExchange && !isAuction &&
                            <Flex gap={ 1 } wrap alignItems="center">
                                <Button variant={ !rarityFilter ? 'primary' : 'secondary' } onClick={ () => setRarityFilter('') }>All</Button>
                                { RARITIES.map(r => (
                                    <Button key={ r } variant={ rarityFilter === r ? 'primary' : 'secondary' } onClick={ () => setRarityFilter(rarityFilter === r ? '' : r) }>
                                        <span style={ { color: RARITY_COLOR[r] } }>● </span>{ RARITY_LABEL[r] }
                                    </Button>
                                )) }
                            </Flex> }
                        { !!status && <Text bold className="text-warning">{ status }</Text> }
                        <Flex wrap gap={ 2 } className="overflow-auto" style={ { maxHeight: 360 } }>
                            { filteredListings.length === 0 && <Text>Nothing here right now.</Text> }
                            { filteredListings.map(listing =>
                            {
                                if(isAuction)
                                {
                                    const left = listing.expiresAt - now;
                                    const min = listing.highestBid > 0 ? listing.highestBid + MIN_INCREMENT : listing.startPrice;
                                    return (
                                        <Column key={ listing.id } gap={ 1 } alignItems="center" className="p-2" style={ cardStyle }>
                                            { nameText(listing.name) }
                                            { itemImage(listing.assetId) }
                                            { rarityBadge(listing.rarity) }
                                            <Text bold style={ { color: '#b45309' } }>{ listing.highestBid > 0 ? `${ listing.highestBid } cr (bid)` : `${ listing.startPrice } cr (start)` }</Text>
                                            <Text small variant="muted">⏱ { fmtTime(left) } - by { listing.sellerName }</Text>
                                            { left > 0 &&
                                                <Flex gap={ 1 } className="w-100">
                                                    <input type="number" min={ min } placeholder={ `>= ${ min }` } value={ bidInputs[listing.id] ?? '' }
                                                        onChange={ e => setBidInputs(prev => ({ ...prev, [listing.id]: e.target.value })) } style={ { ...inputStyle, width: 70 } } />
                                                    <Button variant="success" onClick={ () => placeBid(listing) }>Bid</Button>
                                                </Flex> }
                                        </Column>
                                    );
                                }
                                return (
                                    <Column key={ listing.id } gap={ 1 } alignItems="center" className="p-2" style={ cardStyle }>
                                        { nameText(listing.name) }
                                        { itemImage(listing.assetId) }
                                        { !isExchange && rarityBadge(listing.rarity) }
                                        { listing.quantity > 1 && <Text small>{ listing.quantity }x</Text> }
                                        { isExchange && <Text small variant="muted">{ listing.totalCreditValue } credits worth</Text> }
                                        <Text bold style={ { color: isExchange ? '#7c3aed' : '#16a34a' } }>{ isExchange ? `${ listing.priceHotel } $HOTEL` : `${ listing.priceCredits } credits` }</Text>
                                        <Text small variant="muted">by { listing.sellerName }</Text>
                                        <Button variant="success" className="w-100"
                                            onClick={ () => isExchange ? setStatus('Buying credit items for $HOTEL arrives with the on-chain layer.') : SendMessageComposer(new MarketplaceBuyComposer(listing.id)) }>
                                            { isExchange ? 'Buy ($HOTEL)' : 'Buy' }
                                        </Button>
                                    </Column>
                                );
                            }) }
                        </Flex>
                    </Column> }

                { mode === 'mine' &&
                    <Column gap={ 2 } overflow="hidden">
                        { !!status && <Text bold className="text-warning">{ status }</Text> }
                        <Flex wrap gap={ 2 } className="overflow-auto" style={ { maxHeight: 400 } }>
                            { myListings.length === 0 && <Text>You have no active listings.</Text> }
                            { myListings.map(listing => (
                                <Column key={ listing.id } gap={ 1 } alignItems="center" className="p-2" style={ cardStyle }>
                                    { nameText(listing.name) }
                                    { itemImage(listing.assetId) }
                                    { listing.startPrice > 0
                                        ? <Text bold style={ { color: '#b45309' } }>{ listing.highestBid > 0 ? `${ listing.highestBid } cr (bid)` : `${ listing.startPrice } cr (start)` }</Text>
                                        : <Text bold style={ { color: isHotel(listing) ? '#7c3aed' : '#16a34a' } }>{ isHotel(listing) ? `${ listing.priceHotel } $HOTEL` : `${ listing.priceCredits } credits` }</Text> }
                                    { listing.startPrice > 0 && <Text small variant="muted">⏱ { fmtTime(listing.expiresAt - now) }</Text> }
                                    <Button variant="danger" className="w-100" onClick={ () => SendMessageComposer(new MarketplaceCancelComposer(listing.id)) }>Cancel</Button>
                                </Column>
                            )) }
                        </Flex>
                    </Column> }

                { mode === 'sell' &&
                    <Column gap={ 2 } overflow="hidden">
                        { isExchange && <Text>Select a credit item (Gold Bars, coins) and set a price in <b>$HOTEL</b> tokens. Buyers pay $HOTEL; you receive it directly to your wallet, the rest is burned.</Text> }
                        { isAuction && <Text>Auction a marketable item: set a starting price (Credits) and a duration. Bids escrow Credits; you can cancel only before the first bid.</Text> }
                        { !isExchange && !isAuction && <Text>Select one of your marketable items, set a credit price, and list it.</Text> }
                        { !!status && <Text bold className="text-warning">{ status }</Text> }
                        <Flex wrap gap={ 2 } className="overflow-auto" style={ { maxHeight: 280 } }>
                            { sellable.length === 0 && <Text>{ isExchange ? 'You have no credit items.' : 'You have no marketable items.' }</Text> }
                            { sellable.map(item => (
                                <Column key={ item.ownedId } gap={ 1 } center pointer onClick={ () => setSelectedSell(item.ownedId) } className="p-2"
                                    style={ { width: 120, borderRadius: 8, background: '#eef2f8', border: selectedSell === item.ownedId ? '2px solid #6ea8ff' : '1px solid #2c3650' } }>
                                    <Text small center truncate className="w-100" title={ item.name }>{ item.name }</Text>
                                    <LayoutFurniIconImageView productType="s" productClassId={ item.assetId } />
                                    { isExchange ? <Text small variant="muted">{ item.creditValue } credits</Text> : rarityBadge(item.rarity) }
                                </Column>
                            )) }
                        </Flex>
                        { isAuction &&
                            <Flex gap={ 1 } alignItems="center" wrap>
                                <Text small>Duration:</Text>
                                { DURATIONS.map(d => (
                                    <Button key={ d } variant={ duration === d ? 'primary' : 'secondary' } onClick={ () => setDuration(d) }>{ d }h</Button>
                                )) }
                            </Flex> }
                        <Flex gap={ 1 } alignItems="center">
                            <input type="number" min={ 0 } step={ isExchange ? 'any' : 1 } placeholder={ isExchange ? 'Price in $HOTEL' : isAuction ? 'Starting price (credits)' : 'Price in credits' } value={ price } onChange={ e => setPrice(e.target.value) } style={ { ...inputStyle, width: 190 } } />
                            <Button variant="success" disabled={ !selectedSell || !price } onClick={ submitListing }>{ isAuction ? 'Start auction' : isExchange ? 'List for $HOTEL' : 'List item' }</Button>
                        </Flex>
                    </Column> }
            </NitroCardContentView>
        </NitroCardView>
    );
}
