import * as THREE from "three";

// Framed prints: a salon wall above the DJ table on the brick pier (face x −5.8) and two larger pieces high on the
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
  // Sun sinking into striped water.
  const horizon:Draw=(c,w,h)=>{
    const sky=c.createLinearGradient(0,0,0,h*.6);sky.addColorStop(0,C.rose);sky.addColorStop(1,C.sand);c.fillStyle=sky;c.fillRect(0,0,w,h);
    c.fillStyle=C.terracotta;c.beginPath();c.arc(w*.5,h*.6,w*.25,Math.PI,Math.PI*2);c.fill();
    c.fillStyle=C.navy;c.fillRect(0,h*.6,w,h*.4);
    c.fillStyle=C.sand;for(let i=0;i<9;i++){const bw=w*(.5-i*.045);c.fillRect(w*.5-bw/2,h*(.64+i*.04),bw,h*.012);}
  };
  // Continuous-line monstera in a pot, with a red accent.
  const plant:Draw=(c,w,h)=>{
    c.fillStyle=C.paper;c.fillRect(0,0,w,h);c.strokeStyle=C.ink;c.lineWidth=w*.012;c.lineCap="round";c.lineJoin="round";
    c.beginPath();c.moveTo(w*.34,h*.72);c.lineTo(w*.66,h*.72);c.lineTo(w*.61,h*.93);c.lineTo(w*.39,h*.93);c.closePath();c.stroke();
    c.beginPath();c.moveTo(w*.5,h*.72);c.bezierCurveTo(w*.5,h*.6,w*.44,h*.52,w*.46,h*.44);c.stroke();
    c.beginPath();c.moveTo(w*.46,h*.44);c.bezierCurveTo(w*.12,h*.42,w*.1,h*.12,w*.46,h*.1);c.bezierCurveTo(w*.86,h*.08,w*.9,h*.4,w*.46,h*.44);c.stroke();
    for(let i=0;i<5;i++){const t=.18+i*.05;c.beginPath();c.moveTo(w*.46,h*(t+.06));c.lineTo(w*(i%2?.28:.66),h*(t+.02));c.stroke();}
    c.beginPath();c.moveTo(w*.5,h*.62);c.bezierCurveTo(w*.62,h*.56,w*.78,h*.6,w*.8,h*.48);c.stroke();
    c.fillStyle=C.terracotta;c.beginPath();c.arc(w*.8,h*.2,w*.045,0,Math.PI*2);c.fill();
  };
  // Colour study: swatch grid with one circle.
  const swatches:Draw=(c,w,h)=>{
    c.fillStyle=C.paper;c.fillRect(0,0,w,h);
    const palette=[C.terracotta,C.ochre,C.teal,C.rose,C.olive,C.blue,C.sand,C.ink,C.cream,C.navy,C.terracotta,C.olive];
    const cols=6,rows=2,pad=w*.05,gap=w*.02,sw=(w-pad*2-gap*(cols-1))/cols,sh=(h-pad*2-gap*(rows-1)-h*.12)/rows;
    c.font=`500 ${Math.round(w*.022)}px Helvetica, Arial, sans-serif`;
    for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const x=pad+k*(sw+gap),y=pad+r*(sh+gap);c.fillStyle=palette[r*cols+k];c.fillRect(x,y,sw,sh);if(r===0&&k===3){c.fillStyle=C.cream;c.beginPath();c.arc(x+sw/2,y+sh/2,sw*.3,0,Math.PI*2);c.fill();}}
    c.fillStyle=C.ink;c.fillText("ESTUDIO DE COLOR — N.º 7",pad,h-pad*.9);
  };
  // Halftone moon lit from the left.
  const moon:Draw=(c,w,h)=>{
    c.fillStyle=C.navy;c.fillRect(0,0,w,h);c.fillStyle=C.cream;
    const cx=w*.5,cy=h*.46,R=w*.34,step=12;
    for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const dx=(x-cx)/R,dy=(y-cy)/R,d=dx*dx+dy*dy;if(d>1)continue;const lit=Math.max(0,.9-(dx+1)*.38);c.beginPath();c.arc(x,y,step*.5*Math.sqrt(lit),0,Math.PI*2);c.fill();}
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

  // Salon wall above the DJ table (turn π/2 faces the room from the pier).
  const pier=-5.775,side=Math.PI/2;
  piece(pier,2.6,9.05,side,.9,1.2,frames.black,.08,jazz);
  piece(pier,3.65,9.1,side,1,.55,frames.oak,.05,swatches);
  piece(pier,2.85,10.3,side,.7,.9,frames.white,.06,cutouts);
  piece(pier,1.95,10.2,side,.5,.5,frames.brass,.05,horizon);
  piece(pier,2.25,11.2,side,.42,.58,frames.black,.05,plant);
  piece(pier,2.05,8.2,side,.38,.48,frames.brass,.04,moon);
  // Larger pieces high on the double-height rear wall, above the existing gallery.
  piece(-.55,5.45,-4.577,0,1.6,1.25,frames.oak,0,arches);
  piece(2.75,5.3,-4.577,0,1.15,1.45,frames.black,.09,ranges);
}
