import {CONFIG, OBSTACLES} from './config.ts';
export type Controls = {forward:boolean; brake:boolean; left:boolean; right:boolean};
export type BikeState = {x:number;z:number;yaw:number;speed:number;time:number;bumps:number;cooldown:number;won:boolean};
export const freshState = ():BikeState => ({x:0,z:5,yaw:0,speed:0,time:0,bumps:0,cooldown:0,won:false});
// Pure simulation: no React or Three.js here. Easy to read, change, and test.
export function step(state:BikeState,input:Controls,dt:number):BikeState {
  if(state.won)return state;
  dt=Math.min(Math.max(dt,0),.05); // Avoid big jumps after switching tabs.
  const s={...state,time:state.time+dt,cooldown:Math.max(0,state.cooldown-dt)};
  const force=input.brake?-22:input.forward?CONFIG.acceleration:-4;
  s.speed=Math.max(0,Math.min(CONFIG.maxSpeed,s.speed+force*dt));
  const steering=(Number(input.left)-Number(input.right));
  s.yaw=Math.max(-.92,Math.min(.92,s.yaw+steering*1.6*dt*Math.min(1,s.speed/3)));
  if(!steering)s.yaw*=Math.exp(-2.6*dt); // Gentle auto-centering for a friendly first ride.
  s.x-=Math.sin(s.yaw)*s.speed*dt;
  s.z-=Math.cos(s.yaw)*s.speed*dt;
  s.x=Math.max(-CONFIG.roadHalfWidth,Math.min(CONFIG.roadHalfWidth,s.x));
  for(const obstacle of OBSTACLES){
    if(Math.hypot(s.x-obstacle.x,s.z-obstacle.z)<obstacle.radius+.55){
      s.x=state.x;s.z=state.z;s.speed=0;
      if(s.cooldown===0){s.bumps++;s.cooldown=.8;}
      // Push sideways so accelerating never traps the rider inside an obstacle.
      s.x=Math.max(-8,Math.min(8,obstacle.x+(s.x>=obstacle.x?1:-1)*(obstacle.radius+.65)));
      break;
    }
  }
  if(s.z<=CONFIG.finishZ){s.won=true;s.speed=0;}
  return s;
}
export const distanceProgress=(s:BikeState)=>Math.min(1,Math.max(0,(5-s.z)/(5-CONFIG.finishZ)));
