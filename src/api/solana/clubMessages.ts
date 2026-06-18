import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser } from '@nitrots/nitro-renderer';
import { MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Custom (non-Habbo) Solana Club payment packets. Headers must match the emulator:
//   4002 client->server intent request, 4003 client->server submit signature,
//   4004 server->client intent result, 4005 server->client grant result.

export class ClubPaymentIntentComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 4002;
    private _data: [number];
    constructor(packageId: number) { this._data = [packageId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class ClubPaymentSubmitComposer implements IMessageComposer<[number, string]>
{
    public static readonly HEADER = 4003;
    private _data: [number, string];
    constructor(packageId: number, signature: string) { this._data = [packageId, signature]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class ClubPaymentIntentResultParser implements IMessageParser
{
    public ok = false;
    public packageId = 0;
    public treasury = '';
    public lamports = '0';
    public sol = '0';
    public reference = '';
    public network = '';
    public priceUsd = '';
    public error = '';

    public flush(): boolean { this.ok = false; this.error = ''; return true; }

    public parse(w: IMessageDataWrapper): boolean
    {
        this.ok = w.readBoolean();
        this.packageId = w.readInt();
        this.treasury = w.readString();
        this.lamports = w.readString();
        this.sol = w.readString();
        this.reference = w.readString();
        this.network = w.readString();
        this.priceUsd = w.readString();
        this.error = w.readString();
        return true;
    }
}

export class ClubPaymentResultParser implements IMessageParser
{
    public ok = false;
    public message = '';
    public daysLeft = 0;

    public flush(): boolean { this.ok = false; this.message = ''; this.daysLeft = 0; return true; }

    public parse(w: IMessageDataWrapper): boolean
    {
        this.ok = w.readBoolean();
        this.message = w.readString();
        this.daysLeft = w.readInt();
        return true;
    }
}

export class ClubPaymentIntentResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, ClubPaymentIntentResultParser); }
    public getParser(): ClubPaymentIntentResultParser { return this.parser as ClubPaymentIntentResultParser; }
}

export class ClubPaymentResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, ClubPaymentResultParser); }
    public getParser(): ClubPaymentResultParser { return this.parser as ClubPaymentResultParser; }
}

// nitro-renderer drops messages it doesn't know, so register these once at runtime.
let registered = false;

export const EnsureClubMessagesRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();
    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ 4004, ClubPaymentIntentResultEvent ],
            [ 4005, ClubPaymentResultEvent ],
        ]),
        composers: new Map<number, Function>([
            [ ClubPaymentIntentComposer.HEADER, ClubPaymentIntentComposer ],
            [ ClubPaymentSubmitComposer.HEADER, ClubPaymentSubmitComposer ],
        ]),
    };

    connection.registerMessages(configuration);
    registered = true;
    return true;
}
