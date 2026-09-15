import * as THREE from "three";

// Lived-in corner beyond the lounge, against the brick pier (x −5.8, z 7.9–11.8): a walnut table with a DJ setup
// and a painter's easel in the window light. Deliberately quiet props that tell the viewer the apartment keeps going
// past the listening frame.
export function addWorkspace(scene: THREE.Scene, materials: THREE.Material[], textures: THREE.Texture[]) {
  const UP=new THREE.Vector3(0,1,0),V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const mat=(color:string,roughness=.8,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
  function place<T extends THREE.Mesh>(mesh:T,parent:THREE.Object3D,x:number,y:number,z:number){mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D)=>place(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m),parent,x,y,z);
  const cyl=(top:number,bottom:number,h:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D,segments=20)=>place(new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,segments),m),parent,x,y,z);
  const rod=(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material,parent:THREE.Object3D)=>{const mesh=cyl(r,r,a.distanceTo(b),0,0,0,m,parent,10);mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(UP,b.clone().sub(a).normalize());return mesh;};
  const flat=(w:number,h:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  function paint(w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void){const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;draw(canvas.getContext("2d")!);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);return tex;}
  let seed=911;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Props are modelled at real-world size; the loft itself is built ~1.4× (sofa seat .66, BKF ears 1.1), so each group scales up.
  const S=1.4;
  const group=(x:number,z:number,turn:number,parent:THREE.Object3D=scene,scale=1)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=turn;g.scale.setScalar(scale);parent.add(g);return g;};

  const walnut=mat("#6d4a33",.62),beech=mat("#b08a5e",.7),aluminium=mat("#77766f",.35,.6),ink=mat("#2b2d2b",.7);

  // Jute rug under the table.
  const juteTex=paint(256,256,c=>{c.fillStyle="#9a8866";c.fillRect(0,0,256,256);for(let y=0;y<256;y+=4)for(let x=0;x<256;x+=4){c.fillStyle=(x+y)%8?"#ffffff10":"#00000018";c.fillRect(x,y,3,3);}});
  juteTex.wrapS=juteTex.wrapT=THREE.RepeatWrapping;juteTex.repeat.set(4,5);
  const jute=new THREE.MeshStandardMaterial({map:juteTex,roughness:1,bumpMap:juteTex,bumpScale:.01});materials.push(jute);
  const rug=new THREE.Mesh(new THREE.BoxGeometry(2,.012,2.6),jute);rug.position.set(-4.8,.012,9.8);rug.receiveShadow=true;scene.add(rug);

  // ── DJ table on the pier wall. Local +z faces the room; top surface at y .8425.
  const TOP=.8425;
  const dj=group(-5.18,9.8,Math.PI/2,scene,S);
  box(1.2,.045,.76,0,.82,0,walnut,dj);
  for(const x of [-.54,.54])for(const z of [-.31,.31])cyl(.026,.016,.8,x,.4,z,walnut,dj,12);
  const vinyl=mat("#141412",.3,.2),plinth=mat("#3a3a37",.4,.4);
  for(const [x,label] of [[-.35,"#c4583a"],[.35,"#d8c07a"]] as const){
    box(.34,.07,.36,x,TOP+.035,-.08,plinth,dj);cyl(.14,.14,.018,x-.03,TOP+.079,-.08,aluminium,dj,40);
    cyl(.134,.134,.006,x-.03,TOP+.091,-.08,vinyl,dj,40);cyl(.046,.046,.008,x-.03,TOP+.092,-.08,mat(label,.7),dj,24);
    cyl(.02,.02,.03,x+.13,TOP+.085,-.22,aluminium,dj,12);rod(V(x+.13,TOP+.1,-.22),V(x+.05,TOP+.1,.03),.005,aluminium,dj);
    box(.016,.004,.11,x+.145,TOP+.072,.03,ink,dj);
  }
  box(.2,.07,.34,0,TOP+.035,-.08,mat("#1c1d1c",.5,.3),dj);
  const knobs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.01,.01,.014,12),aluminium,12),dummy=new THREE.Object3D();
  for(let i=0;i<12;i++){dummy.position.set(-.05+(i%3)*.05,TOP+.077,-.21+Math.floor(i/3)*.045);dummy.updateMatrix();knobs.setMatrixAt(i,dummy.matrix);}
  dj.add(knobs);
  for(const x of [-.04,.04])box(.01,.01,.012,x,TOP+.075,.04,aluminium,dj);box(.036,.01,.012,0,TOP+.075,.11,aluminium,dj);
  const led=new THREE.MeshStandardMaterial({color:"#9be07a",emissive:"#7bd35a",emissiveIntensity:1.2});materials.push(led);
  for(let i=0;i<4;i++)box(.006,.004,.01,.08,TOP+.072,-.2+i*.018,led,dj);

  // ── Painter's easel beside the window pier, angled toward the table so the canvas reads foreshortened.
  const easel=group(-4.6,7.3,1.05,scene,S);
  rod(V(-.32,0,.12),V(-.05,1.95,-.02),.018,beech,easel);rod(V(.32,0,.12),V(.05,1.95,-.02),.018,beech,easel);rod(V(0,0,-.62),V(0,1.72,-.06),.016,beech,easel);
  box(.78,.03,.09,0,.74,.1,beech,easel);box(.56,.024,.022,0,.36,.1,beech,easel);box(.1,.05,.06,0,1.68,.04,beech,easel);
  const paintingTex=paint(400,500,c=>{
    c.fillStyle="#eee6d5";c.fillRect(0,0,400,500);c.lineCap="round";
    c.strokeStyle="#9c968a55";c.lineWidth=1;c.beginPath();c.moveTo(20,300);c.lineTo(380,292);c.moveTo(250,120);c.arc(250,200,80,-Math.PI/2,Math.PI*1.4);c.stroke();
    const stroke=(color:string,x:number,y:number,len:number,width:number,tilt=0)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+len/2,y+tilt+(random()-.5)*6,x+len,y+tilt);c.stroke();};
    for(let i=0;i<220;i++){const y=30+random()*260,x=random()*360-20;if(x>300&&y>200&&random()<.6)continue;stroke(["#e7a86b99","#d9855a88","#f1c98b99","#c98f9a66"][Math.floor(random()*4)],x,y,40+random()*90,5+random()*10,(random()-.5)*8);}
    c.fillStyle="#d4673ae6";c.beginPath();c.arc(250,205,58,0,Math.PI*2);c.fill();
    for(let i=0;i<90;i++){const a=random()*Math.PI*2,r=random()*62;c.fillStyle=["#c4552fcc","#d96a3acc","#b8472acc"][i%3];c.beginPath();c.ellipse(250+Math.cos(a)*r,205+Math.sin(a)*r,9+random()*8,5,a,0,Math.PI*2);c.fill();}
    for(let i=0;i<200;i++){const y=300+random()*170,x=random()*380-30;if(x>260&&y>400)continue;stroke(["#2f5a73aa","#3f7890aa","#1f3d52aa","#7fa9b388"][Math.floor(random()*4)],x,y,50+random()*110,4+random()*9,(random()-.5)*5);}
    for(let i=0;i<14;i++)stroke("#f6e2b8cc",170+random()*150,306+i*9+random()*4,20+random()*40,2.5);
    c.fillStyle="#1f2a30";c.fillRect(92,262,5,40);c.beginPath();c.moveTo(97,264);c.lineTo(126,296);c.lineTo(97,296);c.fill();
  });
  const canvasBoard=group(0,.07,0,easel);canvasBoard.position.y=1.2;canvasBoard.rotation.x=-.07;
  box(.7,.88,.028,0,0,0,mat("#ded5c1",1),canvasBoard);
  const painting=new THREE.MeshStandardMaterial({map:paintingTex,roughness:.85});materials.push(painting);flat(.68,.86,0,0,.0145,painting,canvasBoard);
  const clothTex=paint(256,256,c=>{c.fillStyle="#d8cfbb";c.fillRect(0,0,256,256);c.strokeStyle="#b9ae9844";c.lineWidth=3;for(let i=0;i<9;i++){c.beginPath();c.moveTo(0,random()*256);c.bezierCurveTo(90,random()*256,170,random()*256,256,random()*256);c.stroke();}for(let i=0;i<70;i++){c.fillStyle=["#c4552f99","#2f5a7399","#e7a86b99"][i%3];c.beginPath();c.arc(random()*256,random()*256,1+random()*4,0,Math.PI*2);c.fill();}});
  const cloth=new THREE.MeshStandardMaterial({map:clothTex,roughness:1});materials.push(cloth);
  const drop=flat(1.1,.9,.05,.02,.1,cloth,easel);drop.rotation.set(-Math.PI/2,0,.12);drop.receiveShadow=true;
}
