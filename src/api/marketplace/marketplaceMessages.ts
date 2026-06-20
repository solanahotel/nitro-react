import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser, MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Custom (non-Habbo) standalone Marketplace packets. Headers must match the emulator:
//   client->server: 9000 get-listings, 9001 get-sellable, 9002 my-listings,
//                   9003 create, 9004 buy, 9005 cancel
//   server->client: 9010 listings, 9011 sellable, 9012 my-listings, 9013 result

// ----- outgoing composers -----

export class MarketplaceGetListingsComposer implements IMessageComposer<[string]>
{
    public static readonly HEADER = 9000;
    private _data: [string];
    constructor(section: string) { this._data = [section]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class MarketplaceGetSellableComposer implements IMessageComposer<[string]>
{
    public static readonly HEADER = 9001;
    private _data: [string];
    constructor(section: string) { this._data = [section]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class MarketplaceGetMyListingsComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9002;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

// section, price, then the item-id list as count + ids (matches the emulator List<int> reader).
export class MarketplaceCreateComposer implements IMessageComposer<unknown[]>
{
    public static readonly HEADER = 9003;
    private _data: unknown[];
    constructor(section: string, priceCredits: number, priceHotel: string, durationHours: number, itemIds: number[])
    {
        this._data = [ section, priceCredits, priceHotel, durationHours, itemIds.length, ...itemIds ];
    }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class MarketplaceBidComposer implements IMessageComposer<[number, number]>
{
    public static readonly HEADER = 9020;
    private _data: [number, number];
    constructor(listingId: number, bidAmount: number) { this._data = [listingId, bidAmount]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class MarketplaceBuyComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9004;
    private _data: [number];
    constructor(listingId: number) { this._data = [listingId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class MarketplaceCancelComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9005;
    private _data: [number];
    constructor(listingId: number) { this._data = [listingId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

// ----- incoming data shapes -----

export interface MarketplaceListing { id: number; assetId: number; name: string; rarity: string; quantity: number; priceCredits: number; priceHotel: string; totalCreditValue: number; startPrice: number; highestBid: number; expiresAt: number; sellerName: string; }
export interface MarketplaceSellable { ownedId: number; assetId: number; name: string; rarity: string; creditValue: number; }

// ----- incoming parsers -----

export class MarketplaceListingsParser implements IMessageParser
{
    public listings: MarketplaceListing[] = [];
    public flush(): boolean { this.listings = []; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.listings = [];
        const count = w.readInt();
        for(let i = 0; i < count; i++)
        {
            this.listings.push({
                id: w.readInt(), assetId: w.readInt(), name: w.readString(), rarity: w.readString(),
                quantity: w.readInt(), priceCredits: w.readInt(), priceHotel: w.readString(), totalCreditValue: w.readInt(),
                startPrice: w.readInt(), highestBid: w.readInt(), expiresAt: w.readInt(), sellerName: w.readString()
            });
        }
        return true;
    }
}

export class MarketplaceSellableParser implements IMessageParser
{
    public items: MarketplaceSellable[] = [];
    public flush(): boolean { this.items = []; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.items = [];
        const count = w.readInt();
        for(let i = 0; i < count; i++)
        {
            this.items.push({ ownedId: w.readInt(), assetId: w.readInt(), name: w.readString(), rarity: w.readString(), creditValue: w.readInt() });
        }
        return true;
    }
}

export class MarketplaceResultParser implements IMessageParser
{
    public ok = false;
    public message = '';
    public flush(): boolean { this.ok = false; this.message = ''; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.ok = w.readBoolean();
        this.message = w.readString();
        return true;
    }
}

// ----- incoming events -----

export class MarketplaceListingsEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, MarketplaceListingsParser); }
    public getParser(): MarketplaceListingsParser { return this.parser as MarketplaceListingsParser; }
}

export class MarketplaceMyListingsEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, MarketplaceListingsParser); }
    public getParser(): MarketplaceListingsParser { return this.parser as MarketplaceListingsParser; }
}

export class MarketplaceSellableEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, MarketplaceSellableParser); }
    public getParser(): MarketplaceSellableParser { return this.parser as MarketplaceSellableParser; }
}

export class MarketplaceResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, MarketplaceResultParser); }
    public getParser(): MarketplaceResultParser { return this.parser as MarketplaceResultParser; }
}

// nitro-renderer drops unknown messages, so register these once at runtime.
let registered = false;

export const EnsureMarketplaceMessagesRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();
    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ 9010, MarketplaceListingsEvent ],
            [ 9011, MarketplaceSellableEvent ],
            [ 9012, MarketplaceMyListingsEvent ],
            [ 9013, MarketplaceResultEvent ],
        ]),
        composers: new Map<number, Function>([
            [ MarketplaceGetListingsComposer.HEADER, MarketplaceGetListingsComposer ],
            [ MarketplaceGetSellableComposer.HEADER, MarketplaceGetSellableComposer ],
            [ MarketplaceGetMyListingsComposer.HEADER, MarketplaceGetMyListingsComposer ],
            [ MarketplaceCreateComposer.HEADER, MarketplaceCreateComposer ],
            [ MarketplaceBuyComposer.HEADER, MarketplaceBuyComposer ],
            [ MarketplaceCancelComposer.HEADER, MarketplaceCancelComposer ],
            [ MarketplaceBidComposer.HEADER, MarketplaceBidComposer ],
        ]),
    };

    connection.registerMessages(configuration);
    registered = true;
    return true;
}
