import * as T from 'three';
import {box,mesh,materials,tree,sign} from './models';
import {CONFIG,OBSTACLES} from './config';
export function createWorld(scene:T.Scene){
  const ground=mesh(new T.PlaneGeometry(700,700),new T.MeshStandardMaterial({color:'#ddc6a0',roughness:1}),scene,0,-.05,-65);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  box(scene,[17,.09,174],new T.MeshStandardMaterial({color:'#e9d9b9',roughness:1}),0,0,-72);
  for(let z=8;z>-157;z-=6){box(scene,[.18,.04,2.6],materials.cream,-8.3,.06,z);box(scene,[.18,.04,2.6],materials.cream,8.3,.06,z);}
  for(let z=3;z>-145;z-=8)box(scene,[.15,.03,2.2],materials.cream,0,.07,z);
  for(let i=0;i<45;i++){
    const z=15-i*4.2;
    tree(scene,-12-Math.sin(i*7)*3,z,.7+(i%4)*.18);
    if(i%2===0)tree(scene,13+Math.cos(i*5)*3,z-3,.9+(i%3)*.15);
    if(i%3===0){const rock=mesh(new T.DodecahedronGeometry(1,0),materials.stone,scene,11+(i%4),.55,z);rock.scale.set(1.6,.8,1.2);}
  }
  for(const o of OBSTACLES){
    if(o.kind==='rock'){const rock=mesh(new T.DodecahedronGeometry(o.radius,0),materials.stone,scene,o.x,.65,o.z);rock.scale.set(1, .9,1);rock.rotation.set(.2,o.z,.1);}
    if(o.kind==='crate'){box(scene,[1.65,1.65,1.65],materials.wood,o.x,.86,o.z);box(scene,[1.72,.15,1.72],materials.cream,o.x,1.26,o.z);box(scene,[.16,1.7,1.72],materials.cream,o.x,.86,o.z);}
    if(o.kind==='cone'){box(scene,[1.1,.12,1.1],materials.black,o.x,.1,o.z);mesh(new T.ConeGeometry(.5,1.25,8),materials.orange,scene,o.x,.75,o.z);mesh(new T.CylinderGeometry(.24,.33,.22,8),materials.cream,scene,o.x,.85,o.z);}
  }
  // Roadside story: just enough information, discovered along the ride.
  sign(scene,'TAKE THE SCENIC ROUTE',-12,-9,6);
  sign(scene,'FERNANDO N LÓPEZ',11,-42,6);
  sign(scene,'WEB DEVELOPER',-12,-78,5.7);
  sign(scene,'REACT / TYPESCRIPT',11,-112,6);
  sign(scene,'FINISH',0,CONFIG.finishZ,6);
  box(scene,[.35,4.5,.35],materials.darkGreen,-7.8,2.25,CONFIG.finishZ);
  box(scene,[.35,4.5,.35],materials.darkGreen,7.8,2.25,CONFIG.finishZ);
  box(scene,[16,.65,.45],materials.darkGreen,0,4.4,CONFIG.finishZ);
  for(let i=0;i<16;i++)for(let j=0;j<2;j++)box(scene,[1,.035,1],(i+j)%2?materials.cream:materials.black,i-7.5,.08,CONFIG.finishZ+j-.5);
  // A little roadside workshop, no downloaded models required.
  box(scene,[5,3,4],materials.blue,17,1.5,-55);
  const roof=mesh(new T.ConeGeometry(4.2,1.5,4),materials.orange,scene,17,3.65,-55);roof.rotation.y=Math.PI/4;roof.scale.z=.85;
  box(scene,[1.3,1.8,.08],materials.cream,17,1,-52.95);
  for(const x of [15.5,18.5])box(scene,[.9,.8,.08],materials.darkGreen,x,1.8,-52.94);
  for(let i=0;i<8;i++){const hill=mesh(new T.ConeGeometry(12,12+(i%3)*4,5),materials.green,scene,(i%2?1:-1)*(32+i*3),4,-i*24);hill.rotation.y=i;hill.castShadow=false;}
}
