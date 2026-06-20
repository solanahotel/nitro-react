import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser, MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Custom persistent-inbox packets (must match the emulator):
//   client->server: 9006 get-messages, 9007 mark-all-read
//   server->client: 9014 messages, 9015 unread-count

export class InboxGetComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9006;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class InboxMarkReadComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9007;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export interface InboxMessage { id: number; category: string; title: string; body: string; isRead: boolean; createdAt: string; }

export class InboxMessagesParser implements IMessageParser
{
    public messages: InboxMessage[] = [];
    public flush(): boolean { this.messages = []; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.messages = [];
        const count = w.readInt();
        for(let i = 0; i < count; i++)
        {
            this.messages.push({
                id: w.readInt(), category: w.readString(), title: w.readString(),
                body: w.readString(), isRead: w.readBoolean(), createdAt: w.readString()
            });
        }
        return true;
    }
}

export class InboxUnreadCountParser implements IMessageParser
{
    public count = 0;
    public flush(): boolean { this.count = 0; return true; }
    public parse(w: IMessageDataWrapper): boolean { this.count = w.readInt(); return true; }
}

export class InboxMessagesEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, InboxMessagesParser); }
    public getParser(): InboxMessagesParser { return this.parser as InboxMessagesParser; }
}

export class InboxUnreadCountEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, InboxUnreadCountParser); }
    public getParser(): InboxUnreadCountParser { return this.parser as InboxUnreadCountParser; }
}

let registered = false;

export const EnsureInboxMessagesRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();
    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ 9014, InboxMessagesEvent ],
            [ 9015, InboxUnreadCountEvent ],
        ]),
        composers: new Map<number, Function>([
            [ InboxGetComposer.HEADER, InboxGetComposer ],
            [ InboxMarkReadComposer.HEADER, InboxMarkReadComposer ],
        ]),
    };

    connection.registerMessages(configuration);
    registered = true;
    return true;
}
