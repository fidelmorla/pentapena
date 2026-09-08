import type { ParticipantId } from './types';
export function getNextEligiblePayer(current:ParticipantId, rotation:ParticipantId[], skips:Record<ParticipantId,number>) {
 const nextSkips={...skips}; let index=rotation.indexOf(current);
 for(let checked=0;checked<rotation.length*2;checked++){
  index=(index+1)%rotation.length; const candidate=rotation[index];
  if(nextSkips[candidate]>0){nextSkips[candidate]-=1;continue;}
  return {nextPayer:candidate,updatedSkips:nextSkips};
 }
 return {nextPayer:current,updatedSkips:nextSkips};
}
export function getAbsenceSubstitute(absent:ParticipantId, rotation:ParticipantId[], skips:Record<ParticipantId,number>) {
 return getNextEligiblePayer(absent, rotation, skips);
}
export function previewTurns(current:ParticipantId, rotation:ParticipantId[], skips:Record<ParticipantId,number>, count=4){
 const result:ParticipantId[]=[]; let payer=current; let simulated={...skips};
 while(result.length<count){const next=getNextEligiblePayer(payer,rotation,simulated);payer=next.nextPayer;simulated=next.updatedSkips;result.push(payer)}
 return result;
}
