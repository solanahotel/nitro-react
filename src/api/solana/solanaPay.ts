import { clusterApiUrl, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';

// SPL Memo program — we attach the one-time payment reference here so the CMS can
// bind the on-chain transaction to the specific purchase intent.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// The Nitro client runs inside a same-origin iframe; Phantom injects window.solana
// into the TOP window, not always the iframe. Resolve from iframe -> top -> parent.
function getPhantomProvider(): any
{
    const sources: Array<() => any> = [
        () => (window as any).phantom?.solana,
        () => (window as any).solana,
        () => (window.top as any)?.phantom?.solana,
        () => (window.top as any)?.solana,
        () => (window.parent as any)?.phantom?.solana,
        () => (window.parent as any)?.solana,
    ];

    for(const get of sources)
    {
        try
        {
            const provider = get();
            if(provider && provider.isPhantom) return provider;
        }
        catch { /* cross-origin access throws; ignore */ }
    }

    return null;
}

function clusterFor(network: string): 'mainnet-beta' | 'devnet' | 'testnet'
{
    if(network === 'devnet') return 'devnet';
    if(network === 'testnet') return 'testnet';
    return 'mainnet-beta';
}

// Pay `lamports` to `treasury` from the user's Phantom wallet, tagging the tx with
// `reference`. Returns the transaction signature. Throws on any failure.
export async function payClubWithPhantom(
    treasury: string,
    lamports: number,
    reference: string,
    network: string,
    rpcUrl?: string
): Promise<string>
{
    const provider = getPhantomProvider();

    if(!provider)
    {
        throw new Error('Phantom wallet not found. Open the hotel in a tab where Phantom is enabled.');
    }

    const conn = await provider.connect();
    const fromPubkey: PublicKey = conn?.publicKey ?? provider.publicKey;

    if(!fromPubkey)
    {
        throw new Error('Could not get wallet public key.');
    }

    const connection = new Connection(rpcUrl && rpcUrl.length ? rpcUrl : clusterApiUrl(clusterFor(network)), 'confirmed');

    const transaction = new Transaction();
    transaction.add(SystemProgram.transfer({
        fromPubkey,
        toPubkey: new PublicKey(treasury),
        lamports,
    }));
    transaction.add(new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: new TextEncoder().encode(reference) as any,
    }));

    transaction.feePayer = fromPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Phantom signs and submits; returns { signature }.
    const result = await provider.signAndSendTransaction(transaction);
    const signature: string = result?.signature ?? result;

    if(!signature)
    {
        throw new Error('No signature returned from wallet.');
    }

    return signature;
}
