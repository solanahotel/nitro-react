// Browser polyfills for @solana/web3.js (used by the Solana Club payment flow).
import { Buffer } from 'buffer';
(window as any).Buffer = (window as any).Buffer || Buffer;
(window as any).global = (window as any).global || window;

import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.scss';

createRoot(document.getElementById('root')).render(<App />);
