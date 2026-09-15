"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { records } from "./records";
import { agedBrick } from "./brick";
import { createAurora } from "./aurora";
import { addLounge } from "./lounge";
import { addArchitecturalDetails } from "./architecture";
import { addWorkspace } from "./workspace";
import { addCity } from "./city";
import { addGallery } from "./gallery";
import { addSnow } from "./snow";
import { idleMood, moods } from "./moods";
import Place from "./place";
import { MousePointerClick } from "lucide-react";

export type LoftApi = { select: (index: number) => void };
type AudioFrame = { bass: number; high: number; beat: number; playing: boolean; record: number };
type Props = { getAudio: () => AudioFrame; onPrepare: (index: number) => void; onPlay: (index: number) => void; onPhase?: (phase: string) => void; api?: { current: LoftApi | null } };

export default function Loft({ onPrepare, onPlay, onPhase, getAudio, api }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onPrepare, onPlay, onPhase, getAudio });
  callbacks.current = { onPrepare, onPlay, onPhase, getAudio };
  const choose = useRef<(i: number) => void>(() => {});
  const [phase, setPhase] = useState("loading");
  const [fallback, setFallback] = useState(false);
  useEffect(() => { callbacks.current.onPhase?.(phase); }, [phase]);

  useEffect(() => {
    const root = host.current!;
    let alive = true;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
    catch { setFallback(true); setPhase("ready"); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    root.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#c3b298");
    // Fog only reaches the city outside (interior stays within ~16 of the camera): haze over kilometres of skyline,
    // shifting from dusk to night with the music and thinning at night so distant lights survive.
    const fog = new THREE.Fog("#cdb7c0", 40, 2800);
    scene.fog = fog;
    const dayFog = new THREE.Color("#cdb7c0"), nightFog = new THREE.Color("#241f38");
    const camera = new THREE.PerspectiveCamera(51, 1, .1, 3600);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const mat = (color: string, roughness = .8, metalness = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.push(m); return m;
    };
    const plaster = mat("#c9bda6"), dark = mat("#252a26"), walnut = mat("#795139"), brass = mat("#b99458", .3, .65), cream = mat("#d9d0bc");
    const woodCanvas = document.createElement("canvas"); woodCanvas.width=256; woodCanvas.height=1024;
    const ctx=woodCanvas.getContext("2d")!; ctx.fillStyle="#71523a";ctx.fillRect(0,0,256,1024);
    for(let n=0;n<360;n++){ctx.strokeStyle=`rgba(${n%2?"34,19,12":"210,163,109"},${.02+(n%7)*.009})`;ctx.beginPath();const x=(n*37)%256;ctx.moveTo(x,0);for(let y=0;y<=1024;y+=24)ctx.lineTo(x+Math.sin(y*.006+n)*4,y);ctx.stroke();}
    const woodTexture = new THREE.CanvasTexture(woodCanvas); woodTexture.colorSpace=THREE.SRGBColorSpace; textures.push(woodTexture);
    const wood = new THREE.MeshStandardMaterial({map:woodTexture,roughness:.7});materials.push(wood);
    function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material=plaster,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
    function cylinder(r:number,h:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
    function sphere(r:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
    const hemi=new THREE.HemisphereLight("#ffe6dc","#3c3254",2.1);scene.add(hemi);
    const sun=new THREE.DirectionalLight("#ffdeb0",4.5);sun.position.set(-6,7,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
    const fill=new THREE.PointLight("#e1edee",13,15);fill.position.set(4,4,5);scene.add(fill);
    // Architecture: plaster shell, parquet, ceiling beams and tall industrial windows.
    box(12,.16,18,0,-.1,3,wood);
    for(let i=0;i<24;i++)box(.013,.006,13,-6+i*.5,0,2,walnut);
    for(let row=0;row<8;row++)for(let col=0;col<12;col++)box(.49,.007,.012,-5.75+col*.5+(row%2)*.5,.005,-4+row*1.8,walnut);
    // Painted brick, double-height glazing and a continuous glazed roof bay.
    const brick=agedBrick(textures);materials.push(brick);
    box(12,8.4,.2,0,4.2,-4.7,brick);box(.2,8.4,16,5.9,4.2,3,brick);
    box(12,8.4,.2,0,4.2,11.9,brick);
    box(12,.13,4.3,0,8.38,9.75,wood);
    // The west wall is genuinely open. Only opaque piers, sills and steel mullions remain.
    box(.2,.35,16,-5.9,.175,3,brick);box(.2,8.4,.4,-5.9,4.2,-4.5,brick);box(.2,8.4,4.3,-5.9,4.2,9.75,brick);
    const glass=new THREE.MeshPhysicalMaterial({color:"#a6d2e5",transparent:true,opacity:.07,roughness:.16,metalness:.1,side:THREE.DoubleSide,depthWrite:false});materials.push(glass);
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(12,7.8),glass);pane.rotation.y=Math.PI/2;pane.position.set(-5.82,4.3,1.6);scene.add(pane);
    for(let i=0;i<8;i++)box(.1,8,.065,-5.72,4.3,-4.35+i*1.7,dark);
    for(let i=0;i<5;i++)box(.1,.065,12,-5.72,.4+i*1.95,1.6,dark);
    // Continuous nine-metre glazed roof bay above the double-height facade.
    const roofGlass=new THREE.Mesh(new THREE.PlaneGeometry(9,12),glass);roofGlass.rotation.x=Math.PI/2;roofGlass.position.set(-1.32,8.23,1.6);scene.add(roofGlass);
    for(let i=0;i<8;i++)box(9.1,.09,.065,-1.32,8.22,-4.35+i*1.7,dark);
    for(let i=0;i<7;i++)box(.065,.09,12,-5.82+i*1.5,8.22,1.6,dark);
    box(2.7,.13,16,4.54,8.38,3,wood);
    box(.14,.22,16,3.18,8.12,3,dark);
    box(12,.25,.3,0,8.15,-4.5,dark);
    const aurora=createAurora();materials.push(aurora);
    const skyDome=new THREE.Mesh(new THREE.SphereGeometry(28,40,24),aurora);skyDome.position.set(0,0,0);skyDome.renderOrder=-1;scene.add(skyDome);// drawn first: it writes no depth, so the skyline beyond r=28 paints over it
    const auroraGreen=new THREE.PointLight("#39e5b1",0,19,1.4);auroraGreen.position.set(-4.6,4.5,.5);scene.add(auroraGreen);
    const auroraPink=new THREE.PointLight("#cd4bff",0,17,1.4);auroraPink.position.set(-2.5,5.9,2.5);scene.add(auroraPink);
    const auroraBlue=new THREE.PointLight("#4588ff",0,15,1.4);auroraBlue.position.set(-4,3.3,4);scene.add(auroraBlue);
    // Sun patches and mullion shadows are geometric so the room remains legible on mobile.
    const lightPatch= new THREE.MeshBasicMaterial({color:"#f4d399",transparent:true,opacity:.18,depthWrite:false});materials.push(lightPatch);
    for(let i=0;i<4;i++){const patch=box(1.05,.002,4.2,-3.3+i*1.35,.018,1.6,lightPatch);patch.rotation.y=-.3;patch.castShadow=false;}
    const consoleStart=scene.children.length;
    // Low walnut console with slatted doors and recessed shelves.
    box(7.1,.16,1.38,0,1.18,-1.6,wood);
    box(7,.1,1.25,0,.4,-1.63,wood);box(7,.68,.06,0,.76,-2.22,walnut);
    for(const x of [-3.45,-1.73,0,1.73,3.45])box(.09,.68,1.25,x,.76,-1.63,wood);
    for(let i=0;i<4;i++)box(.1,.4,.1,-3+i*2,.2,-1.35,dark);
    const spineMaterials=["#d2c7a7","#2b3331","#984931","#66796b","#bda065","#523b48"].map(c=>mat(c));
    for(let bay=0;bay<4;bay++)for(let i=0;i<48;i++){
      const x=-3.33+bay*1.73+i*.032;
      const record=box(.018,.57,.59,x,.74,-1.36+(i%4)*.008,spineMaterials[(i*7+bay)%6]);
      record.rotation.z=(i%9===0?.018:0);
      box(.012,.008,.002,x,.9,-1.055+(i%4)*.008,cream);
      if(i%3===0)box(.011,.075,.003,x,.67,-1.054+(i%4)*.008,spineMaterials[(i+2)%6]);
    }
    // Turntable: aluminum plinth, platter, concentric grooves, tonearm and switches.
    box(1.65,.16,1.08,-.45,1.35,-1.43,mat("#c6c6b7",.35,.4));
    box(1.69,.08,1.12,-.45,1.26,-1.43,dark);
    const platter=cylinder(.47,.07,-.69,1.465,-1.42,mat("#4b4d48",.3,.65));
    cylinder(.43,.015,-.69,1.51,-1.42,dark);
    for(let i=0;i<32;i++){const dot=sphere(.009,Math.cos(i*Math.PI/16)*.468-.69,1.474,Math.sin(i*Math.PI/16)*.468-1.42,cream);dot.scale.y=.5;}
    cylinder(.065,.12,.12,1.47,-1.79,brass);
    const arm=new THREE.Group();arm.position.set(.12,1.55,-1.79);scene.add(arm);
    const bar=box(.026,.024,.62,0,0,.27,brass,arm);bar.rotation.y=-.22;box(.065,.055,.12,-.12,-.025,.59,dark,arm);
    cylinder(.035,.022,.17,1.45,-1.02,brass);box(.05,.01,.025,.27,1.44,-1.07,mat("#e99348"));
    // Paired bookshelf monitors.
    for(const x of [-3.15,3.15]){box(.64,.92,.58,x,1.74,-1.5,wood);box(.56,.83,.025,x,1.74,-1.197,dark);for(const [r,y] of [[.195,1.58],[.095,1.96]]){const cone=cylinder(r,.04,x,y,-1.17,mat("#151916",.5));cone.rotation.x=Math.PI/2;const center=sphere(r*.4,x,y,-1.13,mat("#42483d"));center.scale.z=.3;}}
    // Floating record rails. Each jacket is a real thick mesh with a textured front.
    box(5.9,.035,.28,0,1.44,-2.08,wood);
    const jackets:THREE.Mesh[]=[];const fronts:THREE.Mesh[]=[];
    const loader=new THREE.TextureLoader();
    const atlas=loader.load("/vinyl-table.png",()=>{if(alive){textures.forEach(t=>t.needsUpdate=true);setPhase("ready");}},undefined,()=>{if(alive){setFallback(true);setPhase("ready");}});atlas.colorSpace=THREE.SRGBColorSpace;textures.push(atlas);
    records.forEach((record,i)=>{
      const tex=atlas.clone();const [x,y,w,h]=record.crop;tex.repeat.set(w/1536,h/1024);tex.offset.set(x/1536,1-(y+h)/1024);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);
      const front=new THREE.MeshStandardMaterial({map:tex,roughness:.9});materials.push(front);
      const mesh=box(.78,.78,.045,(i-2.5)*.92,1.85,-2.08,mat("#c8b797"));
      const face=new THREE.Mesh(new THREE.PlaneGeometry(.78,.78),front);face.position.z=.024;mesh.add(face);face.userData.index=i;mesh.userData.index=i;jackets.push(mesh);fronts.push(face);
    });
    const consoleObjects=scene.children.slice(consoleStart);
    const consoleRig=new THREE.Group();scene.add(consoleRig);consoleObjects.forEach(o=>consoleRig.add(o));
    consoleRig.position.set(-3.05,0,1.5);consoleRig.rotation.y=Math.PI/2;consoleRig.updateMatrixWorld(true);
    const rigPoint=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z).applyMatrix4(consoleRig.matrixWorld);
    // Workbench, chair and an architectural print on the right wall.
    box(1.65,.08,1.1,4.65,1.35,1.1,wood);for(const x of [4.02,5.3])box(.06,1.3,.85,x,.65,1.1,dark);
    box(.8,.025,.53,4.55,1.41,.98,dark);const screen=box(.82,.52,.04,4.55,1.67,.74,dark);screen.rotation.x=-.15;
    box(.75,.45,.012,4.55,1.67,.77,mat("#43534b"));
    const chair=box(.7,.13,.7,4.3,.65,2.3,mat("#67705a"));chair.rotation.y=-.3;box(.7,.7,.1,4.3,1.04,2.6,mat("#67705a"));for(const x of [4.05,4.55])for(const z of [2.05,2.55])box(.035,.6,.035,x,.3,z,dark);
    const poster=box(.04,1.45,1,5.74,3.05,.7,cream);for(let n=0;n<6;n++)box(.05,.03,.66,5.7,2.6+n*.16,.7,brass);
    // Plants: stem segments and broad curved silhouettes with varied orientations.
    function plant(x:number,z:number,scale:number){const pot=cylinder(.25*scale,.44*scale,x,.22*scale,z,mat("#9a573d"));for(let n=0;n<10;n++){const theta=n*2.4;const y=.5*scale+n*.105*scale;const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),mat(n%2?"#354c31":"#536746"));leaf.scale.set(.14*scale,.36*scale,.025*scale);leaf.position.set(x+Math.sin(theta)*.3*scale,y+.15*scale,z+Math.cos(theta)*.3*scale);leaf.rotation.set(.5,theta,Math.sin(theta)*.7);leaf.castShadow=true;scene.add(leaf);const stem=box(.018,y,.018,x,y/2,z,mat("#475539"));}return pot;}
    plant(-4.25,6.55,1.65);plant(-3.8,-3.5,1.5);plant(.6,-3.7,1.1);plant(5.05,.65,.45);
    addLounge(scene,materials,textures);
    addArchitecturalDetails(scene,materials,textures);
    addWorkspace(scene,materials,textures);
    addGallery(scene,materials,textures);
    const city=addCity(scene,materials);
    const snow=addSnow(scene,materials);
    // Mood state eases toward the playing record's palette and dynamics (moods.ts) so record changes cross-fade.
    const moodA=new THREE.Color(idleMood.sky[0]),moodB=new THREE.Color(idleMood.sky[1]),moodC=new THREE.Color(idleMood.sky[2]),goal=new THREE.Color();
    const mood={...idleMood};
    // Interior light keeps Solar's warm amber/coral/violet whatever plays outside, borrowing only a hint of the record's colours.
    const warmA=new THREE.Color("#ffb347"),warmB=new THREE.Color("#ff5e62"),warmC=new THREE.Color("#8e44ff"),WARMTH=.8;
    // Pendant task lamp.
    const bulb=new THREE.PointLight("#ffd497",5,5);bulb.position.set(-.1,4.1,-.4);scene.add(bulb);

    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(0,0);
    let hovered=-1, selected=-1, selectedAt=0, frame=0, enteredAt=performance.now(), done=false;
    let auroraLevel=0,lowEnergy=0,highEnergy=0,skyTime=0,discSpin=0,lastFrame=performance.now();
    let pauseBlend=0;
    const initialPosition=new THREE.Vector3(),initialRotation=new THREE.Quaternion();
    let disc:THREE.Group|null=null;let sleeveOrigin=new THREE.Vector3();
    const target=new THREE.Vector3(-3.7,2.05,1.45);
    function resize(){const w=root.clientWidth,h=root.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
    resize();const observer=new ResizeObserver(resize);observer.observe(root);
    function pick(event:PointerEvent){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(fronts,false)[0];return hit?hit.object.userData.index as number:-1;}
    const move=(e:PointerEvent)=>{hovered=(selected<0||done)?pick(e):-1;renderer.domElement.style.cursor=hovered>=0?"pointer":"default";};
    function select(index:number){if((selected>=0&&!done)||!alive)return;if(disc){consoleRig.remove(disc);disc.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});}done=false;callbacks.current.onPrepare(index);selected=index;selectedAt=performance.now();sleeveOrigin=jackets[index].position.clone();sleeveOrigin.z=-2.08;pauseBlend=0;setPhase("placing");disc=new THREE.Group();consoleRig.add(disc);const vinyl=cylinder(.45,.018,0,0,0,mat("#151614",.24,.15),disc);const label=cylinder(.13,.021,0,.008,0,mat(records[index].color,.7),disc);cylinder(.015,.025,0,.01,0,brass,disc);for(let j=0;j<20;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.17+j*.013,.0014,3,80),mat("#34352e",.4,.3));ring.rotation.x=Math.PI/2;disc.add(ring);}disc.position.copy(sleeveOrigin);disc.rotation.x=Math.PI/2;}
    choose.current=select;if(api)api.current={select:i=>choose.current(i)};
    const click=(e:PointerEvent)=>{const i=pick(e);if(i>=0)select(i);};
    renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",click);
    const ease=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
    function render(now:number){frame=requestAnimationFrame(render);if(document.hidden)return;
      const mobile=camera.aspect<.8;
      const intro=reduce?1:ease((now-enteredAt)/3600);
      const wide=new THREE.Vector3(4.8,3.8,8),near=new THREE.Vector3(mobile?5.8:2.8,mobile?3.1:3.1,mobile?3.6:4.7);
      camera.position.lerpVectors(wide,near,intro);
      camera.position.x+=reduce?0:pointer.x*.08;camera.position.y+=reduce?0:pointer.y*.035;
      camera.lookAt(target);
      initialPosition.copy(camera.position);initialRotation.copy(camera.quaternion);
      jackets.forEach((j,i)=>{if(i!==selected){j.position.z=THREE.MathUtils.lerp(j.position.z,i===hovered?-2.04:-2.08,.09);j.rotation.z=THREE.MathUtils.lerp(j.rotation.z,i===hovered?-.045:0,.09);}});
      if(selected>=0&&disc){const seconds=reduce?4.5:(now-selectedAt)/1000;const pull=ease(seconds/1.2),travel=ease((seconds-1.2)/1.5),land=ease((seconds-2.7)/1.1);
        // Clear the full jacket height plus the vinyl radius before translating or rotating.
        const sleeve=jackets[selected];sleeve.position.copy(sleeveOrigin);sleeve.rotation.z=0;
        const clearance=2.85;
        disc.position.set(
          THREE.MathUtils.lerp(sleeveOrigin.x,-.69,travel),
          THREE.MathUtils.lerp(sleeveOrigin.y,clearance,pull)-land*(clearance-1.54),
          THREE.MathUtils.lerp(sleeveOrigin.z,-1.42,travel),
        );
        disc.rotation.x=(1-travel)*Math.PI/2;
        disc.rotation.y=land*discSpin;
        // Keep the tonearm parked until the disc has settled on the platter.
        arm.rotation.y=-ease((seconds-3.8)/.5)*.45;
        const zoom=ease((seconds-.7)/2.4);camera.position.lerp(rigPoint(mobile?1.2:1.5,3.4,mobile?3.1:1.7),zoom);camera.lookAt(target.clone().lerp(rigPoint(-.5,1.4,-1.4),zoom));
                if(seconds>4.4&&!done){done=true;setPhase("listening");callbacks.current.onPlay(selected);}
        if(done){const retreat=reduce?1:ease((seconds-4.4)/3.5);camera.position.lerp(new THREE.Vector3(mobile?4.8:4.6,mobile?2.9:2.8,1.6),retreat);camera.lookAt(rigPoint(-.5,1.4,-1.4).lerp(new THREE.Vector3(-4.9,mobile?4.2:3.8,1.6),retreat));}
      }
      const audio=callbacks.current.getAudio();
      const dt=Math.min((now-lastFrame)/1000,.06);lastFrame=now;
      const smoothing=1-Math.exp(-dt*2);
      const nextMood=selected>=0?moods[records[audio.record]?.id]??idleMood:idleMood,blend=1-Math.exp(-dt*1.2);
      moodA.lerp(goal.set(nextMood.sky[0]),blend);moodB.lerp(goal.set(nextMood.sky[1]),blend);moodC.lerp(goal.set(nextMood.sky[2]),blend);
      for(const k of ["speed","sway","bass","high","beat","snow","wind"] as const)mood[k]+=(nextMood[k]-mood[k])*blend;
      const beatLevel=reduce?0:audio.beat*mood.beat;
      const pauseTarget=done&&!audio.playing?1:0;
      pauseBlend=reduce?pauseTarget:THREE.MathUtils.lerp(pauseBlend,pauseTarget,smoothing);
      if(Math.abs(pauseBlend-pauseTarget)<.001)pauseBlend=pauseTarget;
      if(done){camera.position.lerp(initialPosition,pauseBlend);camera.quaternion.slerp(initialRotation,pauseBlend);}
      auroraLevel+=((audio.playing?1:0)-auroraLevel)*smoothing*.6;
      lowEnergy+=(audio.bass*mood.bass-lowEnergy)*smoothing;highEnergy+=(audio.high*mood.high-highEnergy)*smoothing;
      if(!reduce&&audio.playing){skyTime+=dt*mood.speed*2;discSpin+=dt*1.8;}
      if(reduce){lowEnergy=0;highEnergy=0;}
      aurora.uniforms.time.value=skyTime;aurora.uniforms.intensity.value=auroraLevel;
      aurora.uniforms.bass.value=reduce?0:lowEnergy;aurora.uniforms.high.value=reduce?0:highEnergy;aurora.uniforms.beat.value=beatLevel;aurora.uniforms.sway.value=mood.sway;
      aurora.uniforms.colorA.value.copy(moodA);aurora.uniforms.colorB.value.copy(moodB);aurora.uniforms.colorC.value.copy(moodC);
      auroraGreen.color.copy(moodA).lerp(warmA,WARMTH);auroraPink.color.copy(moodB).lerp(warmB,WARMTH);auroraBlue.color.copy(moodC).lerp(warmC,WARMTH);
      sun.intensity=4.5-auroraLevel*3.85;hemi.intensity=2.1-auroraLevel*1.25;fill.intensity=13-auroraLevel*8;
      auroraGreen.intensity=auroraLevel*(17+lowEnergy*15+beatLevel*14);auroraPink.intensity=auroraLevel*(12+highEnergy*18+beatLevel*8);auroraBlue.intensity=auroraLevel*(10+beatLevel*6);
      lightPatch.opacity=.18*(1-auroraLevel);
      fog.color.lerpColors(dayFog,nightFog,auroraLevel);fog.far=2800+auroraLevel*1400;city.update(reduce?0:now/1000,auroraLevel);
      snow.update(reduce?0:now/1000,{density:mood.snow*(.55+.45*auroraLevel),wind:mood.wind,night:auroraLevel,tint:moodA,pixelScale:renderer.domElement.height*.5*camera.projectionMatrix.elements[5]});
      const wideView=done?ease(((now-selectedAt)/1000-4.4)/3.5):0;
      camera.fov=51+wideView*19*(1-pauseBlend);camera.updateProjectionMatrix();
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(render);
    const lost=(e:Event)=>{e.preventDefault();setFallback(true);setPhase("ready");cancelAnimationFrame(frame);};renderer.domElement.addEventListener("webglcontextlost",lost);
    return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",click);renderer.domElement.removeEventListener("webglcontextlost",lost);scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();choose.current=()=>{};};
  }, []);

  return <div className={`loft-entry ${phase}`}>
    <div className="loft-canvas" ref={host}/>
    <Place/>
    {phase==="ready"&&<div className="loft-hint" role="status"><kbd>TIP</kbd><MousePointerClick size={17} className="loft-hint-icon" aria-hidden="true"/><span className="hint-pointer">Pick a record from the shelf to start the music</span><span className="hint-touch">Tap a record on the shelf to start the music</span></div>}
    <div className="loft-bottom"><span>{phase==="loading"?"Abriendo el estudio…":""}</span></div>
    <div className={fallback?"loft-fallback":"loft-keyboard"} aria-label="Vinilos disponibles">{records.map((r,i)=><button key={r.id} disabled={phase==="placing"} onClick={()=>{if(fallback){callbacks.current.onPrepare(i);callbacks.current.onPlay(i);}else choose.current(i);}}>{r.title}</button>)}</div>
  </div>;
}








