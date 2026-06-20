import { useState } from 'react';
import { useBetween } from 'use-between';
import { InboxGetComposer, InboxMarkReadComposer, InboxMessage, SendMessageComposer } from '../../api';

// Shared inbox state: the InboxView keeps it fed (via the 9014/9015 events), the toolbar badge reads it.
const useInboxState = () =>
{
    const [ messages, setMessages ] = useState<InboxMessage[]>([]);
    const [ unreadCount, setUnreadCount ] = useState<number>(0);

    const refresh = () => SendMessageComposer(new InboxGetComposer());
    const markAllRead = () => SendMessageComposer(new InboxMarkReadComposer());

    return { messages, setMessages, unreadCount, setUnreadCount, refresh, markAllRead };
};

export const useInbox = () => useBetween(useInboxState);
