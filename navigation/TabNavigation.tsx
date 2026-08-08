/**
 * Platform entry is resolved via TabNavigation.ios.tsx / TabNavigation.android.tsx.
 * This file is the TypeScript / fallback resolve target.
 */
export {default} from './TabNavigation.android';
export type {BottomNavigator, TabNavParams} from './tabShared';
