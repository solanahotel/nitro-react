import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { ActivateEffectComposer, AddEventLinkTracker, DeactivateEffectComposer, EffectsInventoryEvent, EnsureEffectMessagesRegistered, GetEffectsInventoryComposer, OwnedEffect, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';

// Effects inventory: lists the avatar effects the player owns and lets them equip / take off one.
// An equipped effect persists while walking (the emulator restores it on room change / relog).
export const EffectsView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ effects, setEffects ] = useState<OwnedEffect[]>([]);

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                const refresh = () => { if(EnsureEffectMessagesRegistered()) SendMessageComposer(new GetEffectsInventoryComposer()); };
                switch(parts[1])
                {
                    case 'show': setIsVisible(true); refresh(); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); refresh(); return;
                }
            },
            eventUrlPrefix: 'effects/'
        };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useMessageEvent<EffectsInventoryEvent>(EffectsInventoryEvent, event => setEffects(event.getParser().effects));

    if(!isVisible) return null;

    const anyActive = effects.some(e => e.isActive);

    return (
        <NitroCardView uniqueKey="effects" className="nitro-effects" theme="primary" style={ { width: 360 } }>
            <NitroCardHeaderView headerText="Effects" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView gap={ 2 }>
                <Flex justifyContent="between" alignItems="center" gap={ 2 }>
                    <Text small variant="muted">Equip an effect on your avatar. It stays on while you walk.</Text>
                    { anyActive && <Button variant="secondary" onClick={ () => SendMessageComposer(new DeactivateEffectComposer()) }>Take off</Button> }
                </Flex>
                <Column gap={ 1 } className="overflow-auto" style={ { maxHeight: 420 } }>
                    { effects.length === 0 && <Text>You don't own any effects yet. Win them from the Daily Wheel or ask an admin.</Text> }
                    { effects.map(e => (
                        <Flex key={ e.effectId } justifyContent="between" alignItems="center" gap={ 2 } className="p-2"
                            style={ { borderRadius: 8, border: '1px solid #2c3650', background: e.isActive ? '#dff3e6' : '#eef2f8' } }>
                            <Column gap={ 0 }>
                                <Text bold>{ e.name }</Text>
                                <Text small variant="muted">Effect #{ e.effectId }{ e.quantity > 1 ? ` x${ e.quantity }` : '' }</Text>
                            </Column>
                            { e.isActive
                                ? <Text small bold style={ { color: '#16a34a', whiteSpace: 'nowrap' } }>Equipped</Text>
                                : <Button variant="success" onClick={ () => SendMessageComposer(new ActivateEffectComposer(e.effectId)) }>Equip</Button> }
                        </Flex>
                    )) }
                </Column>
            </NitroCardContentView>
        </NitroCardView>
    );
}
