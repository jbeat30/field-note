import { describeSessionStoreContract } from './sessionStore.contract';
import { createMemorySessionStore } from './sessionStore';

describeSessionStoreContract('메모리', () => ({ createStore: createMemorySessionStore }));
