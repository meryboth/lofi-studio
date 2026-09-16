import * as THREE from "three";

// Framed prints: a pair above the DJ table on the brick pier (face x −5.8) and a larger piece high on the
// double-height rear wall (face z −4.6). Artwork is drawn on canvas in the loft's palette, except the "Las Malvinas son
// argentinas" (todo bien posta) and computer prints loaded from public/art.
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
    return {canvas,tex};
  }
  // A print from public/art, cover-fitted over the canvas once it loads (paper tone until then).
  function print(target:{canvas:HTMLCanvasElement;tex:THREE.Texture},src:string){
    const image=new Image();
    image.onload=()=>{
      const {canvas,tex}=target,c=canvas.getContext("2d")!,s=Math.max(canvas.width/image.width,canvas.height/image.height);
      c.drawImage(image,(canvas.width-image.width*s)/2,(canvas.height-image.height*s)/2,image.width*s,image.height*s);
      tex.needsUpdate=true;
    };
    image.src=src;
  }
  const paper:Draw=(c,w,h)=>{c.fillStyle=C.paper;c.fillRect(0,0,w,h);};

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

  // Centred on the brick between the window pier (z 7.85) and the rear wall (z 11.8), over the DJ table; turn π/2
  // faces the room from the pier. Two equal frames sized for a 4:5 print inside the mat (1.04 × 1.3); the computer
  // print (≈3:4) is cover-cropped a little top and bottom.
  const pier=-5.775,side=Math.PI/2;
  print(piece(pier,2.75,9.045,side,1.2,1.46,frames.black,.08,paper),"/art/malvinas.jpg");
  print(piece(pier,2.75,10.555,side,1.2,1.46,frames.black,.08,paper),"/art/compu.jpg");
  // A larger piece high on the double-height rear wall, above the existing gallery.
  piece(2.75,5.3,-4.577,0,1.15,1.45,frames.black,.09,ranges);
}
