import type { AppState, Participant, ParticipantId } from './types';
export const rotation: ParticipantId[] = ['fidel','marco','noyi','manu'];
export const participants: Participant[] = [
 {id:'fidel',name:'Fidel',photo:'participants/fidel.jpg',theme:'blue'},
 {id:'marco',name:'Marco',photo:'participants/marco.jpg',theme:'brown'},
 {id:'noyi',name:'Noyi',photo:'participants/noyi.jpg',theme:'purple'},
 {id:'manu',name:'Manu',photo:'participants/manu.jpg',theme:'orange'}
];
export const byId = Object.fromEntries(participants.map(p=>[p.id,p])) as Record<ParticipantId,Participant>;
export const themeColor: Record<ParticipantId,string> = {fidel:'#2868B2',marco:'#9A6038',noyi:'#7651B5',manu:'#E66D24'};
export const initialState = (): AppState => ({version:1,currentPayer:'manu',rotation:[...rotation],skips:{fidel:1,marco:0,noyi:0,manu:0},deferredPayer:null,history:[
 {id:'history-fidel-1',type:'payment',payer:'fidel',label:'Peña anterior'},
 {id:'history-fidel-2',type:'payment',payer:'fidel',label:'Peña anterior'},
 {id:'history-marco',type:'payment',payer:'marco',label:'Peña anterior'},
 {id:'history-noyi',type:'payment',payer:'noyi',label:'Última Peña'}
]});
