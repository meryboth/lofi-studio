import * as THREE from 'three';

export function agedBrick(textures:THREE.Texture[]) {
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
  const c=canvas.getContext('2d')!;
  let seed=173;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle='#82776a';c.fillRect(0,0,2048,1024);
  for(let row=0;row<16;row++)for(let col=-1;col<17;col++){
    const x=col*128+(row%2)*64,y=row*64;
    const shade=random()*35;
    c.fillStyle=`rgb(${104+shade},${65+shade*.7},${49+shade*.55})`;
    c.fillRect(x+3+random()*2,y+3,120,56);
    for(let n=0;n<100;n++){
      c.fillStyle=random()>.5?'#e1c9a018':'#261c1825';
      c.fillRect(x+5+random()*115,y+5+random()*51,random()*15+1,random()*5+1);
    }
    if(random()>.6){c.strokeStyle='#c5b7a760';c.lineWidth=2;c.beginPath();c.moveTo(x+8,y+5);c.lineTo(x+40+random()*65,y+5+random()*3);c.stroke();}
  }
  for(let n=0;n<220;n++){
    const x=random()*2048,y=random()*1024,r=20+random()*100;
    const fade=c.createRadialGradient(x,y,0,x,y,r);fade.addColorStop(0,n%3?'#ccbda51c':'#211b1724');fade.addColorStop(1,'transparent');c.fillStyle=fade;c.fillRect(x-r,y-r,r*2,r*2);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.push(texture);
  return new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.028,roughness:.97});
}
