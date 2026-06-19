import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { ClubPaymentIntentComposer, ClubPaymentIntentResultEvent, ClubPaymentResultEvent, ClubPaymentSubmitComposer, EnsureClubMessagesRegistered, payClubWithPhantom, SendMessageComposer } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, LayoutGridItem, Text } from '../../../../../common';
import { useMessageEvent } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface ClubPackage
{
    id: number;
    name: string;
    months: number;
    duration_days: number;
    price_usd: number;
    sol: number | null;
}

export const CatalogLayoutSolanaClubView: FC<CatalogLayoutProps> = props =>
{
    const [ packages, setPackages ] = useState<ClubPackage[]>([]);
    const [ network, setNetwork ] = useState<string>('mainnet-beta');
    const [ rate, setRate ] = useState<number | null>(null);
    const [ busy, setBusy ] = useState(false);
    const [ status, setStatus ] = useState<string>('');
    const rpcUrlRef = useRef<string>('');

    useEffect(() =>
    {
        EnsureClubMessagesRegistered();

        fetch('/api/club/packages')
            .then(r => r.json())
            .then(data =>
            {
                setPackages(data.packages || []);
                setNetwork(data.network || 'mainnet-beta');
                setRate(data.sol_usd_rate ?? null);
                rpcUrlRef.current = data.rpc_url || '';
            })
            .catch(() => setStatus('Could not load packages.'));
    }, []);

    // Step 2: emulator returned the payment intent -> pay with Phantom -> submit signature.
    useMessageEvent<ClubPaymentIntentResultEvent>(ClubPaymentIntentResultEvent, async event =>
    {
        const p = event.getParser();

        if(!p.ok)
        {
            setBusy(false);
            setStatus('Could not start payment: ' + (p.error || 'error'));
            return;
        }

        try
        {
            setStatus('Approve the payment in your Phantom wallet…');
            const signature = await payClubWithPhantom(p.treasury, Number(p.lamports), p.reference, p.network, rpcUrlRef.current);
            setStatus('Payment sent — verifying on-chain (this can take a moment)…');
            SendMessageComposer(new ClubPaymentSubmitComposer(p.packageId, signature));
        }
        catch(e: any)
        {
            setBusy(false);
            setStatus('Payment cancelled or failed: ' + (e?.message || 'error'));
        }
    });

    // Step 3: emulator verified + granted (or rejected).
    useMessageEvent<ClubPaymentResultEvent>(ClubPaymentResultEvent, event =>
    {
        const r = event.getParser();
        setBusy(false);
        setStatus(r.ok
            ? `Solana Club is now active! ${ r.daysLeft } days remaining.`
            : `Payment not granted: ${ r.message }`);
    });

    const buy = useCallback((pkg: ClubPackage) =>
    {
        if(busy) return;
        if(!window.confirm(`Buy ${ pkg.name } of Solana Club for $${ pkg.price_usd }${ pkg.sol ? ` (~${ pkg.sol } SOL)` : '' }?\n\nYou'll approve a real SOL payment in Phantom.`)) return;

        setBusy(true);
        setStatus('Requesting payment details…');
        SendMessageComposer(new ClubPaymentIntentComposer(pkg.id));
    }, [ busy ]);

    return (
        <Column overflow="hidden">
            <Text bold>Solana Club — paid on-chain ({ network }{ rate ? `, SOL ≈ $${ rate }` : '' })</Text>
            <AutoGrid columnCount={ 1 } className="nitro-catalog-layout-vip-buy-grid">
                { packages.map(pkg => (
                    <LayoutGridItem key={ pkg.id } column={ false } center={ false } alignItems="center" justifyContent="between" className="p-1">
                        <i className="icon-hc-banner" />
                        <Column justifyContent="end" gap={ 0 }>
                            <Text textEnd bold>{ pkg.name }</Text>
                            <Flex justifyContent="end" gap={ 1 }>
                                <Text textEnd>${ pkg.price_usd }</Text>
                            </Flex>
                        </Column>
                        <Button variant="success" disabled={ busy } onClick={ () => buy(pkg) }>Buy</Button>
                    </LayoutGridItem>
                )) }
            </AutoGrid>
            { status && <Text center className="mt-2">{ status }</Text> }
        </Column>
    );
}
