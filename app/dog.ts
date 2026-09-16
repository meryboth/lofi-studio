import * as THREE from "three";

type Frame = { playing: boolean; beat: number };
type Kind = "look" | "tilt" | "ear" | "yawn" | "stretch" | "settle";
type Action = { kind: Kind; start: number; length: number; side: number };
type Spot = { pos: THREE.Vector3; quat: THREE.Quaternion };
type Leg = { kind: "hop" | "trot"; from: Spot; to: Spot; duration: number; height: number };
type Perch = "chair" | "sofa";
export type Sheet = { base: string; frames?: Record<string, string> };
export type DogSprites = { sleep: Sheet; rest: Sheet; walk?: string[] };
const LENGTHS: Record<Kind, number> = { look: 5, tilt: 2.2, ear: 1.1, yawn: 2.4, stretch: 3, settle: 2.6 };
const SOFA_YAW = -.64;    // sofa-local turn: three-quarter view from the listening camera (world yaw ≈ 2.5)
const SIZE = 1.25;        // modelled at real terrier size; the loft is built ~1.4×

// Jack Russell terrier that lives in the lounge. Built from primitives like the rest of the loft and animated by hand,
// lo-fi-video style: it always breathes and blinks and picks a small idle action every 10–25 s (look at the window, tilt,
// ear flick, yawn, stretch, resettle). It naps curled in the far BKF; a few seconds after the music starts it gets up,
// hops down, trots over and jumps onto the Chesterfield, where it wags and perks up on strong beats. When the music has
// been off for a while it walks back to its chair and dozes off, head on its paws.
export function addDog(scene: THREE.Scene, materials: THREE.Material[], textures: THREE.Texture[], perches: { chair: THREE.Object3D; sofa: THREE.Object3D }, sprites?: DogSprites) {
  const mat=(color:string,roughness=.92)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const white=mat("#f1ebdf"),tan=mat("#b7743f"),brown=mat("#4a2e20"),dark=mat("#171412",.35),collar=mat("#b5402d",.6),brass=mat("#c9a15a",.35);
  const pivot=(p:THREE.Object3D,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;};
  function mesh(geometry:THREE.BufferGeometry,m:THREE.Material,p:THREE.Object3D,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  const ball=(r:number,m:THREE.Material,p:THREE.Object3D,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,20,14),m,p,x,y,z);o.scale.set(sx,sy,sz);return o;};
  const yaw=(angle:number)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle);

  // Resting spots in world space: curled in the chair's sling, lying on the middle sofa cushion, and a floor point in front of each.
  perches.chair.updateWorldMatrix(true,false);perches.sofa.updateWorldMatrix(true,false);
  const spot=(o:THREE.Object3D,x:number,y:number,z:number,local:THREE.Quaternion):Spot=>({pos:o.localToWorld(new THREE.Vector3(x,y,z)),quat:o.getWorldQuaternion(new THREE.Quaternion()).multiply(local)});
  const floor=(o:THREE.Object3D,x:number,z:number)=>{const p=o.localToWorld(new THREE.Vector3(x,0,z));p.y=.048;return p;};
  const spots:Record<Perch,Spot>={
    // Across the flattest part of the sling, facing the room; front legs tucked so nothing pokes through the leather.
    chair:spot(perches.chair,0,.43,.06,yaw(Math.PI/2)),
    sofa:spot(perches.sofa,0,.775,.02,yaw(SOFA_YAW)),
  };
  const floors:Record<Perch,THREE.Vector3>={chair:floor(perches.chair,.1,.8),sofa:floor(perches.sofa,0,.95)};

  const dog=new THREE.Group();scene.add(dog);dog.position.copy(spots.chair.pos);dog.quaternion.copy(spots.chair.quat);dog.scale.setScalar(SIZE);
  const body=pivot(dog);
  ball(.1,white,body,0,.1,.02,1,.95,1.7);
  ball(.05,tan,body,-.05,.17,.06,1,.4,1.3);
  // Hindquarters curl to one side while lying; saddle patch, hind legs that fold under or stand, and a short tail.
  const hips=pivot(body,0,0,-.17);
  ball(.105,white,hips,.02,.1,-.04,1.05,.95,1.1);
  ball(.07,tan,hips,.03,.165,-.05,1.15,.45,1.2);
  const hind=[-1,1].map(s=>{const leg=pivot(hips,s*.085,.06,-.02);mesh(new THREE.CapsuleGeometry(.03,.135,6,12),white,leg,0,0,.0675).rotation.x=Math.PI/2;ball(.026,white,leg,0,-.005,.145,1,.75,1.25);return leg;});
  const tail=pivot(hips,0,.145,-.13);tail.rotation.order="YXZ";
  mesh(new THREE.CylinderGeometry(.012,.022,.11,10),white,tail,0,.05,0);ball(.013,tan,tail,0,.105,0);
  // Front legs: stretched forward when lying, swung down to stand and trot.
  const legs=pivot(body,0,0,.14);
  const front=[-1,1].map(s=>{const leg=pivot(legs,s*.055,.035,0);mesh(new THREE.CapsuleGeometry(.028,.12,6,12),white,leg,0,0,.06).rotation.x=Math.PI/2;ball(.03,white,leg,0,-.005,.14,1,.7,1.25);return leg;});
  // Neck with a red collar and brass tag.
  const neck=pivot(body,0,.15,.14);
  ball(.07,white,neck,0,-.01,0,1,1,1.1);
  mesh(new THREE.TorusGeometry(.066,.011,8,24),collar,neck,0,-.005,.01).rotation.x=Math.PI/2-.3;
  ball(.012,brass,neck,0,-.072,.052,1,1,.4);
  // Head: tan skull with a white blaze and muzzle, dark patch round one eye, folded ears, hinged jaw.
  const head=pivot(neck,0,.05,.05);head.rotation.order="YXZ";
  ball(.075,tan,head,0,.045,0,1,.9,1.05);
  ball(.028,white,head,0,.07,.062,.3,.9,.5);
  ball(.03,brown,head,.035,.064,.058,1,.8,.6);
  mesh(new THREE.CylinderGeometry(.03,.042,.09,16),white,head,0,.02,.09).rotation.x=Math.PI/2;
  ball(.03,white,head,0,.02,.135,1,.95,.7);
  ball(.016,dark,head,0,.036,.158,1.2,.9,1);
  const jaw=pivot(head,0,-.005,.05);
  ball(.028,white,jaw,0,-.008,.045,1,.5,1.5);
  const eyes=[-1,1].map(s=>ball(.011,dark,head,s*.034,.062,.075));
  // Ears root on the skull surface and fold forward and outward, JRT-style.
  const ears=[-1,1].map(s=>{const e=pivot(head,s*.055,.093,0);const flap=ball(.04,brown,e,s*.012,-.022,.012,.35,1,.8);flap.rotation.set(.3,0,s*.35);return e;});

  // 2D mode: illustrated sprites (bottom-centre anchored) replace the rig's look. Each sheet is a base drawing plus
  // inpainted variants of it; all of a sheet's images share one alpha-trimmed crop so swapping them never shifts the dog.
  // The rig keeps running unseen so timings, trips and moods stay the same.
  function illustration(sheet:Sheet,width:number,sink:number,at:THREE.Vector3){
    const material=new THREE.SpriteMaterial({transparent:true,alphaTest:.05,depthWrite:false,opacity:0});materials.push(material);
    const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.visible=false;scene.add(sprite);
    sprite.position.copy(at);sprite.position.y-=sink;
    const looks:Record<string,THREE.Texture>={},names=["base",...Object.keys(sheet.frames??{})],srcs=[sheet.base,...Object.values(sheet.frames??{})];
    const load=(src:string)=>new Promise<HTMLImageElement|null>(done=>{const image=new Image();image.onload=()=>done(image);image.onerror=()=>done(null);image.src=src;});
    Promise.all(srcs.map(load)).then(images=>{
      if(!images[0])return;
      const {width:iw,height:ih}=images[0];
      let x0=iw,y0=ih,x1=0,y1=0;
      const probe=document.createElement("canvas");probe.width=iw;probe.height=ih;const pc=probe.getContext("2d",{willReadFrequently:true})!;
      for(const image of images){
        if(!image)continue;
        pc.clearRect(0,0,iw,ih);pc.drawImage(image,0,0,iw,ih);
        const alpha=pc.getImageData(0,0,iw,ih).data;
        for(let y=0;y<ih;y+=2)for(let x=0;x<iw;x+=2)if(alpha[(y*iw+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      }
      const w=Math.max(1,x1-x0+2),h=Math.max(1,y1-y0+2);
      images.forEach((image,i)=>{
        if(!image)return;
        const out=document.createElement("canvas");out.width=w;out.height=h;
        out.getContext("2d")!.drawImage(image,x0*image.width/iw,y0*image.height/ih,w*image.width/iw,h*image.height/ih,0,0,w,h);
        const tex=new THREE.CanvasTexture(out);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);looks[names[i]]=tex;
      });
      material.map=looks.base;material.needsUpdate=true;
      sprite.scale.set(width,width*h/w,1);sprite.userData.height=width*h/w;sprite.visible=true;
    });
    return {sprite,material,baseY:sprite.position.y,looks,
      has:(name:string)=>name==="base"||name in looks,
      show(name:string){const tex=looks[name]??looks.base;if(tex&&material.map!==tex)material.map=tex;}};
  }
  const flats=sprites?{chair:illustration(sprites.sleep,.66,.07,spots.chair.pos),sofa:illustration(sprites.rest,.76,.02,spots.sofa.pos)}:null;
  const walker=sprites?.walk?illustration({base:sprites.walk[0],frames:sprites.walk[1]?{step:sprites.walk[1]}:{}},.7,0,floors.chair):null;
  if(flats)body.visible=false;
  // The walk drawing faces left; flip it when the dog crosses the screen to the right. Camera right comes from the last render.
  const cameraRight=new THREE.Vector3(1,0,0),lastPos=new THREE.Vector3(),heading=new THREE.Vector3();let facingRight=false;
  if(walker)walker.sprite.onBeforeRender=(_r,_s,camera)=>{cameraRight.set(1,0,0).applyQuaternion(camera.quaternion);};

  // Short sprite clips per perch: [look, seconds] steps. Only clips whose drawings loaded are played.
  const CLIPS:Record<Perch,Record<string,[string,number][]>>={
    sofa:{ear:[["ear",.35],["base",.25],["ear",.6]],doze:[["blink",1.8]],
      wag:[["tail2",.12],["tail",.2],["tail2",.12],["base",.16],["tail2",.12],["tail",.2],["tail2",.12],["base",.16],["tail2",.12],["tail",.22],["tail2",.12]]},
    chair:{peek:[["peek",.25],["base",.12],["peek",2]]},
  };
  let clip:{steps:[string,number][];start:number}|null=null,nextClip=6,nextBlink=3,lastBeat=0;
  const fades={chair:1,sofa:0,walk:0},day=new THREE.Color(0xf4ece2),night=new THREE.Color(0xc99a92);let dusk=0;
  function drawFlats(time:number,dt:number,breath:number,beat:number,moving:boolean,playing:boolean,trotting:boolean){
    if(!flats)return;
    // Sprites are unlit: tint them toward the dim, warm room light while music plays.
    dusk+=((playing?1:0)-dusk)*Math.min(1,dt*.8);
    const sheet=flats[perch],steps=(name:string)=>CLIPS[perch][name];
    const ready=(name:string)=>!!steps(name)?.every(([look])=>sheet.has(look));
    if(moving)clip=null;
    else if(!clip){
      const beatHit=playing&&beat>.8&&lastBeat<=.8&&Math.random()<.2&&ready("wag");
      if(beatHit||time>nextClip){
        const pool=Object.keys(CLIPS[perch]).filter(ready);
        const name=beatHit?"wag":pool[Math.floor(Math.random()*pool.length)];
        if(name)clip={steps:steps(name),start:time};
        nextClip=time+8+Math.random()*10;
      }
    }
    lastBeat=beat;
    let look="base";
    if(clip){
      let t=time-clip.start,i=0;
      while(i<clip.steps.length&&t>clip.steps[i][1]){t-=clip.steps[i][1];i++;}
      if(i<clip.steps.length)look=clip.steps[i][0];else clip=null;
    }else if(perch==="sofa"&&sheet.has("blink")){
      if(time>nextBlink+.14)nextBlink=time+2.5+Math.random()*4;
      if(time>nextBlink)look="blink";
    }
    sheet.show(look);
    for(const key of ["chair","sofa"] as const){
      const f=flats[key];if(!f.sprite.userData.height)continue;
      fades[key]+=(((perch===key&&!moving)?1:0)-fades[key])*Math.min(1,dt*(moving?8:4));
      f.material.opacity=fades[key];f.material.color.copy(day).lerp(night,dusk);
      f.sprite.scale.y=f.sprite.userData.height*(1+breath*.012);
      f.sprite.position.y=f.baseY+(key==="sofa"?beat*.012:0);
    }
    if(!walker?.sprite.userData.height)return;
    // Walking: the walk drawing follows the (hidden) rig, bobs with the gait and alternates legs if a second drawing exists.
    fades.walk+=((moving?1:0)-fades.walk)*Math.min(1,dt*8);
    const w=walker.sprite,tex=walker.looks.base;
    w.material.opacity=fades.walk;w.material.color.copy(day).lerp(night,dusk);
    heading.subVectors(dog.position,lastPos);heading.y=0;lastPos.copy(dog.position);
    if(moving&&heading.lengthSq()>1e-7)facingRight=heading.dot(cameraRight)>0;
    walker.show(trotting&&Math.sin(gait)>0?"step":"base");
    for(const t of Object.values(walker.looks)){t.repeat.x=facingRight?-1:1;t.offset.x=facingRight?1:0;}
    w.position.copy(dog.position);w.position.y+=trotting?Math.abs(Math.sin(gait))*.025:0;
    w.visible=fades.walk>.01&&!!tex;
  }

  let perch:Perch="chair",trip:{to:Perch;start:number;legs:Leg[]}|null=null;
  let nextAction=5+Math.random()*6,action:Action|null=null,blinkAt=1.5,blinkUntil=0,playing=0,quiet=0,sleep=0,tailPhase=0,gait=0,tuck=1,lookYaw:number|null=null;
  const pose={hx:.05,hy:0,hz:0,jaw:0,legZ:0,earL:0,earR:0,hips:.45};
  const bump=(p:number)=>p<=0||p>=1?0:Math.pow(Math.sin(Math.PI*p),.6);
  const smooth=THREE.MathUtils.smoothstep;

  function startTrip(to:Perch,time:number){
    const from:Perch=to==="sofa"?"chair":"sofa",a=floors[from],b=floors[to],heading=yaw(Math.atan2(b.x-a.x,b.z-a.z));
    const A={pos:a,quat:heading},B={pos:b,quat:heading};
    trip={to,start:time,legs:[
      {kind:"hop",from:spots[from],to:A,duration:.8,height:.3},
      {kind:"trot",from:A,to:B,duration:Math.max(.6,a.distanceTo(b)/1.4),height:0},
      {kind:"hop",from:B,to:spots[to],duration:.9,height:.35},
    ]};
    action=null;sleep=0;
  }

  function update(time:number,dt:number,frame:Frame,reduce:boolean){
    playing=frame.playing?playing+dt:0;quiet=frame.playing?0:quiet+dt;
    const wants:Perch|null=perch==="chair"&&playing>3.8?"sofa":perch==="sofa"&&quiet>6?"chair":null;
    if(reduce){
      if(wants){perch=wants;dog.position.copy(spots[perch].pos);dog.quaternion.copy(spots[perch].quat);}
      legs.rotation.set(0,perch==="chair"?Math.PI:0,0);
      const b=Math.sin(time*1.6);body.scale.set(1+b*.012,1+b*.025,1);
      drawFlats(time,1,0,0,false,frame.playing,false);
      return;
    }
    if(wants&&!trip)startTrip(wants,time);

    // Travel: hop down, trot across, hop up — standing pose blends in and out at the ends.
    let stand=0,swing=0,pitch=0;
    if(trip){
      let t=time-trip.start,i=0;
      while(i<trip.legs.length&&t>trip.legs[i].duration){t-=trip.legs[i].duration;i++;}
      if(i>=trip.legs.length){
        perch=trip.to;dog.position.copy(spots[perch].pos);dog.quaternion.copy(spots[perch].quat);
        trip=null;lookYaw=null;nextAction=time+8+Math.random()*6;
      }else{
        const leg=trip.legs[i],p=Math.min(1,t/leg.duration),last=trip.legs.length-1;
        if(leg.kind==="hop"){
          const e=p*p*(3-2*p);
          dog.position.lerpVectors(leg.from.pos,leg.to.pos,e);dog.position.y+=Math.sin(Math.PI*p)*leg.height;
          dog.quaternion.slerpQuaternions(leg.from.quat,leg.to.quat,e);
          pitch=-.3*Math.sin(Math.PI*2*p);
        }else{
          dog.position.lerpVectors(leg.from.pos,leg.to.pos,p);dog.quaternion.copy(leg.to.quat);
          gait+=dt*11;swing=Math.sin(gait)*.5;
        }
        stand=i===0?smooth(p,0,.35):i===last?1-smooth(p,.65,1):1;
      }
    }
    const moving=trip!==null,trotting=moving&&swing!==0;

    sleep+=((!frame.playing&&quiet>14&&!moving&&perch==="chair"?1:0)-sleep)*Math.min(1,dt*.35);
    const breath=Math.sin(time*(2.3-sleep*.9));
    body.scale.set(1+breath*.012,1+breath*.025,1);
    drawFlats(time,dt,breath,frame.playing&&!moving?frame.beat:0,moving,frame.playing,trotting);
    // Standing: four legs of equal reach (.1175) put every paw on the ground; the body dips as the legs swing so paws stay planted.
    body.position.y=stand*.1175*Math.cos(swing);body.rotation.x=pitch;
    // In the sling the front legs fold back under the chest; on the flat sofa they stretch forward.
    tuck+=((perch==="chair"&&!moving?1:0)-tuck)*Math.min(1,dt*4);
    legs.rotation.set(stand*Math.PI/2,tuck*Math.PI,0);
    front[0].rotation.x=swing;front[1].rotation.x=-swing;
    hind[0].rotation.x=stand*Math.PI/2-swing;hind[1].rotation.x=stand*Math.PI/2+swing;

    if(lookYaw===null){
      const at=dog.getWorldPosition(new THREE.Vector3());
      const toWindow=dog.worldToLocal(at.add(new THREE.Vector3(-8,1.5,0)));
      lookYaw=THREE.MathUtils.clamp(Math.atan2(toWindow.x,toWindow.z),-1.1,1.1);
    }
    if(!action&&!moving&&time>nextAction&&sleep<.4){
      const kinds=Object.keys(LENGTHS) as Kind[],kind=kinds[Math.floor(Math.random()*kinds.length)];
      action={kind,start:time,length:LENGTHS[kind],side:Math.random()<.5?-1:1};
    }
    if(action&&time>action.start+action.length){action=null;nextAction=time+10+Math.random()*15;}
    const p=action?(time-action.start)/action.length:0,k=action?bump(p):0;
    const goal={hx:.05,hy:0,hz:0,jaw:0,legZ:0,earL:0,earR:0,hips:.45};
    switch(action?.kind){
      case "look":goal.hy=lookYaw*k;goal.hx-=.12*k;break;
      case "tilt":goal.hz=.35*action.side*k;goal.hy=.2*action.side*k;goal.hx-=.05*k;break;
      case "ear":{const flick=k*Math.max(0,Math.sin((time-action.start)*20));if(action.side>0)goal.earR=.6*flick;else goal.earL=.6*flick;break;}
      case "yawn":goal.hx-=.35*k;goal.jaw=.6*Math.pow(k,1.5);break;
      case "stretch":goal.legZ=.05*k;goal.hx-=.2*k;break;
      case "settle":goal.hips=.45+.18*Math.sin(p*Math.PI*2)*k;break;
    }
    // Music: a small nod and ear perk on each strong beat; head up and alert while travelling.
    const beat=frame.playing&&!moving?frame.beat:0;
    goal.hx-=beat*.06+stand*.2;goal.earL+=beat*.18+stand*.25;goal.earR+=beat*.18+stand*.25;
    goal.hx=THREE.MathUtils.lerp(goal.hx,.42,sleep);goal.hy*=1-sleep;goal.hz*=1-sleep;
    goal.hips*=1-stand;
    const ease=Math.min(1,dt*6);
    for(const key of Object.keys(pose) as (keyof typeof pose)[])pose[key]+=(goal[key]-pose[key])*(key==="earL"||key==="earR"?Math.min(1,dt*18):ease);
    head.rotation.set(pose.hx,pose.hy,pose.hz);
    jaw.rotation.x=pose.jaw;
    ears[0].rotation.x=-pose.earL;ears[1].rotation.x=-pose.earR;
    // Standing moves the shoulders up and back so the front legs grow out of the chest instead of hanging in front of it.
    legs.position.set(0,.06*stand,.14-.04*stand+pose.legZ);neck.position.z=.14+pose.legZ*.6;
    hips.rotation.y=pose.hips;
    if(time>blinkAt){blinkUntil=time+.14;blinkAt=time+2.5+Math.random()*4;}
    const lid=sleep>.6||time<blinkUntil?.15:1;
    for(const eye of eyes)eye.scale.y+=(lid-eye.scale.y)*Math.min(1,dt*25);
    // Tail: brisk while trotting, a slow content wag with music, barely a twitch otherwise.
    tailPhase+=dt*(moving?9:frame.playing?5:2);
    tail.rotation.set(-.9-stand*.3,Math.sin(tailPhase)*(moving?.5:frame.playing?.35:.08)*(1-sleep),0);
  }
  return { update };
}
