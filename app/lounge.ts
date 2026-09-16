import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function addLounge(scene: THREE.Scene, materials: THREE.Material[], textures: THREE.Texture[]) {
  const loungeStart=scene.children.length;
  const grain=document.createElement("canvas");grain.width=grain.height=256;
  const g=grain.getContext("2d")!;g.fillStyle="#888";g.fillRect(0,0,256,256);
  for(let i=0;i<14000;i++){const x=(i*73.13)%256,y=(i*31.71)%256;g.fillStyle=`rgba(25,20,16,${.05+(i%7)*.025})`;g.fillRect(x,y,1.2,.7);}
  const leatherGrain=new THREE.CanvasTexture(grain);leatherGrain.wrapS=leatherGrain.wrapT=THREE.RepeatWrapping;leatherGrain.repeat.set(6,3);textures.push(leatherGrain);
  const leather=new THREE.MeshStandardMaterial({color:"#98572e",roughness:.43,metalness:.03,bumpMap:leatherGrain,bumpScale:.008});
  const seam=new THREE.MeshStandardMaterial({color:"#502d1b",roughness:.62});
  const brass=new THREE.MeshStandardMaterial({color:"#ac8149",metalness:.65,roughness:.4});materials.push(leather,seam,brass);
  const sofa=new THREE.Group();sofa.position.set(-.8,0,5.6);sofa.rotation.y=Math.PI;scene.add(sofa);
  function rounded(w:number,h:number,d:number,x:number,y:number,z:number,m=leather,r=.07){const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;sofa.add(o);return o;}
  rounded(2.95,.32,1.12,0,.4,0);rounded(2.8,.8,.24,0,.98,-.48);
  for(let i=0;i<3;i++){rounded(.85,.23,.84,(i-1)*.89,.66,.04);rounded(.86,.014,.85,(i-1)*.89,.635,.04,seam,.005);}
  for(const x of [-1.43,1.43]){rounded(.34,.67,1.15,x,.69,0);const roll=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1.17,40),leather);roll.rotation.x=Math.PI/2;roll.position.set(x,1.02,0);roll.castShadow=true;sofa.add(roll);for(let n=0;n<11;n++){const pin=new THREE.Mesh(new THREE.SphereGeometry(.015,8,6),brass);const a=n*Math.PI/10;pin.position.set(x+Math.cos(a)*.15,1.02+Math.sin(a)*.15,.597);sofa.add(pin);}}
  // Sculpted diamond tufting: continuous leather with recessed buttons, not separate blocks.
  // Classic Chesterfield diamond tufting: 3 staggered rows of buttons TUFT apart, joined by shallow diagonal creases,
  // held in the upper back (clear of the seat) and below the rounded top edge so it never peeks over it from behind.
  const TUFT=.38,ROW=.12,CREASE=.07;
  const tuft=new THREE.PlaneGeometry(2.65,.42,400,70);const pos=tuft.attributes.position;
  // Dents fade out near the panel edges so its outline stays straight (a jagged edge casts saw-tooth shadows).
  // Creases run along the lattice diagonals: in (u,v) coordinates every button sits on even integers.
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i);const row=Math.max(0,Math.min(2,Math.round((y+.12)/ROW))),cx=(x+1.325)/TUFT-(row%2)*.5;
    const dx=(cx-Math.round(cx))*TUFT,dy=y+.12-row*ROW;
    const edge=THREE.MathUtils.smoothstep(.21-Math.abs(y),0,.06)*THREE.MathUtils.smoothstep(1.325-Math.abs(x),0,.1);
    const dent=Math.exp(-(dx*dx+dy*dy)/.0022);
    const u=(x+1.325)/(TUFT/2)+(y+.12)/ROW,v=(x+1.325)/(TUFT/2)-(y+.12)/ROW;
    const crease=Math.max(Math.exp(-Math.pow((u-2*Math.round(u/2))/CREASE,2)),Math.exp(-Math.pow((v-2*Math.round(v/2))/CREASE,2)))*THREE.MathUtils.smoothstep(.19-Math.abs(y),0,.05);
    pos.setZ(i,.035-(.025*dent+.006*crease)*edge);
  }
  tuft.computeVertexNormals();const back=new THREE.Mesh(tuft,leather);back.position.set(0,1.07,-.333);back.castShadow=false;sofa.add(back);
  const button=new THREE.SphereGeometry(.018,12,8);
  for(let row=0;row<3;row++)for(let k=1;k<7;k++){const x=-1.325+(k+(row%2)*.5)*TUFT;if(Math.abs(x)>1.2)continue;const b=new THREE.Mesh(button,seam);b.scale.z=.4;b.position.set(x,.95+row*ROW,-.345);sofa.add(b);}
  for(const x of [-1.22,1.22])for(const z of [-.36,.36])rounded(.11,.22,.11,x,.14,z,seam,.025);
  // Woven Persian-inspired rug: burgundy ground, multiple borders and repeated floral medallions.
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=768;const c=canvas.getContext("2d")!;
  c.fillStyle="#4d1422";c.fillRect(0,0,1024,768);
  for(const [inset,color] of [[12,"#b39264"],[19,"#282b31"],[40,"#a27d54"],[47,"#652337"],[90,"#c1a074"],[98,"#232a31"],[107,"#86394a"]] as const){c.fillStyle=color;c.fillRect(inset,inset,1024-inset*2,768-inset*2);}
  function flower(x:number,y:number,r:number){c.save();c.translate(x,y);for(let p=0;p<8;p++){c.rotate(Math.PI/4);c.fillStyle=p%2?"#baa077":"#344643";c.beginPath();c.ellipse(r*.52,0,r*.47,r*.17,0,0,Math.PI*2);c.fill();}c.fillStyle="#d1b78b";c.beginPath();c.arc(0,0,r*.16,0,Math.PI*2);c.fill();c.restore();}
  for(let x=64;x<1000;x+=48){flower(x,65,15);flower(x,703,15);}for(let y=112;y<690;y+=48){flower(65,y,15);flower(959,y,15);}
  for(let row=0;row<7;row++)for(let col=0;col<11;col++){flower(155+col*70+(row%2)*20,145+row*77,20);}
  c.save();c.translate(512,384);c.scale(1.2,1);for(let i=0;i<4;i++){c.fillStyle=["#d2b186","#263a3c","#bd9468","#682338"][i];c.beginPath();c.moveTo(0,-195+i*19);c.lineTo(150-i*16,0);c.lineTo(0,195-i*19);c.lineTo(-150+i*16,0);c.closePath();c.fill();}flower(0,0,70);c.restore();
  for(let i=0;i<768;i+=2){c.fillStyle=i%4?"#ffffff09":"#00000012";c.fillRect(0,i,1024,1);}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;textures.push(tex);
  const rugMat=new THREE.MeshStandardMaterial({map:tex,roughness:1,bumpMap:tex,bumpScale:.009});materials.push(rugMat);
  const rug=new THREE.Mesh(new THREE.BoxGeometry(4.4,.025,4.5),rugMat);rug.position.set(-.8,.035,4);rug.receiveShadow=true;scene.add(rug);
  // Two matching leather armchairs face the sofa across the centered rug.
  function chairPart(parent:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,m=leather){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,.055),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  }
  // BKF (Hardoy, 1938): two bent steel rods crossing in an X, a hide sling hung from four corner pockets.
  const bkfLeather=leather.clone();bkfLeather.side=THREE.DoubleSide;bkfLeather.color.set('#b47643');bkfLeather.roughness=.62;
  const bkfHem=new THREE.MeshStandardMaterial({color:'#7a4a28',roughness:.66,bumpMap:leatherGrain,bumpScale:.004});
  const bkfSteel=new THREE.MeshStandardMaterial({color:'#222320',metalness:.7,roughness:.4});materials.push(bkfLeather,bkfHem,bkfSteel);
  // Right-hand frame points; the left side mirrors x. Front ears sit low and forward, rear ears high and back.
  const frontEar=new THREE.Vector3(.41,.72,.42),rearEar=new THREE.Vector3(.44,1.1,-.42);
  const frontFoot=new THREE.Vector3(.41,.015,.37),rearFoot=new THREE.Vector3(.43,.015,-.37);
  const sideCurve=new THREE.CatmullRomCurve3([frontEar,new THREE.Vector3(.34,.5,.04),rearEar]);
  const centerCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.6,.37),new THREE.Vector3(0,.35,.15),new THREE.Vector3(0,.41,-.12),new THREE.Vector3(0,1.02,-.39)]);
  const slingPoint=(u:number,v:number)=>{const side=sideCurve.getPoint(v),mid=centerCurve.getPoint(v),s=1-u*u;return new THREE.Vector3(u*side.x,THREE.MathUtils.lerp(side.y,mid.y,s),THREE.MathUtils.lerp(side.z,mid.z,s));};
  const mirror=(p:THREE.Vector3,sx:number)=>new THREE.Vector3(p.x*sx,p.y,p.z);
  // Polyline with each corner rounded by a quadratic bend, like cold-bent rod.
  function bentRod(points:THREE.Vector3[],bend:number){
    const path=new THREE.CurvePath<THREE.Vector3>();let start=points[0];
    for(let i=1;i<points.length-1;i++){const p=points[i],a=points[i-1],b=points[i+1];const r=Math.min(bend,p.distanceTo(a)*.45,p.distanceTo(b)*.45);
      const enter=p.clone().add(a.clone().sub(p).setLength(r)),exit=p.clone().add(b.clone().sub(p).setLength(r));
      if(start.distanceTo(enter)>1e-4)path.add(new THREE.LineCurve3(start,enter));path.add(new THREE.QuadraticBezierCurve3(enter,p,exit));start=exit;}
    path.add(new THREE.LineCurve3(start,points[points.length-1]));return path;
  }
  const W=48,H=48;
  // Rounded leather cap that swallows each rod tip; shared by all eight pockets.
  const pocketShape=new THREE.LatheGeometry([[.028,-.035],[.026,-.01],[.021,.018],[.016,.034],[.008,.043],[0,.046]].map(([r,y])=>new THREE.Vector2(r,y)),18);
  const chairs:THREE.Group[]=[];
  for(const [x,turn] of [[-1.75,.22],[.15,-.22]]){
    // Lifted onto the rug's top face (y .0475) so the floor bars are not buried in the pile.
    const chair=new THREE.Group();chair.position.set(x,.048,2.45);chair.rotation.y=turn;scene.add(chair);chairs.push(chair);
    const sling=new THREE.PlaneGeometry(2,1,W,H),vertices=sling.attributes.position;
    for(let i=0;i<vertices.count;i++){const p=slingPoint(vertices.getX(i),vertices.getY(i)+.5);vertices.setXYZ(i,p.x,p.y,p.z);}
    sling.computeVertexNormals();
    // Tension folds radiate from the four pockets; a soft crease where the seat breaks into the back.
    const normals=sling.attributes.normal;
    for(let iy=0;iy<=H;iy++)for(let ix=0;ix<=W;ix++){
      const i=iy*(W+1)+ix,u=-1+2*ix/W,v=1-iy/H;let fold=Math.sin(u*Math.PI*3)*Math.exp(-Math.pow((v-.3)/.08,2))*.005*(1-u*u);
      for(const [cu,cv] of [[-1,0],[1,0],[-1,1],[1,1]]){const du=u-cu,dv=(v-cv)*1.6,d=Math.hypot(du,dv);fold+=Math.sin(Math.atan2(dv,du)*9+cu*2+cv*3)*Math.exp(-d*4.5)*Math.min(d*6,1)*.014;}
      vertices.setXYZ(i,vertices.getX(i)+normals.getX(i)*fold,vertices.getY(i)+normals.getY(i)*fold,vertices.getZ(i)+normals.getZ(i)*fold);
    }
    sling.computeVertexNormals();const seat=new THREE.Mesh(sling,bkfLeather);seat.castShadow=true;seat.receiveShadow=true;chair.add(seat);
    const tube=(curve:THREE.Curve<THREE.Vector3>,segments:number,radius:number,material:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,10,false),material);mesh.castShadow=true;mesh.receiveShadow=true;chair.add(mesh);return mesh;};
    // Folded hem follows the displaced edge vertices so it never floats off the hide.
    const vertex=(ix:number,iy:number)=>new THREE.Vector3().fromBufferAttribute(vertices,iy*(W+1)+ix);
    const edges=[Array.from({length:W/2+1},(_,n)=>vertex(n*2,0)),Array.from({length:W/2+1},(_,n)=>vertex(n*2,H)),Array.from({length:H/2+1},(_,n)=>vertex(0,n*2)),Array.from({length:H/2+1},(_,n)=>vertex(W,n*2))];
    for(const edge of edges)tube(new THREE.CatmullRomCurve3(edge),60,.011,bkfHem);
    for(const sx of [-1,1]){
      for(const [ear,foot] of [[frontEar,rearFoot],[rearEar,frontFoot]]){
        const top=mirror(ear,sx),dir=top.clone().sub(mirror(foot,sx)).normalize();
        const pocket=new THREE.Mesh(pocketShape,bkfHem);pocket.position.copy(top).addScaledVector(dir,.025);pocket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);pocket.castShadow=true;chair.add(pocket);
      }
    }
    // Each rod: ear → diagonal leg to the opposite foot → arched floor bar → leg → ear. Side views cross in an X.
    for(const [ear,foot,z] of [[rearEar,frontFoot,.45],[frontEar,rearFoot,-.45]] as const){
      const tip=(sx:number)=>mirror(ear,sx).addScaledVector(mirror(ear,sx).sub(mirror(foot,sx)).normalize(),.05);
      tube(bentRod([tip(-1),mirror(foot,-1),new THREE.Vector3(-.32,.02,z),new THREE.Vector3(0,.12,z),new THREE.Vector3(.32,.02,z),foot,tip(1)],.06),220,.014,bkfSteel);
    }
  }
  // Slim arched floor lamp with an opal globe.
  const metal=new THREE.MeshStandardMaterial({color:'#292823',metalness:.8,roughness:.3});
  const opal=new THREE.MeshStandardMaterial({color:'#fff1d4',emissive:'#ffcb82',emissiveIntensity:.7,roughness:.35});materials.push(metal,opal);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.3,.33,.075,40),metal);base.position.set(1.2,.08,5.9);scene.add(base);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(1.2,.1,5.9),new THREE.Vector3(1.2,1.8,5.9),new THREE.Vector3(.95,2.4,5.65),new THREE.Vector3(.35,2.45,5.35)]);
  const arc=new THREE.Mesh(new THREE.TubeGeometry(curve,40,.022,8,false),metal);scene.add(arc);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(.18,32,20),opal);globe.position.copy(curve.getPoint(1));scene.add(globe);
  const lamp=new THREE.PointLight('#ffd8a1',3,5);lamp.position.copy(globe.position);scene.add(lamp);
  // Art books: paper blocks between thin covers, stacked with slight offsets.
  const paper=new THREE.MeshStandardMaterial({color:'#d5cbb5',roughness:1});materials.push(paper);
  const covers=['#323e3b','#a44832','#c1a36b'].map(color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85});materials.push(m);return m;});
  for(let stack=0;stack<2;stack++)for(let i=0;i<4;i++){
    const book=new THREE.Group();book.position.set(-2.6+stack*.48,.065+i*.072,5.8+stack*.38);book.rotation.y=(i%3-1)*.12;scene.add(book);
    chairPart(book,.42,.054,.32,0,0,0,paper);
    for(const y of [-.031,.031]){const cover=new THREE.Mesh(new THREE.BoxGeometry(.45,.009,.34),covers[(i+stack)%3]);cover.position.y=y;cover.castShadow=true;book.add(cover);}
  }
  const loungeObjects=scene.children.slice(loungeStart);
  const living=new THREE.Group();scene.add(living);loungeObjects.forEach(o=>living.add(o));living.position.z=-2.4;
  return { sofa, chairs };
}
