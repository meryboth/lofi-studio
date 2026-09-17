import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Things that roll: a skateboard leaning on the record console and a silver single-speed hung on hooks on the rear brick
// wall. Both are modelled in metres; the board is scaled ×1.4 like the other props (the loft is built ~1.4×) and the bike
// a little more so it holds its own on the tall brick wall.
export function addRides(scene: THREE.Scene, materials: THREE.Material[], textures: THREE.Texture[], renderer: THREE.WebGLRenderer) {
  const S=1.4,BIKE=1.7,up=new THREE.Vector3(0,1,0),V=(x:number,y:number,z=0)=>new THREE.Vector3(x,y,z);
  const mat=(color:string,roughness=.6,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
  // The room has no environment map, so bare metal reads flat grey; the metal parts get a soft studio reflection instead.
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),reflections=pmrem.fromScene(room,.04).texture;
  room.dispose();pmrem.dispose();textures.push(reflections);
  const metal=(color:string,roughness:number,intensity:number,anisotropy=0)=>{const m=new THREE.MeshPhysicalMaterial({color,roughness,metalness:1,envMap:reflections,envMapIntensity:intensity,anisotropy,anisotropyRotation:Math.PI/2});materials.push(m);return m;};
  // Brushed aluminium frame and bars, polished rims and chainring, darker steel for the chain and axles.
  const silver=metal("#9da3aa",.34,.5,.8),chrome=metal("#c4c8cc",.16,.6),steel=metal("#6f7377",.4,.45),black=mat("#1d1d1e",.5,.15),rubber=mat("#141414",.9),cream=mat("#e8c45e",.55);
  function mesh(geometry:THREE.BufferGeometry,m:THREE.Material|THREE.Material[],parent:THREE.Object3D,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function tube(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material,parent:THREE.Object3D){const d=b.clone().sub(a),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),12),m,parent);o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(up,d.normalize());return o;}
  const alongZ=(o:THREE.Object3D)=>{o.rotation.x=Math.PI/2;return o;};

  // ── Bike, drawn in its own plane (x forward, y up); the wall is behind at local z −.257.
  const bike=new THREE.Group();bike.position.set(-4.15,3.15,-4.6+.257*BIKE);bike.scale.setScalar(BIKE);scene.add(bike);
  const R=V(-.5,0),F=V(.52,0),BB=V(-.08,-.07),ST=V(-.21,.5),HT=V(.36,.52),HB=V(.39,.37);
  tube(ST,HT,.016,silver,bike);tube(BB,HB,.02,silver,bike);tube(BB,ST,.016,silver,bike);tube(HB,HT.clone().add(V(-.005,.03)),.022,silver,bike);
  for(const s of [-1,1]){
    tube(V(BB.x,BB.y,s*.03),V(R.x,R.y,s*.06),.009,silver,bike);
    tube(V(ST.x-.015,ST.y-.03,s*.02),V(R.x,R.y,s*.06),.008,silver,bike);
    tube(V(HB.x,HB.y,s*.03),V(F.x,F.y,s*.05),.011,black,bike);
  }
  mesh(new THREE.BoxGeometry(.05,.03,.1),black,bike,HB.x,HB.y,0);
  // Stem, flat bar with black grips, a brake lever and its cable.
  const bar=V(.43,.585);tube(HT,bar,.014,silver,bike);
  tube(V(bar.x,bar.y,-.25),V(bar.x,bar.y,.25),.012,silver,bike);
  for(const s of [-1,1])tube(V(bar.x,bar.y,s*.17),V(bar.x,bar.y,s*.26),.018,black,bike);
  tube(V(bar.x,bar.y,.15),V(bar.x+.08,bar.y-.03,.19),.005,steel,bike);
  const cable=new THREE.CatmullRomCurve3([V(bar.x,bar.y,.14),V(bar.x-.06,bar.y+.1,.1),V(HT.x-.05,HT.y+.08,.02),V(HB.x+.02,HB.y-.02,.03)]);
  mesh(new THREE.TubeGeometry(cable,24,.004,6),black,bike);
  // Seatpost and a slim black saddle.
  tube(ST,V(-.235,.6),.013,silver,bike);
  const saddle=mesh(new THREE.SphereGeometry(1,20,12),black,bike,-.25,.625,0);saddle.scale.set(.13,.028,.07);
  const nose=mesh(new THREE.SphereGeometry(1,16,10),black,bike,-.15,.628,0);nose.scale.set(.07,.02,.025);
  // Wheels: tyre, polished rim, hub and wire spokes (one LineSegments per wheel).
  const spokeMaterial=new THREE.LineBasicMaterial({color:"#9ea3a8"});materials.push(spokeMaterial);
  for(const c of [R,F]){
    const w=new THREE.Group();w.position.copy(c);bike.add(w);
    mesh(new THREE.TorusGeometry(.335,.017,10,64),rubber,w);mesh(new THREE.TorusGeometry(.316,.011,8,64),chrome,w);
    alongZ(mesh(new THREE.CylinderGeometry(.02,.02,.1,14),chrome,w));
    const points:THREE.Vector3[]=[];
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2,side=i%2?.035:-.035;points.push(V(Math.cos(a+.3)*.02,Math.sin(a+.3)*.02,side),V(Math.cos(a)*.31,Math.sin(a)*.31,0));}
    w.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),spokeMaterial));
  }
  // Drivetrain: chainring, cog, chain runs, cranks and pedals.
  mesh(new THREE.TorusGeometry(.09,.006,6,40),chrome,bike,BB.x,BB.y,.045);
  alongZ(mesh(new THREE.CylinderGeometry(.075,.075,.004,24),steel,bike,BB.x,BB.y,.045));
  mesh(new THREE.TorusGeometry(.034,.005,6,24),steel,bike,R.x,R.y,.045);
  tube(V(BB.x,BB.y+.09,.045),V(R.x,R.y+.034,.045),.004,steel,bike);tube(V(BB.x,BB.y-.09,.045),V(R.x,R.y-.034,.045),.004,steel,bike);
  for(const [s,a] of [[1,-1.1],[-1,2.04]] as const){
    const end=V(BB.x+Math.cos(a)*.165,BB.y+Math.sin(a)*.165,s*.07);
    tube(V(BB.x,BB.y,s*.055),end,.009,chrome,bike);
    mesh(new THREE.BoxGeometry(.09,.018,.07),black,bike,end.x,end.y,end.z+s*.035);
  }
  // Two wall hooks under the top tube.
  for(const x of [-.02,.22]){const y=ST.y+(HT.y-ST.y)*(x-ST.x)/(HT.x-ST.x)-.025;tube(V(x,y,-.257),V(x,y,.03),.007,black,bike);tube(V(x,y,.03),V(x,y+.04,.03),.007,black,bike);mesh(new THREE.BoxGeometry(.04,.06,.01),black,bike,x,y,-.252);}

  // ── Skateboard, modelled lying flat (x along the deck, grip up), then stood on its tail against the record shelves.
  // The deck is three bent stadium-shaped sheets: printed underside (public/art/skate-deck.webp, a portrait image whose
  // alpha already follows the outline), a wood core that shows as the edge, and black grip tape on top.
  // Drawn a bit larger than life (×1.9) so it stands taller than the 1.26 console top.
  const SKATE=1.9,L=.8,W=.205,FLAT=.2,KICK=.26;
  function sheet(offset:number,grow:number,round:boolean){
    const geometry=new THREE.PlaneGeometry(W*grow,L*grow,6,64),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const across=p.getX(i),along=p.getY(i),end=Math.abs(along)-(L*grow/2-W*grow/2);
      // Round the ends for the plain sheets (the print carries its own outline in alpha).
      const width=round&&end>0?Math.sqrt(Math.max(0,1-(end/(W*grow/2))**2)):1;
      const lift=Math.max(0,Math.abs(along)-FLAT)*Math.tan(KICK);
      p.setXYZ(i,along,offset+lift,-across*width);   // mirrored so the print reads right way round from the room
    }
    geometry.computeVertexNormals();return geometry;
  }
  const deckTexture=new THREE.TextureLoader().load("/art/skate-deck.webp");deckTexture.colorSpace=THREE.SRGBColorSpace;deckTexture.anisotropy=8;textures.push(deckTexture);
  const print=new THREE.MeshStandardMaterial({map:deckTexture,alphaTest:.5,roughness:.45,side:THREE.DoubleSide});
  const wood=new THREE.MeshStandardMaterial({color:"#c9a06a",roughness:.7,side:THREE.DoubleSide});
  const grip=new THREE.MeshStandardMaterial({color:"#1c1c1e",roughness:.95,side:THREE.DoubleSide});
  materials.push(print,wood,grip);
  const skate=new THREE.Group(),board=new THREE.Group();skate.add(board);board.scale.setScalar(SKATE);scene.add(skate);
  mesh(sheet(-.006,1,false),print,board);mesh(sheet(0,1.012,true),wood,board);mesh(sheet(.006,1,true),grip,board);
  for(const s of [-1,1]){
    // Truck: baseplate, hanger, axle and two wheels.
    mesh(new THREE.BoxGeometry(.06,.012,.05),steel,board,s*.21,-.012,0);
    mesh(new THREE.BoxGeometry(.03,.03,.16),silver,board,s*.21,-.036,0);
    alongZ(mesh(new THREE.CylinderGeometry(.004,.004,.21,8),steel,board,s*.21,-.05,0));
    for(const z of [-.09,.09])alongZ(mesh(new THREE.CylinderGeometry(.027,.027,.032,18),cream,board,s*.21,-.05,z));
  }
  // Leaning back onto the front edge of the console top (x −3.96, y 1.26) so the upper nose clears the furniture,
  // wheels toward the room, centred on a record bay clear of the speaker. Local (along, rise) maps to world
  // (−along·sin − rise·cos, along·cos − rise·sin) for a board rotated π/2 + tilt about z.
  const tilt=.2,c=Math.cos(tilt),s=Math.sin(tilt),EDGE_X=-3.96,EDGE_Y=1.26;
  const tip=(L/2-FLAT)*Math.tan(KICK)+.006,y0=SKATE*(L/2*c+tip*s)+.005;
  const along=((EDGE_Y-y0)/SKATE+.006*s)/c,rise=.006+Math.max(0,along-FLAT)*Math.tan(KICK);
  skate.rotation.z=Math.PI/2+tilt;
  skate.position.set(EDGE_X+SKATE*(along*s+rise*c),y0,-1.1);
}
