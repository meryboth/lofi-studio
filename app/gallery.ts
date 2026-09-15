import * as THREE from "three";

// Framed prints: a matched pair above the DJ table on the brick pier (face x −5.8) and two larger pieces high on the
// double-height rear wall (face z −4.6). All artwork is original, drawn on canvas in the loft's palette — no external images.
export function addGallery(scene: THREE.Scene, materials: THREE.Material[], textures: THREE.Texture[]) {
  const C = { cream: "#efe6d2", paper: "#f4efe4", ink: "#1f2226", terracotta: "#c4552f", ochre: "#d9a441", teal: "#2f5a73", olive: "#6b7a4b", rose: "#d98f8a", blue: "#3a5f9e", navy: "#1b2233", sand: "#e2c9a0" };
  let seed=5171;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const mat=(color:string,roughness=.8,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
  const frames={black:mat("#1c1c1b",.45,.2),oak:mat("#9c7248",.6),brass:mat("#b08d57",.35,.65),white:mat("#e9e5dc",.6)};
  const matboard=mat(C.paper,.95);
  type Draw=(c:CanvasRenderingContext2D,w:number,h:number)=>void;

  function piece(x:number,y:number,z:number,turn:number,w:number,h:number,frame:THREE.Material,border:number,draw:Draw){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=turn;scene.add(g);
    const rim=.03,f=new THREE.Mesh(new THREE.BoxGeometry(w+rim*2,h+rim*2,.045),frame);f.castShadow=true;f.receiveShadow=true;g.add(f);
    const face=(pw:number,ph:number,m:THREE.Material,depth:number)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph),m);o.position.z=depth;o.receiveShadow=true;g.add(o);};
    if(border>0)face(w,h,matboard,.025);
    const aw=w-border*2,ah=h-border*2,cw=512,ch=Math.round(512*ah/aw);
    const canvas=document.createElement("canvas");canvas.width=cw;canvas.height=ch;
    const c=canvas.getContext("2d")!;draw(c,cw,ch);
    for(let i=0;i<2200;i++){c.fillStyle=i%2?"rgba(0,0,0,.035)":"rgba(255,255,255,.04)";c.fillRect(random()*cw,random()*ch,1.5,1.5);}
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;textures.push(tex);
    const art=new THREE.MeshStandardMaterial({map:tex,roughness:.85});materials.push(art);face(aw,ah,art,.027);
  }

  // Swiss-style jazz bill for the (fictional) night sessions.
  const jazz:Draw=(c,w,h)=>{
    c.fillStyle=C.cream;c.fillRect(0,0,w,h);
    c.globalCompositeOperation="multiply";
    c.fillStyle=C.blue;c.beginPath();c.arc(w*.38,h*.33,w*.32,0,Math.PI*2);c.fill();
    c.fillStyle=C.terracotta;c.beginPath();c.arc(w*.64,h*.47,w*.22,0,Math.PI*2);c.fill();
    c.globalCompositeOperation="source-over";
    c.fillStyle=C.ink;for(let i=0;i<7;i++)c.fillRect(w*(.1+i*.04),h*(.64-(i%3)*.03),w*.018,h*(.14+(i%3)*.03));
    c.fillRect(w*.1,h*.855,w*.8,2);
    c.font=`700 ${Math.round(w*.1)}px Helvetica, Arial, sans-serif`;c.fillText("SESIONES",w*.1,h*.84);
    c.font=`500 ${Math.round(w*.034)}px Helvetica, Arial, sans-serif`;c.fillText("LO FI STUDIO · BLUE HOURS · 21 H",w*.1,h*.91);
    c.fillText("VIERNES",w*.72,h*.91);
  };
  // Paper cut-outs: loose leaf and star shapes on ochre.
  const cutouts:Draw=(c,w,h)=>{
    c.fillStyle=C.ochre;c.fillRect(0,0,w,h);
    const blob=(cx:number,cy:number,r:number,color:string,rot:number,lobes:number)=>{
      c.save();c.translate(cx,cy);c.rotate(rot);c.fillStyle=color;c.beginPath();
      for(let i=0;i<=lobes*2;i++){const a=i/(lobes*2)*Math.PI*2,rr=r*(i%2?.5:1)*(.85+random()*.3),px=Math.cos(a)*rr,py=Math.sin(a)*rr*1.35;
        if(i===0)c.moveTo(px,py);else c.quadraticCurveTo(Math.cos(a-.28)*rr*1.2,Math.sin(a-.28)*rr*1.55,px,py);}
      c.closePath();c.fill();c.restore();
    };
    blob(w*.34,h*.3,w*.26,C.teal,.3,5);blob(w*.7,h*.62,w*.2,C.ink,-.5,4);blob(w*.3,h*.76,w*.16,C.rose,1.2,6);blob(w*.74,h*.2,w*.1,C.cream,.2,5);blob(w*.55,h*.45,w*.07,C.terracotta,0,4);
  };
  // Woven arches, like a hand-loomed textile.
  const arches:Draw=(c,w,h)=>{
    c.fillStyle=C.terracotta;c.fillRect(0,0,w,h);
    const colors=[C.cream,C.ochre,C.rose,C.teal],unit=w/4;
    for(let row=0;row<3;row++)for(let k=0;k<4;k++){
      const cx=unit*(k+.5)+(row%2?unit*.5:0),cy=h*(.36+row*.3);
      for(let ring=0;ring<4;ring++){c.strokeStyle=colors[(ring+k+row)%4];c.lineWidth=unit*.07;c.beginPath();c.arc(cx,cy,unit*(.42-ring*.1),Math.PI,Math.PI*2);c.stroke();}
    }
  };
  // Layered mountains under an ochre sun.
  const ranges:Draw=(c,w,h)=>{
    c.fillStyle=C.sand;c.fillRect(0,0,w,h);
    c.fillStyle=C.ochre;c.beginPath();c.arc(w*.66,h*.28,w*.16,0,Math.PI*2);c.fill();
    [[C.rose,.46],[C.olive,.58],[C.teal,.7],[C.navy,.82]].forEach(([color,base],i)=>{
      c.fillStyle=color as string;c.beginPath();c.moveTo(0,h);
      for(let x=0;x<=w;x+=w/8){c.lineTo(x,h*((base as number)-.08*Math.abs(Math.sin(x/w*Math.PI*(2+i)+i))-random()*.03));}
      c.lineTo(w,h);c.closePath();c.fill();
    });
  };

  // A matched pair centred on the brick between the window pier (z 7.85) and the rear wall (z 11.8), over the DJ table;
  // turn π/2 faces the room from the pier.
  const pier=-5.775,side=Math.PI/2;
  piece(pier,2.6,9.255,side,.85,1.1,frames.black,.08,jazz);
  piece(pier,2.6,10.345,side,.85,1.1,frames.black,.08,cutouts);
  // Larger pieces high on the double-height rear wall, above the existing gallery.
  piece(-.55,5.45,-4.577,0,1.6,1.25,frames.oak,0,arches);
  piece(2.75,5.3,-4.577,0,1.15,1.45,frames.black,.09,ranges);
}
