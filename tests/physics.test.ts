import assert from 'node:assert/strict';
import {freshState,step,distanceProgress} from '../src/game/physics.ts';
import {CONFIG,OBSTACLES} from '../src/game/config.ts';
const gas={forward:true,brake:false,left:false,right:false};
let s=freshState();for(let i=0;i<60;i++)s=step(s,gas,1/60);assert.ok(s.z<5);assert.ok(s.speed>0);
const before=s.speed;s=step(s,{...gas,brake:true},.05);assert.ok(s.speed<before);
const left=step({...freshState(),speed:10},{...gas,left:true},.05);assert.ok(left.x<0);
const o=OBSTACLES[0];const collision=step({...freshState(),x:o.x,z:o.z+o.radius+.6,speed:17},gas,.05);assert.equal(collision.bumps,1);assert.equal(collision.speed,0);assert.ok(Math.hypot(collision.x-o.x,collision.z-o.z)>o.radius+.55);
const win=step({...freshState(),x:6,z:CONFIG.finishZ+.01,speed:10},gas,.05);assert.equal(win.won,true);assert.equal(distanceProgress(win),1);assert.deepEqual(step(win,gas,.05),win);
// A complete course can be finished safely down the outside of the obstacles.
s={...freshState(),x:6};for(let i=0;i<1200&&!s.won;i++)s=step(s,gas,1/60);assert.ok(s.won);assert.equal(s.bumps,0);
const bounded=step({...freshState(),x:8,yaw:-.9,speed:17},gas,.05);assert.ok(bounded.x<=8);
console.log('Passed: acceleration, braking, steering, collision recovery, finish, complete ride, road bounds.');
