import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser, MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Daily Quests packets (must match the emulator):
//   client->server: 9021 get, 9022 claim (code)
//   server->client: 9018 quests list

export class QuestsGetComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9021;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class QuestsClaimComposer implements IMessageComposer<[string]>
{
    public static readonly HEADER = 9022;
    private _data: [string];
    constructor(code: string) { this._data = [code]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export interface DailyQuest { code: string; name: string; description: string; goal: number; progress: number; rewardCredits: number; claimed: boolean; }

export class QuestsListParser implements IMessageParser
{
    public quests: DailyQuest[] = [];
    public flush(): boolean { this.quests = []; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.quests = [];
        const count = w.readInt();
        for(let i = 0; i < count; i++)
        {
            this.quests.push({
                code: w.readString(), name: w.readString(), description: w.readString(),
                goal: w.readInt(), progress: w.readInt(), rewardCredits: w.readInt(), claimed: w.readBoolean()
            });
        }
        return true;
    }
}

export class QuestsListEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, QuestsListParser); }
    public getParser(): QuestsListParser { return this.parser as QuestsListParser; }
}

let registered = false;

export const EnsureQuestMessagesRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();
    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ 9018, QuestsListEvent ],
        ]),
        composers: new Map<number, Function>([
            [ QuestsGetComposer.HEADER, QuestsGetComposer ],
            [ QuestsClaimComposer.HEADER, QuestsClaimComposer ],
        ]),
    };

    connection.registerMessages(configuration);
    registered = true;
    return true;
}
