import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { AddEventLinkTracker, EnsureWheelMessagesRegistered, RemoveLinkEventTracker, SendMessageComposer, WheelGetStateComposer, WheelResultEvent, WheelSpinComposer, WheelStateEvent } from '../../api';
import { Base, Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';

interface Reward { ok: boolean; label: string; rewardType: string; message: string; }
const TIERS = [ '10 credits', '25 credits', '50 credits', '100 credits', 'Rare Box' ];

export const WheelView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ canSpin, setCanSpin ] = useState(false);
    const [ lastReward, setLastReward ] = useState('');
    const [ spinning, setSpinning ] = useState(false);
    const [ teaser, setTeaser ] = useState(TIERS[0]);
    const [ result, setResult ] = useState<Reward | null>(null);
    const teaserRef = useRef<number | null>(null);

    const stopTeaser = () => { if(teaserRef.current) { window.clearInterval(teaserRef.current); teaserRef.current = null; } };

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                const refresh = () => { setResult(null); if(EnsureWheelMessagesRegistered()) SendMessageComposer(new WheelGetStateComposer()); };
                switch(parts[1])
                {
                    case 'show': setIsVisible(true); refresh(); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); refresh(); return;
                }
            },
            eventUrlPrefix: 'wheel/'
        };
        AddEventLinkTracker(tracker);
        return () => { RemoveLinkEventTracker(tracker); stopTeaser(); };
    }, []);

    useMessageEvent<WheelStateEvent>(WheelStateEvent, event =>
    {
        const p = event.getParser();
        setCanSpin(p.canSpin);
        setLastReward(p.lastReward);
    });
    useMessageEvent<WheelResultEvent>(WheelResultEvent, event =>
    {
        const p = event.getParser();
        if(!p.ok)
        {
            stopTeaser(); setSpinning(false);
            setResult({ ok: false, label: '', rewardType: '', message: p.message });
            return;
        }
        // let the wheel spin a beat before revealing
        window.setTimeout(() =>
        {
            stopTeaser(); setSpinning(false);
            setResult({ ok: true, label: p.label, rewardType: p.rewardType, message: '' });
        }, 1500);
    });

    const spin = () =>
    {
        if(!canSpin || spinning) return;
        setResult(null);
        setSpinning(true);
        let i = 0;
        teaserRef.current = window.setInterval(() => { i = (i + 1) % TIERS.length; setTeaser(TIERS[i]); }, 85);
        SendMessageComposer(new WheelSpinComposer());
    };

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="wheel" className="nitro-wheel" theme="primary" style={ { width: 340 } }>
            <NitroCardHeaderView headerText="Daily Wheel" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView gap={ 2 }>
                <Column center gap={ 2 } className="p-2">
                    <Base className={ 'wheel-image' + (spinning ? ' spinning' : '') } />
                    { spinning && <Text bold fontSize={ 4 }>{ teaser }...</Text> }
                    { !spinning && result?.ok &&
                        <Column center gap={ 1 }>
                            <Text bold fontSize={ 3 } style={ { color: result.rewardType === 'rare_item' ? '#b06eff' : '#7ee0a6' } }>
                                { result.rewardType === 'rare_item' ? '🎁 ' : '💰 ' }{ result.label }
                            </Text>
                            <Text small variant="muted">Come back tomorrow for another spin!</Text>
                        </Column> }
                    { !spinning && result && !result.ok && <Text bold className="text-warning">{ result.message }</Text> }
                    { !spinning && !result && canSpin && <Text center>One free spin a day - members get better odds. Good luck!</Text> }
                    { !spinning && !result && !canSpin && <Text center variant="muted">You've already spun today{ lastReward ? ` (${ lastReward })` : '' }. Come back tomorrow!</Text> }
                </Column>
                <Flex center>
                    <Button variant="success" disabled={ !canSpin || spinning } onClick={ spin }>{ spinning ? 'Spinning...' : 'Spin!' }</Button>
                </Flex>
                <Column gap={ 0 } className="p-2" style={ { borderTop: '1px solid #2c3650' } }>
                    <Text small variant="muted">Prizes: 10 / 25 / 50 / 100 credits, or a Rare Box - place &amp; open it for a tradeable rare item.</Text>
                </Column>
            </NitroCardContentView>
        </NitroCardView>
    );
}
