import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, EnsureSupportMessagesRegistered, GetSessionDataManager, RemoveLinkEventTracker, SendMessageComposer, SupportCloseComposer, SupportGetComposer, SupportGuideCheckComposer, SupportGuideEvent, SupportListComposer, SupportOpenComposer, SupportPollComposer, SupportPostComposer, SupportResultEvent, SupportTicketDetail, SupportTicketEvent, SupportTicketSummary, SupportTicketsEvent, SupportTicketUpdateEvent } from '../../api';
import { Base, Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardSubHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';
import { NameChangeView } from './views/name-change/NameChangeView';
import { SanctionSatusView } from './views/SanctionStatusView';

type TopTab = 'guide' | 'support';
type SupportMode = 'list' | 'new' | 'chat' | 'staff';

interface GuideSection { key: string; title: string; body: string[]; }

const GUIDE: GuideSection[] = [
    { key: 'welcome', title: 'Welcome', body: [
        'Welcome to Solana Hotel! This is a social virtual world where you hang out in rooms, collect furniture, trade on the marketplace, and earn credits.',
        'Use the menu on the bottom-left to open the Navigator (rooms), Catalog (shops), Inventory, Marketplace, Daily Wheel, Daily Quests, your Inbox, and this Help centre.',
        'Click your avatar (top-right) for your profile, achievements, rooms, clothing and settings.' ] },
    { key: 'credits', title: 'Credits & Earning', body: [
        'Credits are the main currency. You earn them automatically and by playing:',
        '- Daily login + streak - log in each day; your streak climbs (10 -> 50 bonus) and resets if you miss a day.',
        '- Active time - 10 credits per 30 minutes while you are in a room and active (up to 50/day).',
        '- Room visitors - earn when people visit your rooms; visiting others rewards you too.',
        '- Daily Wheel - one free spin a day.',
        '- Daily Quests - complete quests for credit rewards.',
        'Members earn 1.5x on most faucets.' ] },
    { key: 'rooms', title: 'Rooms', body: [
        'Open the Navigator (rooms icon) to find and visit rooms, or create your own.',
        'In your own room you can place furniture from your inventory, decorate, and set access (open, doorbell, password).',
        'Drag furniture from your inventory into the room; double-click items to use them. Presents are opened by placing them and double-clicking.' ] },
    { key: 'marketplace', title: 'Marketplace', body: [
        'The Marketplace (coin icon, bottom-left) is separate from the catalog and has three sections:',
        '- Item Market - buy and sell rare/club furniture for credits. A 5% fee is burned on each sale.',
        '- Credit Exchange - list credit-items (Gold Bars, coins) for $HOTEL tokens (arrives with the on-chain layer).',
        '- Auction House - auction items with live bidding, anti-snipe, and credit escrow.',
        'Use the search and rarity filters to find what you want.' ] },
    { key: 'rewards', title: 'Daily Rewards', body: [
        '- Daily Wheel - spin once a day for credits or a Rare Box (open the box for a tradeable rare item). Members get better odds.',
        '- Daily Quests - quests like visiting rooms, getting visitors, or buying an item. Fill the progress bar and claim your reward.',
        '- Login streak - keep logging in daily to grow your streak bonus.' ] },
    { key: 'hotel', title: '$HOTEL Token', body: [
        '$HOTEL is the hotel\'s on-chain token (Solana). It will power the Credit Exchange, a holding-based access perk, and premium features.',
        'You connect a Phantom wallet to use $HOTEL features. This layer is rolling out - watch for announcements.' ] },
    { key: 'support', title: 'Getting Help', body: [
        'Need a hand or hit a problem? Open the Support tab above to create a ticket.',
        'A ticket is a private conversation with our staff - describe your question or issue and we will reply. You can see all replies and chat back and forth, and close the ticket once it is resolved.' ] },
];

const TICKET_CATEGORIES = [
    { key: 'general', label: 'General question' },
    { key: 'account', label: 'My account' },
    { key: 'rooms', label: 'Rooms & furniture' },
    { key: 'marketplace', label: 'Marketplace & credits' },
    { key: 'bug', label: 'Bug / something broke' },
    { key: 'report', label: 'Report a player' },
];

const inputStyle: CSSProperties = { padding: '7px 10px', borderRadius: 6, border: '1px solid #c2c9d1', background: '#ffffff', color: '#1a2030', width: '100%' };
const menuItem = (active: boolean): CSSProperties => ({ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: active ? 600 : 500, background: active ? '#2b3a55' : 'transparent', color: active ? '#ffffff' : '#2b3a55' });

export const HelpView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ tab, setTab ] = useState<TopTab>('guide');
    const [ guideKey, setGuideKey ] = useState(GUIDE[0].key);
    const [ supportMode, setSupportMode ] = useState<SupportMode>('list');
    const [ tickets, setTickets ] = useState<SupportTicketSummary[]>([]);
    const [ ticket, setTicket ] = useState<SupportTicketDetail>(null);
    const [ status, setStatus ] = useState('');
    const [ njSubject, setNjSubject ] = useState('');
    const [ njCategory, setNjCategory ] = useState('general');
    const [ njBody, setNjBody ] = useState('');
    const [ reply, setReply ] = useState('');

    const isStaff = !!GetSessionDataManager()?.isModerator;

    // register packets + first-time guide check (auto-popup for new users)
    useEffect(() =>
    {
        let cancelled = false;
        const init = () =>
        {
            if(cancelled) return;
            if(EnsureSupportMessagesRegistered()) SendMessageComposer(new SupportGuideCheckComposer());
            else window.setTimeout(init, 1500);
        };
        init();
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
                    case 'show': setIsVisible(true); EnsureSupportMessagesRegistered(); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); EnsureSupportMessagesRegistered(); return;
                    case 'report-room':
                    {
                        EnsureSupportMessagesRegistered();
                        const roomName = parts.length > 3 ? decodeURIComponent(parts[3]) : '';
                        setIsVisible(true);
                        setTab('support');
                        setSupportMode('new');
                        setStatus('');
                        setNjCategory('report');
                        setNjSubject('Report room: ' + roomName);
                        setNjBody('I would like to report the room "' + roomName + '" (id ' + (parts[2] || '?') + '). Reason: ');
                        return;
                    }
                }
            },
            eventUrlPrefix: 'help/'
        };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useMessageEvent<SupportTicketsEvent>(SupportTicketsEvent, event => setTickets(event.getParser().tickets));
    useMessageEvent<SupportTicketEvent>(SupportTicketEvent, event => { setTicket(event.getParser().ticket); setSupportMode('chat'); });
    useMessageEvent<SupportResultEvent>(SupportResultEvent, event => setStatus(event.getParser().message));
    useMessageEvent<SupportGuideEvent>(SupportGuideEvent, event => { if(event.getParser().show) { setIsVisible(true); setTab('guide'); setGuideKey('welcome'); } });
    // Live update: silently refresh the open conversation (staff reply push, or poll response) without
    // changing what the user is looking at.
    useMessageEvent<SupportTicketUpdateEvent>(SupportTicketUpdateEvent, event =>
    {
        const updated = event.getParser().ticket;
        if(updated && ticket && updated.id === ticket.id) setTicket(updated);
    });

    // Poll the open ticket every few seconds so replies (including from Housekeeping) appear live.
    useEffect(() =>
    {
        if(!isVisible || tab !== 'support' || supportMode !== 'chat' || !ticket) return;
        const id = window.setInterval(() => SendMessageComposer(new SupportPollComposer(ticket.id)), 5000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ isVisible, tab, supportMode, ticket?.id ]);

    const goSupport = (mode: SupportMode) =>
    {
        setStatus('');
        setSupportMode(mode);
        if(mode === 'list') SendMessageComposer(new SupportListComposer(0));
        else if(mode === 'staff') SendMessageComposer(new SupportListComposer(1));
    };

    const submitNew = () =>
    {
        if(!njSubject.trim() || !njBody.trim()) { setStatus('Please enter a subject and a message.'); return; }
        SendMessageComposer(new SupportOpenComposer(njSubject.trim(), njCategory, njBody.trim()));
        setNjSubject(''); setNjBody('');
    };

    const sendReply = () =>
    {
        if(!reply.trim() || !ticket) return;
        SendMessageComposer(new SupportPostComposer(ticket.id, reply.trim()));
        setReply('');
    };

    if(!isVisible) return (<><SanctionSatusView /><NameChangeView /></>);

    const tabBtn = (key: TopTab, label: string) => (
        <Button variant={ tab === key ? 'primary' : 'secondary' } onClick={ () => { setTab(key); if(key === 'support') goSupport('list'); } }>{ label }</Button>
    );

    return (
        <>
            <NitroCardView uniqueKey="help" className="nitro-help-center" theme="primary" style={ { width: 720 } }>
                <NitroCardHeaderView headerText="Help & Support" onCloseClick={ () => setIsVisible(false) } />
                <NitroCardSubHeaderView gap={ 1 }>
                    <Flex gap={ 1 }>
                        { tabBtn('guide', '📖 Guide') }
                        { tabBtn('support', '💬 Support') }
                    </Flex>
                </NitroCardSubHeaderView>
                <NitroCardContentView className="text-black">
                    <Flex gap={ 2 } style={ { minHeight: 420 } }>
                        <Column gap={ 1 } style={ { width: 190, flexShrink: 0, borderRight: '1px solid #c2c9d1', paddingRight: 8 } }>
                            { tab === 'guide' && GUIDE.map(s => (
                                <Base key={ s.key } style={ menuItem(guideKey === s.key) } onClick={ () => setGuideKey(s.key) }>{ s.title }</Base>
                            )) }
                            { tab === 'support' &&
                                <>
                                    <Base style={ menuItem(supportMode === 'new') } onClick={ () => { setSupportMode('new'); setStatus(''); } }>✏️ New ticket</Base>
                                    <Base style={ menuItem(supportMode === 'list' || (supportMode === 'chat' && !isStaff)) } onClick={ () => goSupport('list') }>📨 My tickets</Base>
                                    { isStaff && <Base style={ menuItem(supportMode === 'staff') } onClick={ () => goSupport('staff') }>🛡️ All tickets (staff)</Base> }
                                </> }
                        </Column>

                        <Column gap={ 2 } className="overflow-auto" style={ { flexGrow: 1, maxHeight: 460 } }>
                            { tab === 'guide' && (() =>
                            {
                                const sec = GUIDE.find(s => s.key === guideKey) ?? GUIDE[0];
                                return (
                                    <Column gap={ 1 }>
                                        <Text bold fontSize={ 3 }>{ sec.title }</Text>
                                        { sec.body.map((p, i) => <Text key={ i } style={ { whiteSpace: 'pre-wrap', lineHeight: 1.5 } }>{ p }</Text>) }
                                    </Column>
                                );
                            })() }

                            { tab === 'support' && supportMode === 'new' &&
                                <Column gap={ 2 }>
                                    <Text bold fontSize={ 3 }>Open a ticket</Text>
                                    <Text small variant="muted">Describe your question or problem. Staff will reply here and you can chat back and forth.</Text>
                                    { !!status && <Text bold style={ { color: '#b45309' } }>{ status }</Text> }
                                    <Column gap={ 1 }>
                                        <Text small bold>Category</Text>
                                        <select value={ njCategory } onChange={ e => setNjCategory(e.target.value) } style={ inputStyle }>
                                            { TICKET_CATEGORIES.map(c => <option key={ c.key } value={ c.key }>{ c.label }</option>) }
                                        </select>
                                    </Column>
                                    <Column gap={ 1 }>
                                        <Text small bold>Subject</Text>
                                        <input type="text" maxLength={ 120 } placeholder="Short summary" value={ njSubject } onChange={ e => setNjSubject(e.target.value) } style={ inputStyle } />
                                    </Column>
                                    <Column gap={ 1 }>
                                        <Text small bold>Message</Text>
                                        <textarea rows={ 5 } placeholder="Explain what you need help with..." value={ njBody } onChange={ e => setNjBody(e.target.value) } style={ { ...inputStyle, resize: 'vertical' } } />
                                    </Column>
                                    <Flex><Button variant="success" onClick={ submitNew }>Send ticket</Button></Flex>
                                </Column> }

                            { tab === 'support' && (supportMode === 'list' || supportMode === 'staff') &&
                                <Column gap={ 1 }>
                                    <Flex justifyContent="between" alignItems="center">
                                        <Text bold fontSize={ 3 }>{ supportMode === 'staff' ? 'All tickets' : 'My tickets' }</Text>
                                        <Button variant="secondary" onClick={ () => goSupport(supportMode) }> Refresh</Button>
                                    </Flex>
                                    { !!status && <Text bold style={ { color: '#b45309' } }>{ status }</Text> }
                                    { tickets.length === 0 && <Text variant="muted">No tickets here. Open one from 'New ticket'.</Text> }
                                    { tickets.map(t => (
                                        <Flex key={ t.id } justifyContent="between" alignItems="center" pointer className="p-2" onClick={ () => SendMessageComposer(new SupportGetComposer(t.id)) }
                                            style={ { borderRadius: 6, border: '1px solid #cdd5e6', background: '#f3f5fa' } }>
                                            <Column gap={ 0 }>
                                                <Text bold truncate style={ { maxWidth: 320 } }>#{ t.id } - { t.subject }</Text>
                                                <Text small variant="muted">{ supportMode === 'staff' ? `${ t.ownerName } - ` : '' }{ t.category } - { t.messages } messages - { t.updatedAt }</Text>
                                            </Column>
                                            <Text small bold style={ { color: t.status === 'open' ? '#16a34a' : '#6b7280' } }>{ t.status }</Text>
                                        </Flex>
                                    )) }
                                </Column> }

                            { tab === 'support' && supportMode === 'chat' && ticket &&
                                <Column gap={ 2 } style={ { height: '100%' } }>
                                    <Flex justifyContent="between" alignItems="center">
                                        <Column gap={ 0 }>
                                            <Text bold fontSize={ 3 }>#{ ticket.id } - { ticket.subject }</Text>
                                            <Text small variant="muted">{ ticket.ownerName } - { ticket.category } - <span style={ { color: ticket.status === 'open' ? '#16a34a' : '#6b7280' } }>{ ticket.status }</span></Text>
                                        </Column>
                                        <Flex gap={ 1 }>
                                            { ticket.status === 'open' && <Button variant="danger" onClick={ () => SendMessageComposer(new SupportCloseComposer(ticket.id)) }>Close</Button> }
                                        </Flex>
                                    </Flex>
                                    { !!status && <Text bold style={ { color: '#b45309' } }>{ status }</Text> }
                                    <Column gap={ 1 } className="overflow-auto" style={ { flexGrow: 1, maxHeight: 300, padding: 4, border: '1px solid #cdd5e6', borderRadius: 6, background: '#f3f5fa' } }>
                                        { ticket.messages.map((m, i) => (
                                            <Flex key={ i } justifyContent={ m.isStaff ? 'end' : 'start' }>
                                                <Column gap={ 0 } className="p-2" style={ { maxWidth: '78%', borderRadius: 8, background: m.isStaff ? '#dbeafe' : '#eef2f8', border: '1px solid #cdd5e6' } }>
                                                    <Text small bold style={ { color: m.isStaff ? '#1d4ed8' : '#374151' } }>{ m.senderName }{ m.isStaff ? ' (Staff)' : '' }</Text>
                                                    <Text style={ { whiteSpace: 'pre-wrap' } }>{ m.body }</Text>
                                                    <Text small variant="muted" style={ { alignSelf: 'end' } }>{ m.createdAt }</Text>
                                                </Column>
                                            </Flex>
                                        )) }
                                    </Column>
                                    { ticket.status === 'open'
                                        ? <Flex gap={ 1 } alignItems="end">
                                            <textarea rows={ 2 } placeholder="Write a reply..." value={ reply } onChange={ e => setReply(e.target.value) } style={ { ...inputStyle, resize: 'none' } } />
                                            <Button variant="success" onClick={ sendReply }>Send</Button>
                                        </Flex>
                                        : <Text small variant="muted">This ticket is closed.</Text> }
                                </Column> }
                        </Column>
                    </Flex>
                </NitroCardContentView>
            </NitroCardView>
            <SanctionSatusView />
            <NameChangeView />
        </>
    );
}
