import { IMessageComposer, IMessageConfiguration, IMessageDataWrapper, IMessageEvent, IMessageParser, MessageEvent } from '@nitrots/nitro-renderer';
import { GetConnection } from '../nitro/GetConnection';

// Effects inventory packets (must match the emulator):
//   client->server: 9051 get-list, 9052 activate(effectId), 9053 deactivate
//   server->client: 9050 inventory list

export interface OwnedEffect { effectId: number; name: string; quantity: number; isActive: boolean; }

export class GetEffectsInventoryComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9051;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class ActivateEffectComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER = 9052;
    private _data: [number];
    constructor(effectId: number) { this._data = [effectId]; }
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class DeactivateEffectComposer implements IMessageComposer<[]>
{
    public static readonly HEADER = 9053;
    private _data: [] = [];
    public getMessageArray() { return this._data; }
    public dispose(): void { this._data = null; }
}

export class EffectsInventoryParser implements IMessageParser
{
    public effects: OwnedEffect[] = [];
    public flush(): boolean { this.effects = []; return true; }
    public parse(w: IMessageDataWrapper): boolean
    {
        this.effects = [];
        let count = w.readInt();
        while(count > 0)
        {
            this.effects.push({ effectId: w.readInt(), name: w.readString(), quantity: w.readInt(), isActive: w.readBoolean() });
            count--;
        }
        return true;
    }
}

export class EffectsInventoryEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function) { super(callBack, EffectsInventoryParser); }
    public getParser(): EffectsInventoryParser { return this.parser as EffectsInventoryParser; }
}

let registered = false;

export const EnsureEffectMessagesRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();
    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ 9050, EffectsInventoryEvent ],
        ]),
        composers: new Map<number, Function>([
            [ GetEffectsInventoryComposer.HEADER, GetEffectsInventoryComposer ],
            [ ActivateEffectComposer.HEADER, ActivateEffectComposer ],
            [ DeactivateEffectComposer.HEADER, DeactivateEffectComposer ],
        ]),
    };

    connection.registerMessages(configuration);
    registered = true;
    return true;
}
