import type { AppState } from './types'; import { initialState } from './data';
export interface StorageAdapter { load():AppState|null; save(state:AppState):void }
const KEY='pentapena_state_v1';
export class LocalStorageAdapter implements StorageAdapter {
 load(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const value=JSON.parse(raw) as AppState;return value.version===1?{...value,deferredPayer:value.deferredPayer??null}:null}catch{return null}}
 save(state:AppState){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{/* private browser mode */}}
}
export const storage=new LocalStorageAdapter();
export const loadState=()=>storage.load()??initialState();
