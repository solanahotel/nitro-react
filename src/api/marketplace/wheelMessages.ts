import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser, MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Daily Wheel packets (must match the emulator):
//   client->server: 9008 get-state, 9009 spin
//   server->client: 9016 state, 9017 result

export class WheelGetStateComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9008;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class WheelSpinComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9009;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class WheelStateParser implements IMessageParser
{
    public canSpin = false;
    public lastReward = '';
    public flush(): boolean { this.canSpin = false; this.lastReward = ''; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.canSpin = w.readBoolean();
        this.lastReward = w.readString();
        return true;
    }
}

export class WheelResultParser implements IMessageParser
{
    public ok = false;
    public rewardType = '';
    public amount = 0;
    public label = '';
    public message = '';
    public flush(): boolean { this.ok = false; this.rewardType = ''; this.amount = 0; this.label = ''; this.message = ''; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.ok = w.readBoolean();
        this.rewardType = w.readString();
        this.amount = w.readInt();
        this.label = w.readString();
        this.message = w.readString();
        return true;
    }
}

export class WheelStateEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, WheelStateParser); }
    public getParser(): WheelStateParser { return this.parser as WheelStateParser; }
}

export class WheelResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, WheelResultParser); }
    public getParser(): WheelResultParser { return this.parser as WheelResultParser; }
}

let registered = false;

export const EnsureWheelMessagesRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();
    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ 9016, WheelStateEvent ],
            [ 9017, WheelResultEvent ],
        ]),
        composers: new Map<number, Function>([
            [ WheelGetStateComposer.HEADER, WheelGetStateComposer ],
            [ WheelSpinComposer.HEADER, WheelSpinComposer ],
        ]),
    };

    connection.registerMessages(configuration);
    registered = true;
    return true;
}
