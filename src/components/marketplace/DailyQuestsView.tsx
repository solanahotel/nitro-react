import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, DailyQuest, EnsureQuestMessagesRegistered, QuestsClaimComposer, QuestsGetComposer, QuestsListEvent, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';

export const DailyQuestsView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ quests, setQuests ] = useState<DailyQuest[]>([]);

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                const refresh = () => { if(EnsureQuestMessagesRegistered()) SendMessageComposer(new QuestsGetComposer()); };
                switch(parts[1])
                {
                    case 'show': setIsVisible(true); refresh(); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); refresh(); return;
                }
            },
            eventUrlPrefix: 'quests/'
        };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useMessageEvent<QuestsListEvent>(QuestsListEvent, event => setQuests(event.getParser().quests));

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="daily-quests" className="nitro-quests" theme="primary" style={ { width: 400 } }>
            <NitroCardHeaderView headerText="Daily Quests" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView gap={ 2 }>
                <Text small variant="muted">Complete quests for credit rewards. Resets every day.</Text>
                <Column gap={ 2 } className="overflow-auto" style={ { maxHeight: 460 } }>
                    { quests.length === 0 && <Text>No quests available right now.</Text> }
                    { quests.map(quest =>
                    {
                        const done = quest.progress >= quest.goal;
                        const pct = Math.min(100, Math.round((quest.progress / Math.max(1, quest.goal)) * 100));
                        return (
                            <Column key={ quest.code } gap={ 1 } className="p-2" style={ { borderRadius: 8, border: '1px solid #2c3650', background: '#eef2f8' } }>
                                <Flex justifyContent="between" alignItems="center" gap={ 2 }>
                                    <Text bold>{ quest.name }</Text>
                                    <Text small bold style={ { color: '#16a34a', whiteSpace: 'nowrap' } }>+{ quest.rewardCredits } cr</Text>
                                </Flex>
                                <Text small variant="muted">{ quest.description }</Text>
                                <div style={ { height: 14, borderRadius: 7, background: '#dbe2ec', border: '1px solid #2c3650', overflow: 'hidden' } }>
                                    <div style={ { height: '100%', width: `${ pct }%`, background: done ? '#4caf50' : '#6ea8ff', transition: 'width .3s' } } />
                                </div>
                                <Flex justifyContent="between" alignItems="center">
                                    <Text small>{ Math.min(quest.progress, quest.goal) } / { quest.goal }</Text>
                                    { quest.claimed
                                        ? <Text small bold style={ { color: '#16a34a' } }>✓ Claimed</Text>
                                        : <Button variant={ done ? 'success' : 'secondary' } disabled={ !done } onClick={ () => SendMessageComposer(new QuestsClaimComposer(quest.code)) }>{ done ? 'Claim reward' : 'In progress' }</Button> }
                                </Flex>
                            </Column>
                        );
                    }) }
                </Column>
            </NitroCardContentView>
        </NitroCardView>
    );
}
