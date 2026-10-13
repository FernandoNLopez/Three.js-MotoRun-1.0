import * as T from 'three';
const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.82,flatShading:true});
export const materials={orange:mat('#df612f'),black:mat('#303733'),cream:mat('#f5e5c4'),metal:mat('#8d9b94'),green:mat('#64866f'),darkGreen:mat('#3c675b'),trunk:mat('#957458'),stone:mat('#aba491'),blue:mat('#577d82'),wood:mat('#b78051')};
export function mesh(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function box(parent:T.Object3D,size:[number,number,number],material:T.Material,x=0,y=0,z=0){return mesh(new T.BoxGeometry(...size),material,parent,x,y,z);}
export function makeBike(){
  const g=new T.Group();
  const wheels:T.Group[]=[];
  for(const z of [-.87,.88]){
    const wheel=new T.Group();wheel.position.set(0,.48,z);g.add(wheel);
    const tire=mesh(new T.TorusGeometry(.43,.12,8,16),materials.black,wheel);tire.rotation.y=Math.PI/2;
    const hub=mesh(new T.CylinderGeometry(.29,.29,.15,12),materials.metal,wheel);hub.rotation.z=Math.PI/2;
    for(let a=0;a<6;a++){const spoke=box(wheel,[.13,.035,.57],materials.cream);spoke.rotation.x=a*Math.PI/3;}
    wheels.push(wheel);
  }
  const frame=box(g,[.24,.2,1.8],materials.black,0,.8,0);frame.rotation.x=.1;
  const tank=box(g,[.55,.4,.66],materials.orange,0,1.06,-.25);tank.rotation.x=-.13;
  box(g,[.44,.16,.72],materials.black,0,1.15,.43);
  box(g,[.12,.75,.12],materials.metal,-.19,.9,-.88).rotation.x=-.18;
  box(g,[.12,.75,.12],materials.metal,.19,.9,-.88).rotation.x=-.18;
  box(g,[.9,.08,.1],materials.black,0,1.34,-.87);
  const headlight=mesh(new T.CylinderGeometry(.15,.15,.12,12),materials.cream,g,0,1.15,-1.02);headlight.rotation.x=Math.PI/2;
  box(g,[.22,.22,.75],materials.metal,.34,.68,.52);
  // A tiny rider, built from primitives so every part is editable.
  const torso=box(g,[.48,.65,.35],materials.blue,0,1.61,.31);torso.rotation.x=-.27;
  const helmet=mesh(new T.SphereGeometry(.29,12,8),materials.cream,g,0,2.08,.15);
  helmet.scale.set(1,1.07,1);
  box(g,[.44,.13,.14],materials.black,0,2.08,-.08);
  for(const x of [-.3,.3]){
    const arm=box(g,[.16,.18,.65],materials.blue,x,1.53,-.27);arm.rotation.x=-.3;
    const leg=box(g,[.18,.58,.22],materials.black,x,1.0,.25);leg.rotation.x=-.38;
    box(g,[.21,.13,.35],materials.black,x,.73,.11);
  }
  return {group:g,wheels};
}
export function tree(parent:T.Object3D,x:number,z:number,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);mesh(new T.CylinderGeometry(.15,.25,1.7,5),materials.trunk,g,0,.85);for(let i=0;i<3;i++)mesh(new T.ConeGeometry(1.3-i*.26,1.9,5),i%2?materials.darkGreen:materials.green,g,0,2+i*.7);}
export function sign(parent:T.Object3D,text:string,x:number,z:number,width=4){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d')!;
  c.fillStyle='#f3e6c9';c.fillRect(0,0,768,256);c.strokeStyle='#2f5048';c.lineWidth=12;c.strokeRect(10,10,748,236);c.fillStyle='#2f5048';c.font='bold 54px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,384,128,690);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const board=new T.Mesh(new T.PlaneGeometry(width,width/3),new T.MeshStandardMaterial({map:texture,side:T.DoubleSide}));board.position.set(x,2.8,z);board.castShadow=true;parent.add(board);
  box(parent,[.14,2.6,.14],materials.wood,x-width*.34,1.3,z);box(parent,[.14,2.6,.14],materials.wood,x+width*.34,1.3,z);
}
