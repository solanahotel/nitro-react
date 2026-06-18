import { IMessageComposer, IMessageConfiguration } from '@nitrots/nitro-renderer';
import { GetConnection } from './GetConnection';

// Custom (non-Habbo) outgoing packet for permanent furniture deletion.
// Header 4001 must match EventHandlerId.RoomItemDelete in the Sadie emulator.
export class RoomItemDeleteComposer implements IMessageComposer<[number]>
{
    public static readonly HEADER: number = 4001;

    private _data: [number];

    constructor(itemId: number)
    {
        this._data = [itemId];
    }

    public getMessageArray(): [number]
    {
        return this._data;
    }

    public dispose(): void
    {
        this._data = null;
    }
}

// nitro-renderer drops composers it doesn't know about, so this header->class
// mapping must be registered at runtime once the connection exists. Idempotent.
let registered = false;

export const EnsureRoomItemDeleteComposerRegistered = (): boolean =>
{
    if(registered) return true;

    const connection = GetConnection();

    if(!connection) return false;

    const configuration: IMessageConfiguration = {
        events: new Map(),
        composers: new Map([ [ RoomItemDeleteComposer.HEADER, RoomItemDeleteComposer ] ])
    };

    connection.registerMessages(configuration);

    registered = true;

    return true;
}
