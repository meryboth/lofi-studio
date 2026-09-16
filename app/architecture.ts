import * as THREE from "three";

export function addArchitecturalDetails(scene: THREE.Scene, materials: THREE.Material[], textures: THREE.Texture[]) {
  const steel=new THREE.MeshStandardMaterial({color:"#393732",metalness:.65,roughness:.55});
  const rust=new THREE.MeshStandardMaterial({color:"#694639",metalness:.3,roughness:.75});
  const linen=new THREE.MeshStandardMaterial({color:"#c4b8a3",roughness:1});
  materials.push(steel,rust,linen);
  const noise=document.createElement("canvas");noise.width=noise.height=256;const ctx=noise.getContext("2d")!;
  ctx.fillStyle="#99958b";ctx.fillRect(0,0,256,256);
  for(let i=0;i<30000;i++){ctx.fillStyle=`rgba(${i%2?"30,25,20":"240,235,225"},.045)`;ctx.fillRect((i*73.17)%256,(i*41.73)%256,2,2);}
  const surface=new THREE.CanvasTexture(noise);surface.wrapS=surface.wrapT=THREE.RepeatWrapping;surface.repeat.set(4,8);textures.push(surface);
  const concrete=new THREE.MeshStandardMaterial({color:"#a79e8d",roughness:.94,bumpMap:surface,bumpScale:.035});materials.push(concrete);
  function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
  // Full-height piers anchor the glazing and communicate the scale of the room.
  for(const z of [-4.45,7.65]){box(.36,8.4,.4,-5.66,4.2,z,concrete);box(.5,.15,.55,-5.65,.08,z,concrete);}
  box(.24,.3,12.4,-5.66,8.23,1.6,steel);
  for(const z of [-4.5,7.7])box(9.3,.23,.2,-1.3,8.23,z,steel);
  // Exposed services stay over the opaque zone rather than obscuring the skylight.
  for(const x of [3.65,4.4,5.2]){
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,14,20),rust);pipe.rotation.x=Math.PI/2;pipe.position.set(x,7.91,2.1);scene.add(pipe);
    for(let i=0;i<7;i++){const clamp=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,6,16),steel);clamp.position.set(x,7.91,-3+i*1.7);scene.add(clamp);}
  }
  // Deep stone sill below the record console.
  box(.3,.09,11.6,-5.58,.43,1.6,concrete);
  // Large restrained gallery pieces on the opaque wall, at a credible architectural scale.
  const ink=new THREE.MeshStandardMaterial({color:"#343735",roughness:.9});
  const ochre=new THREE.MeshStandardMaterial({color:"#8b6548",roughness:.9});materials.push(ink,ochre);
  const loader=new THREE.TextureLoader();
  // A printed image on a plain face: paper tone until the file in public/art loads.
  const printed=(src:string)=>{const m=new THREE.MeshStandardMaterial({color:"#e9e2d0",roughness:.85});materials.push(m);
    loader.load(src,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;textures.push(tex);m.map=tex;m.color.set("#ffffff");m.needsUpdate=true;},undefined,()=>{});return m;};
  // The first large piece is the skate print (2:3, sized to it); the second stays an abstract composition.
  {const x=-1.7,ih=2.37,iw=ih*735/1105;box(iw+.13,2.5,.06,x,3.05,-4.54,steel);box(iw,ih,.025,x,3.05,-4.49,printed("/art/skate.jpg"));}
  for(let i=1;i<2;i++){
    const x=-1.7+i*2.3;box(1.85,2.5,.06,x,3.05,-4.54,steel);box(1.72,2.37,.025,x,3.05,-4.49,linen);
    const circle=new THREE.Mesh(new THREE.CircleGeometry(.55,48),i?ochre:ink);circle.position.set(x-.12,3.28,-4.47);scene.add(circle);
    box(.65,.72,.015,x+.24,2.6,-4.465,i?ink:ochre);
  }
  // Side table and a shaded reading lamp near the leather lounge.
  // A second salon-style group on the rear brick wall.
  for(let i=0;i<3;i++){
    const x=1.65+i*1.25;
    box(1.05,1.5,.06,x,2.9+(i%2)*.35,-4.54,steel);
    box(.96,1.41,.02,x,2.9+(i%2)*.35,-4.49,linen);
    for(let j=0;j<5;j++){
      const stripe=box(.1,.85,.015,x-.32+j*.16,2.9+(i%2)*.35,-4.47,j%2?ochre:ink);
      stripe.rotation.z=.18*(i-1);
    }
  }
  const table=box(.65,.055,.65,1.4,.56,5.65,ink);for(const x of [1.16,1.64])box(.025,.53,.48,x,.28,5.65,steel);
  // Two prints leaning on the floor against the rear wall, sized to each artwork's proportions. The images live in
  // public/art (credits in README); until they load the face shows plain paper.
  for(const [i,src,w,h] of [[0,"/art/banquito-fadu.jpg",.86,1.075],[1,"/art/festival-mar-del-plata-1954.jpg",.8,1.194]] as const){
    const frame=new THREE.Group();frame.position.set(-2.95+i*1.05,.03+(h+.09)/2,-4.12);frame.rotation.x=-.13;frame.rotation.z=(i-.5)*.05;scene.add(frame);
    const border=new THREE.Mesh(new THREE.BoxGeometry(w+.09,h+.09,.07),steel);border.castShadow=true;border.receiveShadow=true;frame.add(border);
    const art=new THREE.MeshStandardMaterial({color:"#e9e2d0",roughness:.85});materials.push(art);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),art);face.position.z=.036;face.receiveShadow=true;frame.add(face);
    loader.load(src,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;textures.push(tex);art.map=tex;art.color.set("#ffffff");art.needsUpdate=true;},undefined,()=>{});
  }
  for(let stack=0;stack<3;stack++)for(let i=0;i<5;i++){
    const x=-4+stack*.46,z=-3.65+stack*.24,y=.06+i*.085;
    const pages=box(.4,.065,.3,x,y,z,linen);pages.rotation.y=i*.08;
    for(const offset of [-.036,.036]){const cover=box(.43,.008,.33,x,y+offset,z,i%2?ink:ochre);cover.rotation.y=i*.08;}
  }
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,1.45,16),steel);stem.position.set(1.4,1.3,5.65);scene.add(stem);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.21,.36,.36,40,1,true),linen);shade.position.set(1.4,2,5.65);scene.add(shade);
  const glow=new THREE.PointLight("#ffe3b2",2,4);glow.position.set(1.4,1.81,5.65);scene.add(glow);
}
