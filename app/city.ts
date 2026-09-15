import * as THREE from "three";

// Brooklyn seen from a fourth-floor loft: brownstone and tenement rooftops with water tanks and street trees, warehouses
// on the waterfront, the East River with a suspension bridge, and the lower Manhattan skyline 1–2 km away (midtown beyond,
// mostly haze). Built at true proportions in metres so windows, floors and distances read as a real city.
// Dusk while idle; as the music starts (`night` → 1) facades fall dark and windows, bridge and beacons light up.
// Every building mass is one instance of a single box; facades (windows, sills, fire escapes, shopfronts) are drawn in the
// shader from per-instance style data, with distant grids fading to their average so they never shimmer.

const M=.56;                        // scene units per metre outside, matching the loft's angular scale at the street front
const STREET=-14*M;                 // the loft floor is four storeys up
const X=(d:number)=>-5.9-d*M;       // d: metres west of the glazing
const Y=(h:number)=>STREET+h*M;     // h: metres above the street

// Facade styles: 0 brownstone · 1 tenement · 2 warehouse · 3 prewar masonry · 4 glass curtain wall · 5 modern bands · 6 plain trim
const BROWNSTONE=["#6e4a3a","#7d5240","#5d4034","#8a6a52","#b8a58a","#9a5a45","#77787a"];
const TENEMENT=["#b09070","#a3593f","#c2ad8c","#8a7f73","#9c4f3a","#d1c3a6","#7b4a3c"];
const WAREHOUSE=["#8f4b36","#a8664a","#b59c7e","#7a6a5c","#c9b79a","#6f4436"];
const PREWAR=["#bfae92","#a99a84","#c8bda8","#8e8579","#b59a7c","#d2c6ae"];
const GLASS=["#3a4a55","#445a5c","#4d5561","#2f3b44","#566b72","#5a5f66"];
const MODERN=["#c9c6be","#a7a9aa","#d8d3c6","#8b8f93","#b3aca0"];
const PALETTES=[BROWNSTONE,TENEMENT,WAREHOUSE,PREWAR,GLASS,MODERN];
const FLOOR_H=[3.4,3.1,4.4,3.5,3.8,3.2],GROUND_H=[1.6,4.2,5,6,7,5];

export function addCity(scene: THREE.Scene, materials: THREE.Material[]) {
  let seed=4051;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const pick=<T,>(list:readonly T[])=>list[Math.floor(random()*list.length)];
  const city=new THREE.Group();scene.add(city);
  const dummy=new THREE.Object3D();
  const matrix=(x:number,y:number,z:number,sx:number,sy:number,sz:number,turn=0)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,turn,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();return dummy.matrix.clone();};

  type Mass={d:number,z:number,w:number,depth:number,h0:number,h1:number,color:THREE.Color,style:number,lit:number,flags:number,seed:number};
  const masses:Mass[]=[],tanks:THREE.Matrix4[]=[],trees:THREE.Matrix4[]=[],crowns:THREE.Matrix4[]=[],spires:THREE.Matrix4[]=[],beacons:THREE.Vector3[]=[];
  const reserved:[number,number,number,number][]=[];
  const free=(d0:number,d1:number,z0:number,z1:number)=>reserved.every(([a,b,c,e])=>d1<a||d0>b||z1<c||z0>e);
  function mass(d:number,z:number,w:number,depth:number,h0:number,h1:number,color:THREE.ColorRepresentation,style:number,lit:number,flags=0){
    masses.push({d,z,w,depth,h0,h1,color:new THREE.Color(color).offsetHSL(0,(random()-.5)*.04,(random()-.5)*.06),style,lit,flags,seed:random()});
  }
  // z range (metres) visible through the glazing from both the console and the listening cameras, plus a margin.
  const zSpan=(d:number):[number,number]=>{const D=10.5+d*M;return [Math.min(1.6-.62*D,4.7-1.1*D)/M-30,Math.max(1.6+.62*D,4.7+.38*D)/M+30];};

  function roof(d:number,z:number,w:number,depth:number,h:number,style:number){
    if(d<1400&&random()<[.06,.22,.35,.05,0,.04][style])tanks.push(matrix(X(d+(random()-.5)*depth*.4),Y(h),(z+(random()-.5)*w*.4)*M,1,1,1));
    if(style>=1&&style!==4&&random()<.45)mass(d+(random()-.5)*depth*.3,z+(random()-.5)*w*.3,4+random()*5,4+random()*4,h,h+3+random()*2,"#6d6660",6,0);
  }
  function tower(d:number,z:number,w:number,depth:number,floors:number,style:number,lit:number){
    let h=floors*FLOOR_H[style]+GROUND_H[style];const color=pick(PALETTES[style]);
    if(style===3&&floors>18){
      const t1=h*.62,t2=h*.86;mass(d,z,w,depth,0,t1,color,3,lit);mass(d,z,w*.74,depth*.74,t1,t2,color,3,lit);mass(d,z,w*.5,depth*.5,t2,h,color,3,lit);
      if(random()<.5){const c=Math.min(w*.5,22);crowns.push(matrix(X(d),Y(h),z*M,w*.36*M,c*M,depth*.36*M,Math.PI/4));h+=c;}
    }else if(style===4&&floors>30&&random()<.5){const t1=h*(.7+random()*.15);mass(d,z,w,depth,0,t1,color,4,lit);mass(d,z,w*.72,depth*.72,t1,h,color,4,lit);}
    else mass(d,z,w,depth,0,h,color,style,lit);
    if(h>150){if(random()<.4){const s=20+random()*50;spires.push(matrix(X(d),Y(h+s/2),z*M,1,s*M,1));h+=s;}beacons.push(new THREE.Vector3(X(d),Y(h+1),z*M));}
    else roof(d,z,w,depth,h,style);
  }

  // ── Landmarks and the bridge footprint, reserved before the grid fills in.
  const BZ=-250;
  reserved.push([440,500,BZ-30,BZ+30],[1100,1160,BZ-30,BZ+30]);
  reserved.push([1270,1330,-150,-90]);mass(1300,-120,50,50,0,262,"#50616d",4,.6);mass(1300,-120,36,36,262,392,"#50616d",4,.6);
  spires.push(matrix(X(1300),Y(392+55),-120*M,1.6,110*M,1.6));beacons.push(new THREE.Vector3(X(1300),Y(503),-120*M));
  reserved.push([1155,1205,-450,-400]);mass(1180,-425,40,34,0,122,"#cbbfa7",3,.4);mass(1180,-425,26,24,122,200,"#cbbfa7",3,.4);crowns.push(matrix(X(1180),Y(200),-425*M,17*M,34*M,16*M,Math.PI/4));
  reserved.push([4660,4740,610,690]);tower(4700,650,60,55,102,3,.5);
  // Warehouse lofts across the street rise past eye level at the window edges.
  for(const [d,z,w,depth,floors,color] of [[52,-52,36,30,7,"#9a5a42"],[62,60,40,34,8,"#b39f82"]] as const){reserved.push([d-depth/2,d+depth/2,z-w/2,z+w/2]);const h=floors*4.4+5;mass(d,z,w,depth,0,h,color,2,.35);roof(d,z,w,depth,h,2);}

  // ── Brooklyn: 250 m blocks, rows of lots back to back with yards, warehouses and new towers toward the waterfront.
  for(let d0=22;d0<540;d0+=76){
    for(const row of [0,1]){
      const d=d0+row*42,depth=17,[z0,z1]=zSpan(d+depth),far=d>260,waterfront=d>380;
      let z=Math.floor(z0/250)*250;
      while(z<z1){
        const avenue=Math.floor(z/250)*250+226;if(z>=avenue){z=avenue+24;continue;}
        const room=avenue-z,r=random();
        if(waterfront&&r<.4){
          const w=Math.min(28+random()*40,room),dd=depth+8+random()*22,floors=5+Math.floor(random()*8),h=floors*4.4+5;
          if(free(d,d+dd,z,z+w)){mass(d+dd/2,z+w/2,w,dd,0,h,pick(WAREHOUSE),2,.12+random()*.3);roof(d+dd/2,z+w/2,w,dd,h,2);}
          z+=w+2+random()*6;
        }else if(r<(waterfront?.5:.05)){
          const w=Math.min(22+random()*20,room),dd=22+random()*10;
          if(free(d,d+dd,z,z+w))tower(d+dd/2,z+w/2,w,dd,waterfront?16+Math.floor(random()*22):7+Math.floor(random()*7),random()<.5?5:4,.3+random()*.4);
          z+=w+4;
        }else{
          const tenement=random()<(far?.45:.28),w=Math.min((tenement?7.6*(1+Math.floor(random()*2)):6+random()*1.8)*(far?1.8:1),room);
          if(w>3&&free(d,d+depth,z,z+w)){
            const floors=tenement?5+Math.floor(random()*2):3+Math.floor(random()*2),h=tenement?floors*3.1+4.2:floors*3.4+1.6;
            const dd=depth*(.9+random()*.2),dc=d+dd/2+(random()-.5),color=pick(tenement?TENEMENT:BROWNSTONE);
            mass(dc,z+w/2,w,dd,0,h,color,tenement?1:0,.28+random()*.35,random()<(tenement?.6:.15)?1:0);
            if(d<320)mass(dc,z+w/2,w,dd+.9,h-.9,h+.35,new THREE.Color(color).multiplyScalar(.72),6,0);
            roof(dc,z+w/2,w,dd,h,tenement?1:0);
          }
          z+=w;
        }
      }
    }
    // Street trees in front of the block and a canopy of backyard trees between the two rows.
    if(d0<470){
      const [z0,z1]=zSpan(d0+40);
      for(let z=z0;z<z1;z+=7+random()*9)if(random()<.6){const r=3+random()*2.5;trees.push(matrix(X(d0-9+(random()-.5)*5),Y(8+random()*3),z*M,r*M,r*1.1*M,r*M));}
      for(let z=z0;z<z1;z+=10+random()*16)if(random()<.7){const r=4+random()*2.5;trees.push(matrix(X(d0+22+random()*16),Y(9+random()*4),z*M,r*M,r*1.15*M,r*M));}
    }
  }
  {const [z0,z1]=zSpan(565);for(let z=z0;z<z1;z+=9+random()*12){const r=4+random()*3;trees.push(matrix(X(548+random()*32),Y(7+random()*3),z*M,r*M,r*M,r*M));}}

  // ── Lower Manhattan: dense grid, heights peaking around the financial district.
  for(let d=1012;d<2500;d+=50){
    const [z0,z1]=zSpan(d);
    for(let z=Math.floor(z0/62)*62;z<z1;z+=62){
      if(random()<.2)continue;
      const w=24+random()*30,dd=22+random()*24,dc=d+dd/2,zc=z+w/2+(random()-.5)*6;
      if(!free(dc-dd/2,dc+dd/2,zc-w/2,zc+w/2))continue;
      const hf=Math.exp(-Math.pow((zc+320)/760,2)-Math.pow((d-1420)/560,2));
      const floors=Math.round(d<1070?3+random()*7:6+(8+58*hf)*Math.pow(random(),1.6));
      const style=floors>34?(random()<.55?4:3):floors>14?pick([3,3,4,5]):pick([1,2,3,5]);
      tower(dc,zc,w,dd,floors,style,.2+random()*.55);
    }
  }
  // ── Midtown on the horizon: mostly haze by day, a band of lights at night.
  for(let d=4300;d<5200;d+=120){
    const [z0,z1]=zSpan(d);
    for(let z=Math.floor(z0/120)*120;z<z1;z+=120){
      if(random()<.45)continue;const zc=z+(random()-.5)*30;if(!free(d-30,d+30,zc-35,zc+35))continue;
      const floors=Math.round(10+75*Math.exp(-Math.pow((zc-500)/1500,2))*Math.pow(random(),1.5));
      tower(d,zc,30+random()*40,30+random()*30,floors,floors>30?pick([3,4,4]):pick([3,5]),.3+random()*.5);
    }
  }

  // ── Facade shader.
  const uniforms={cityNight:{value:0},cityTime:{value:0},cityHorizon:{value:new THREE.Color()},cityZenith:{value:new THREE.Color()},cityRoofSnow:{value:.8}};
  const dayHorizon=new THREE.Color(.86,.68,.7),nightHorizon=new THREE.Color(.1,.09,.18),dayZenith=new THREE.Color(.36,.43,.62),nightZenith=new THREE.Color(.02,.03,.08);
  const facade=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.9});materials.push(facade);
  facade.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>
      attribute vec4 aStyle;varying vec3 vCityPos;varying vec3 vCityNormal;varying vec4 vFacade;varying vec4 vStyle;`).replace("#include <project_vertex>",`#include <project_vertex>
      vec3 cityScale=vec3(1.);vec4 cityWorld=vec4(transformed,1.);vec3 cityNormal=objectNormal;
      #ifdef USE_INSTANCING
      cityScale=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
      cityWorld=instanceMatrix*cityWorld;cityNormal=mat3(instanceMatrix)*cityNormal;
      #endif
      vCityPos=(modelMatrix*cityWorld).xyz;vCityNormal=normalize(mat3(modelMatrix)*cityNormal);
      bool cityAlongZ=abs(objectNormal.x)>.5;
      vFacade=vec4(cityAlongZ?transformed.z*cityScale.z:transformed.x*cityScale.x,(transformed.y+.5)*cityScale.y,cityAlongZ?cityScale.z:cityScale.x,cityScale.y);
      vStyle=aStyle;`);
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>
      varying vec3 vCityPos;varying vec3 vCityNormal;varying vec4 vFacade;varying vec4 vStyle;
      uniform float cityNight;uniform float cityTime;uniform vec3 cityHorizon;uniform vec3 cityZenith;uniform float cityRoofSnow;
      float cityHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float cityRect(vec2 f,vec2 halfSize,vec2 aa){vec2 q=1.-smoothstep(halfSize-aa,halfSize+aa,abs(f-.5));return q.x*q.y;}
      // floor height, bay width, window width, window height (metres)
      const vec4 cityFloor[7]=vec4[7](vec4(3.4,2.2,1.05,2.0),vec4(3.1,2.0,1.0,1.75),vec4(4.4,5.2,3.8,2.9),vec4(3.5,2.5,1.15,2.1),vec4(3.8,1.55,1.47,3.05),vec4(3.2,3.8,3.5,1.95),vec4(3.,3.,0.,0.));
      // ground storey, parapet, corner margin (metres), glazing bars: 0 none, 1 sash, 2 industrial grid, 3 vertical mullions
      const vec4 cityTrim[7]=vec4[7](vec4(1.6,1.0,.9,1.),vec4(4.2,1.0,.8,1.),vec4(5.,1.6,1.2,2.),vec4(6.,2.2,1.,1.),vec4(7.,1.2,0.,0.),vec4(5.,1.2,.6,3.),vec4(0.));`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
      {
        const float M=${M};
        vec3 cN=normalize(vCityNormal);int cs=int(vStyle.x+.5);float bSeed=vStyle.y,litRatio=vStyle.z,flags=vStyle.w,dayK=1.-cityNight;
        if(abs(cN.y)>.5){
          // Tar roofs under patchy snow: drifts break up where vents and bulkheads interrupt them.
          vec3 roofTone=mix(diffuseColor.rgb,vec3(.3,.29,.28),.55)*(.8+.3*cityHash(floor(vCityPos.xz*.3)));
          float drift=cityRoofSnow*smoothstep(.15,.55,cityHash(floor(vCityPos.xz*1.3))*.6+.4*cityHash(floor(vCityPos.xz*.21)));
          diffuseColor.rgb=mix(roofTone,vec3(.86,.88,.92),drift)*(1.-.5*cityNight);
        }else{
          float h=vFacade.y,W=vFacade.z,H=vFacade.w;
          vec4 P=cityFloor[cs]*M;vec4 T=cityTrim[cs];
          P.yz*=.85+.3*fract(bSeed*3.7);P.x*=.95+.1*fract(bSeed*5.3);P.w*=.9+.2*fract(bSeed*9.1);
          float ground=T.x*M,parapet=T.y*M,margin=T.z*M;
          float u=vFacade.x+W*.5-margin,span=max(W-2.*margin,.001);
          float bw=span/max(1.,floor(span/P.y+.3));
          vec2 cell=vec2(u/bw,(h-ground)/P.x),id=floor(cell),f=fract(cell),aa=fwidth(cell);
          float lod=smoothstep(.25,.7,max(aa.x,aa.y));
          vec2 halfWin=vec2(P.z/bw,P.w/P.x)*.5;
          float valid=step(0.,cell.y)*step(0.,u)*step(u,span)*step(ground+(id.y+.5)*P.x+P.w*.5,H-parapet)*step(.001,P.z);
          float win=mix(cityRect(f,halfWin,aa*.8)*valid,4.*halfWin.x*halfWin.y*valid,lod);
          // Masonry: weathering by bay and storey, soot toward the street, stone lintels and string courses.
          vec3 wall=diffuseColor.rgb*(.9+.14*cityHash(vec2(floor(u/(P.y*2.)),floor(h/(P.x*3.)))+bSeed*17.))*mix(.62,1.,smoothstep(0.,8.*M,h));
          float lintel=0.;
          if(cs==0||cs==1||cs==3)lintel=step(abs(f.x-.5),halfWin.x+.05)*step(.5+halfWin.y,f.y)*step(f.y,.5+halfWin.y+.28*M/P.x)*valid;
          if(cs==3)lintel=max(lintel,step(f.y,.035)*step(0.,cell.y)*step(h,H-parapet));
          wall*=1.+.38*lintel*(1.-lod);
          vec2 wf=(f-.5+halfWin)/max(2.*halfWin,vec2(.001));
          float bars=0.;
          if(T.w>.5&&T.w<1.5)bars=step(abs(wf.y-.5),.035);
          else if(T.w>1.5&&T.w<2.5)bars=max(step(.43,abs(fract(wf.x*4.)-.5)),step(.44,abs(fract(wf.y*3.)-.5)));
          else if(T.w>2.5)bars=step(.465,abs(fract(wf.x*3.)-.5));
          bars*=1.-lod;
          // Glass: sky reflection by day, curtains and blinds, and a lived-in pattern of lights at night.
          vec2 wid=id+vec2(bSeed*91.7,bSeed*37.3);
          float r1=cityHash(wid),r2=cityHash(wid*1.37+3.1),r3=cityHash(wid*2.11+7.7);
          vec3 R=reflect(normalize(vCityPos-cameraPosition),cN);
          vec3 skyRef=mix(cityHorizon,cityZenith,clamp(R.y*1.5+.3,0.,1.));
          float curtain=step(.66,r2)*(1.-lod);
          vec3 glass=(cs==4?diffuseColor.rgb*.5:vec3(.07,.085,.1))+curtain*vec3(.2,.17,.13)*dayK;
          float refl=(cs==4?.5:.26)*(1.-curtain*.6)*(r2<.08?.3:1.);
          float lit=step(r1,litRatio+.07*sin(cityTime*.045+r3*60.));
          vec3 lamp=(cs==4||cs==5)?mix(vec3(.78,.88,1.),vec3(1.,.9,.76),r3):mix(vec3(1.,.6,.28),vec3(1.,.84,.6),r3);
          lamp=mix(lamp,vec3(.4,.55,1.)*(.55+.45*sin(cityTime*8.+r2*30.)),step(.985,r2)*lit);
          float glow=mix(lit*(.4+.9*r3)*(curtain>.5?.55:1.)*mix(.7,1.1,f.y),litRatio*.7,lod);
          // Fire escapes: landings, rails and alternating ladders across two bays.
          float fe=0.;
          if((cs==0||cs==1)&&flags>.5){
            float feC=(floor(span*(.2+.6*fract(bSeed*7.13))/bw)+.5)*bw,feHW=bw*.95;
            float t=clamp((u-feC+feHW)/(2.*feHW),0.,1.);t=mod(id.y,2.)<1.?t:1.-t;
            float landing=.5-halfWin.y-.02;
            fe=step(abs(u-feC),feHW)*step(ground+P.x*.8,h)*step(h,H-parapet)*(1.-lod)
              *max(max(step(abs(f.y-landing),.02),step(abs(f.y-landing-1.*M/P.x),.012)),step(abs(f.y-landing-t*.9),.03)*.85);
          }
          float shop=(cs==1||cs==5)?step(.8*M,h)*step(h,ground-.6*M)*step(.12,fract(vFacade.x/(5.*M)))*step(fract(vFacade.x/(5.*M)),.88)*(1.-lod):0.;
          float pane=win*(1.-bars);
          diffuseColor.rgb=mix(mix(wall,glass,pane),vec3(.05),fe*.9)*(1.-.55*cityNight);
          totalEmissiveRadiance+=pane*(1.-fe)*(skyRef*refl*dayK+lamp*glow*cityNight*1.25);
          totalEmissiveRadiance+=vec3(1.,.72,.45)*shop*(.12*dayK+cityNight*.9)+vec3(1.,.55,.28)*cityNight*.05*(1.-smoothstep(0.,14.*M,h));
        }
      }`);
  };
  const box=new THREE.BoxGeometry(1,1,1),styles=new Float32Array(masses.length*4);
  const buildings=new THREE.InstancedMesh(box,facade,masses.length);
  masses.forEach((m,i)=>{
    buildings.setMatrixAt(i,matrix(X(m.d),Y((m.h0+m.h1)/2),m.z*M,m.depth*M,(m.h1-m.h0)*M,m.w*M));
    buildings.setColorAt(i,m.color);styles.set([m.style,m.seed,m.lit,m.flags],i*4);
  });
  box.setAttribute("aStyle",new THREE.InstancedBufferAttribute(styles,4));
  city.add(buildings);

  const mat=(color:string,roughness=.85,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
  function instanced(geometry:THREE.BufferGeometry,material:THREE.Material,list:THREE.Matrix4[]){const mesh=new THREE.InstancedMesh(geometry,material,Math.max(list.length,1));mesh.count=list.length;list.forEach((m,i)=>mesh.setMatrixAt(i,m));city.add(mesh);return mesh;}
  // Timber water tanks on steel stands.
  instanced(new THREE.BoxGeometry(4.6*M,3*M,4.6*M).translate(0,1.5*M,0),mat("#2c2b29",.6,.4),tanks);
  instanced(new THREE.CylinderGeometry(2.3*M,2.3*M,5*M,12).translate(0,5.5*M,0),mat("#6b4a35"),tanks);
  instanced(new THREE.ConeGeometry(2.6*M,2*M,12).translate(0,9*M,0),mat("#d6dade"),tanks);
  instanced(new THREE.ConeGeometry(1,1,4).translate(0,.5,0),mat("#6f8a80",.6,.3),crowns);
  instanced(new THREE.ConeGeometry(.9*M,1,6),mat("#9aa0a3",.4,.6),spires);
  const canopy=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:1,flatShading:true});materials.push(canopy);
  const treeMesh=instanced(new THREE.IcosahedronGeometry(1,1),canopy,trees);
  const frost=new THREE.Color("#e6ecf0");
  trees.forEach((_,i)=>treeMesh.setColorAt(i,new THREE.Color(pick(["#3e4f33","#4a5a36","#34462f","#56603a","#5b5046"])).lerp(frost,.3+random()*.3)));
  const beaconMat=new THREE.MeshBasicMaterial({color:"#ff3b2f"});materials.push(beaconMat);
  instanced(new THREE.SphereGeometry(1.4,8,6),beaconMat,beacons.map(p=>matrix(p.x,p.y,p.z,1,1,1)));

  // Ground on both shores and the river between them.
  const plane=(dFrom:number,dTo:number,h:number,m:THREE.Material)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry((dTo-dFrom)*M,16000*M),m);o.rotation.x=-Math.PI/2;o.position.set(X((dFrom+dTo)/2),Y(h),0);city.add(o);};
  plane(-40,585,-.05,mat("#8b8e92",1));plane(1000,6200,-.05,mat("#8b8e92",1));plane(585,1000,-3,mat("#2a3d47",.2,.1));

  // ── Suspension bridge: granite towers with twin arches, split roadway, catenary cables, suspenders and diagonal stays.
  const stone=mat("#9b8b76",.95),cableMat=mat("#3a3936",.6,.4),asphalt=mat("#3b3b39",.9);
  const P=(d:number,h:number,z:number)=>new THREE.Vector3(X(d),Y(h),(z+BZ)*M);
  const block=(d0:number,d1:number,h0:number,h1:number,z0:number,z1:number,m:THREE.Material)=>{const o=new THREE.Mesh(new THREE.BoxGeometry((d1-d0)*M,(h1-h0)*M,(z1-z0)*M),m);o.position.copy(P((d0+d1)/2,(h0+h1)/2,(z0+z1)/2));city.add(o);};
  for(const d of [470,1130])block(d-28,d+28,-3,45,-24,24,stone);
  for(const d of [660,940]){for(const [z0,z1] of [[-22,-13],[-4.5,4.5],[13,22]])block(d-8,d+8,-4,60,z0,z1,stone);block(d-8,d+8,60,84,-22,22,stone);block(d-9,d+9,84,87,-23,23,stone);block(d-8.5,d+8.5,-4,2,-23,23,stone);}
  for(const z of [-8.5,8.5])block(442,1158,36,39,z-4.5,z+4.5,asphalt);
  const struts:THREE.Matrix4[]=[],necklace:THREE.Matrix4[]=[],UP=new THREE.Vector3(0,1,0);
  const strut=(a:THREE.Vector3,b:THREE.Vector3)=>{dummy.position.copy(a).lerp(b,.5);dummy.quaternion.setFromUnitVectors(UP,b.clone().sub(a).normalize());dummy.scale.set(1,a.distanceTo(b),1);dummy.updateMatrix();struts.push(dummy.matrix.clone());dummy.quaternion.identity();};
  for(const z of [-13.5,13.5]){
    for(const [a,c,b] of [[[470,44],[565,58],[660,84]],[[660,84],[800,4],[940,84]],[[940,84],[1035,58],[1130,44]]]){
      const curve=new THREE.QuadraticBezierCurve3(P(a[0],a[1],z),P(c[0],c[1],z),P(b[0],b[1],z));
      city.add(new THREE.Mesh(new THREE.TubeGeometry(curve,48,.3,5,false),cableMat));
      for(let d=a[0]+10;d<b[0]-5;d+=10){const p=curve.getPoint((d-a[0])/(b[0]-a[0]));if(p.y>Y(40.5))strut(P(d,39,z),p);}
      for(let k=1;k<14;k++){const p=curve.getPoint(k/14);necklace.push(matrix(p.x,p.y,p.z,1,1,1));}
    }
    for(const tower of [660,940])for(const dir of [-1,1])for(let k=30;k<=130;k+=25)strut(P(tower,82,z),P(tower+dir*k,39,z));
  }
  instanced(new THREE.BoxGeometry(.16,1,.16),cableMat,struts);
  const necklaceMat=new THREE.MeshBasicMaterial({color:"#ffd9a0"});materials.push(necklaceMat);
  instanced(new THREE.SphereGeometry(.5,6,4),necklaceMat,necklace);
  // Traffic: headlights heading toward Brooklyn in one roadway, tail lights heading away in the other.
  const carMat=new THREE.MeshBasicMaterial({color:"#ffffff"});materials.push(carMat);
  const cars=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,.8,1.1),carMat,28);
  for(let i=0;i<28;i++)cars.setColorAt(i,new THREE.Color(i%2?"#ff4a36":"#fff1d2"));
  city.add(cars);

  function update(time:number,night:number){
    uniforms.cityNight.value=night;uniforms.cityTime.value=time;
    uniforms.cityHorizon.value.lerpColors(dayHorizon,nightHorizon,night);uniforms.cityZenith.value.lerpColors(dayZenith,nightZenith,night);
    beaconMat.color.setRGB(1,.23,.18).multiplyScalar(.12+night*(.25+1.2*Math.pow(Math.max(0,Math.sin(time*2.4)),8)));
    necklaceMat.color.setRGB(1,.85,.62).multiplyScalar(.2+night*1.7);
    carMat.color.setScalar(.35+night*1.4);
    for(let i=0;i<28;i++){
      const away=i%2===1,travel=(time*14*M*(away?1:.92)+i*53.7)%(700*M);
      dummy.position.set(away?X(450)-travel:X(1150)+travel,Y(39.6),(BZ+(away?-8.5:8.5)+(i%4<2?-2:2))*M);dummy.updateMatrix();cars.setMatrixAt(i,dummy.matrix);
    }
    cars.instanceMatrix.needsUpdate=true;
  }
  update(0,0);
  return { update };
}
