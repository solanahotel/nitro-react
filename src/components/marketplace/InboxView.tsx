import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { AddEventLinkTracker, EnsureInboxMessagesRegistered, InboxGetComposer, InboxMessagesEvent, InboxUnreadCountEvent, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useInbox, useMessageEvent, useNotification } from '../../hooks';

// Always mounted (renders null when closed) so it keeps the shared inbox state + unread badge live.
export const InboxView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const { messages, setMessages, setUnreadCount, markAllRead } = useInbox();
    const { simpleAlert } = useNotification();
    const seenRef = useRef<{ ids: Set<number>; ready: boolean }>({ ids: new Set(), ready: false });

    // Register the inbox packets + pull the unread count once the connection is up (retry until ready).
    useEffect(() =>
    {
        let cancelled = false;
        const tryInit = () =>
        {
            if(cancelled) return;
            if(EnsureInboxMessagesRegistered()) SendMessageComposer(new InboxGetComposer());
            else window.setTimeout(tryInit, 1500);
        };
        tryInit();
        return () => { cancelled = true; };
    }, []);

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                switch(parts[1])
                {
                    case 'show': setIsVisible(true); SendMessageComposer(new InboxGetComposer()); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); SendMessageComposer(new InboxGetComposer()); return;
                }
            },
            eventUrlPrefix: 'inbox/'
        };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useMessageEvent<InboxMessagesEvent>(InboxMessagesEvent, event =>
    {
        const msgs = event.getParser().messages;
        setMessages(msgs);
        setUnreadCount(msgs.filter(m => !m.isRead).length);

        // Notify on newly-arrived unread support replies (from in-client or Housekeeping). The first
        // fetch just seeds the "seen" set so we don't pop for messages that were already there.
        const seen = seenRef.current;
        if(!seen.ready)
        {
            msgs.forEach(m => seen.ids.add(m.id));
            seen.ready = true;
        }
        else
        {
            const fresh = msgs.filter(m => (m.category === 'support') && !m.isRead && !seen.ids.has(m.id));
            if(fresh.length) simpleAlert('A staff member replied to your support ticket. Open Help -> Support to read it.', null, null, null, 'New support reply');
            msgs.forEach(m => seen.ids.add(m.id));
        }
    });

    // Poll the inbox so replies made from Housekeeping (which can't push) still notify + update the badge.
    useEffect(() =>
    {
        const id = window.setInterval(() => { if(EnsureInboxMessagesRegistered()) SendMessageComposer(new InboxGetComposer()); }, 20000);
        return () => window.clearInterval(id);
    }, []);
    useMessageEvent<InboxUnreadCountEvent>(InboxUnreadCountEvent, event =>
    {
        setUnreadCount(event.getParser().count);
        if(event.getParser().count > 0) SendMessageComposer(new InboxGetComposer());
    });

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="inbox" className="nitro-inbox" theme="primary" style={ { width: 380 } }>
            <NitroCardHeaderView headerText="Inbox" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView gap={ 2 }>
                <Flex justifyContent="end">
                    <Button variant="secondary" disabled={ !messages.some(m => !m.isRead) } onClick={ markAllRead }>Mark all read</Button>
                </Flex>
                <Column gap={ 1 } className="overflow-auto" style={ { maxHeight: 420 } }>
                    { messages.length === 0 && <Text>No messages yet.</Text> }
                    { messages.map(m => (
                        <Column key={ m.id } gap={ 0 } className="p-2"
                            style={ { borderRadius: 6, border: '1px solid #2c3650', background: m.isRead ? '#1a2030' : '#243049' } }>
                            <Flex justifyContent="between" alignItems="center" gap={ 2 }>
                                <Text bold style={ { color: m.isRead ? '#cdd5e6' : '#ffffff' } }>{ !m.isRead ? '● ' : '' }{ m.title }</Text>
                                <Text small variant="muted">{ m.createdAt }</Text>
                            </Flex>
                            { !!m.body && <Text small style={ { whiteSpace: 'pre-wrap' } }>{ m.body }</Text> }
                        </Column>
                    )) }
                </Column>
            </NitroCardContentView>
        </NitroCardView>
    );
}
