import { useEffect, useState } from 'react';
import { useBetween } from 'use-between';
import { GetSessionDataManager } from '../../api';

// Polls the CMS for the logged-in player's on-chain balances (SOL + $HOTEL) for the purse display.
// The RPC + token mint stay server-side; this just reads the returned numbers. Shared via useBetween
// so both purse slots use one fetch.
const useWalletBalancesState = () =>
{
    const [ sol, setSol ] = useState<number | null>(null);
    const [ hotel, setHotel ] = useState<number | null>(null);
    const [ hotelConfigured, setHotelConfigured ] = useState<boolean>(false);

    useEffect(() =>
    {
        let cancelled = false;

        const load = async () =>
        {
            const name = GetSessionDataManager()?.userName;
            if(!name) return;

            try
            {
                const res = await fetch(`/api/wallet/balances?username=${ encodeURIComponent(name) }`);
                if(!res.ok || cancelled) return;
                const data = await res.json();
                if(cancelled) return;
                setSol(typeof data.sol === 'number' ? data.sol : 0);
                setHotel(typeof data.hotel === 'number' ? data.hotel : 0);
                setHotelConfigured(!!data.hotelConfigured);
            }
            catch {}
        };

        load();
        const id = window.setInterval(load, 60000);
        return () => { cancelled = true; window.clearInterval(id); };
    }, []);

    return { sol, hotel, hotelConfigured };
};

export const useWalletBalances = () => useBetween(useWalletBalancesState);
