import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser, MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Support / ticket packets (must match the emulator):
//   client->server: 9030 open, 9031 list(scope), 9032 get(id), 9033 post(id,body), 9034 close(id),
//                   9035 restrict(targetId,banned), 9036 guide-check
//   server->client: 9043 tickets list, 9044 ticket conversation, 9045 result, 9046 show-guide

export class SupportOpenComposer implements IMessageComposer<[string, string, string]>
{
    public static readonly HEADER = 9030;
    private _data: [string, string, string];
    constructor(subject: string, category: string, body: string) { this._data = [subject, category, body]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class SupportListComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9031;
    private _data: [number];
    constructor(scope: number) { this._data = [scope]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class SupportGetComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9032;
    private _data: [number];
    constructor(ticketId: number) { this._data = [ticketId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class SupportPostComposer implements IMessageComposer<[number, string]>
{
    public static readonly HEADER = 9033;
    private _data: [number, string];
    constructor(ticketId: number, body: string) { this._data = [ticketId, body]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class SupportCloseComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9034;
    private _data: [number];
    constructor(ticketId: number) { this._data = [ticketId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class SupportRestrictComposer implements IMessageComposer<[number, boolean]>
{
    public static readonly HEADER = 9035;
    private _data: [number, boolean];
    constructor(targetId: number, banned: boolean) { this._data = [targetId, banned]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class SupportGuideCheckComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9036;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

// Poll one ticket for live updates (silent refresh of the open conversation).
export class SupportPollComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9037;
    private _data: [number];
    constructor(ticketId: number) { this._data = [ticketId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export interface SupportTicketSummary { id: number; subject: string; category: string; status: string; ownerName: string; messages: number; updatedAt: string; }
export interface SupportMessage { senderName: string; isStaff: boolean; body: string; createdAt: string; }
export interface SupportTicketDetail { id: number; subject: string; category: string; status: string; ownerName: string; messages: SupportMessage[]; }

export class SupportTicketsParser implements IMessageParser
{
    public tickets: SupportTicketSummary[] = [];
    public flush(): boolean { this.tickets = []; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.tickets = [];
        const count = w.readInt();
        for(let i = 0; i < count; i++)
            this.tickets.push({ id: w.readInt(), subject: w.readString(), category: w.readString(), status: w.readString(), ownerName: w.readString(), messages: w.readInt(), updatedAt: w.readString() });
        return true;
    }
}

export class SupportTicketParser implements IMessageParser
{
    public ticket: SupportTicketDetail = null;
    public flush(): boolean { this.ticket = null; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        const id = w.readInt(), subject = w.readString(), category = w.readString(), status = w.readString(), ownerName = w.readString();
        const messages: SupportMessage[] = [];
        const count = w.readInt();
        for(let i = 0; i < count; i++)
            messages.push({ senderName: w.readString(), isStaff: w.readBoolean(), body: w.readString(), createdAt: w.readString() });
        this.ticket = { id, subject, category, status, ownerName, messages };
        return true;
    }
}

export class SupportResultParser implements IMessageParser
{
    public ok = false;
    public message = '';
    public flush(): boolean { this.ok = false; this.message = ''; return true; }
    public parse(w: IMessageDataWrapper): boolean { this.ok = w.readBoolean(); this.message = w.readString(); return true; }
}

export class SupportGuideParser implements IMessageParser
{
    public show = false;
    public flush(): boolean { this.show = false; return true; }
    public parse(w: IMessageDataWrapper): boolean { this.show = w.readBoolean(); return true; }
}

export class SupportTicketsEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, SupportTicketsParser); }
    public getParser(): SupportTicketsParser { return this.parser as SupportTicketsParser; }
}
export class SupportTicketEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, SupportTicketParser); }
    public getParser(): SupportTicketParser { return this.parser as SupportTicketParser; }
}
export class SupportResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, SupportResultParser); }
    public getParser(): SupportResultParser { return this.parser as SupportResultParser; }
}
export class SupportGuideEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, SupportGuideParser); }
    public getParser(): SupportGuideParser { return this.parser as SupportGuideParser; }
}
// Silent live update of the open conversation (push on staff reply, or poll response). Reuses the
// ticket parser; the view applies it without changing the user's current screen.
export class SupportTicketUpdateEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, SupportTicketParser); }
    public getParser(): SupportTicketParser { return this.parser as SupportTicketParser; }
}

let registered = false;

export const EnsureSupportMessagesRegistered = (): boolean =>
{
    if(registered) return true;
    const connection = GetConnection();
    if(!connection) return false;

    connection.registerMessages({
        events: new Map<number, Function>([
            [ 9043, SupportTicketsEvent ],
            [ 9044, SupportTicketEvent ],
            [ 9045, SupportResultEvent ],
            [ 9046, SupportGuideEvent ],
            [ 9047, SupportTicketUpdateEvent ],
        ]),
        composers: new Map<number, Function>([
            [ SupportOpenComposer.HEADER, SupportOpenComposer ],
            [ SupportListComposer.HEADER, SupportListComposer ],
            [ SupportGetComposer.HEADER, SupportGetComposer ],
            [ SupportPostComposer.HEADER, SupportPostComposer ],
            [ SupportCloseComposer.HEADER, SupportCloseComposer ],
            [ SupportRestrictComposer.HEADER, SupportRestrictComposer ],
            [ SupportGuideCheckComposer.HEADER, SupportGuideCheckComposer ],
            [ SupportPollComposer.HEADER, SupportPollComposer ],
        ]),
    });
    registered = true;
    return true;
}
