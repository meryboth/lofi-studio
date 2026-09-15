import * as THREE from "three";

// Snowfall outside the loft: a deep volume beyond the west glazing, a denser curtain just past the glass, and a shallow
// layer over the skylight whose flakes vanish as they reach the roof glass. Flakes move entirely in the vertex shader
// (fall, sway, wind drift, wrap), so each frame only touches a few shared uniforms.
export function addSnow(scene: THREE.Scene, materials: THREE.Material[]) {
  const shared = { uTime: { value: 0 }, uDensity: { value: .35 }, uWind: { value: .35 }, uNight: { value: 0 }, uTint: { value: new THREE.Color("#bfe9ff") }, uScale: { value: 1000 } };
  let seed = 1291; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function layer(count: number, min: THREE.Vector3, max: THREE.Vector3, size: number) {
    const positions = new Float32Array(count * 3), seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions.set([min.x + random() * (max.x - min.x), min.y + random() * (max.y - min.y), min.z + random() * (max.z - min.z)], i * 3);
      seeds.set([random(), random()], i * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 2));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { ...shared, uMin: { value: min }, uMax: { value: max }, uSize: { value: size } },
      vertexShader: `attribute vec2 aSeed;
        uniform float uTime, uDensity, uWind, uScale, uSize; uniform vec3 uMin, uMax; varying float vAlpha;
        void main(){
          vec3 span=uMax-uMin; float speed=.55+aSeed.x*.9; vec3 p=position;
          p.y=uMax.y-mod(uMax.y-position.y+uTime*speed,span.y);
          p.z=uMin.z+mod(position.z-uMin.z+uTime*uWind*speed*.7,span.z);
          p.x+=sin(uTime*(.5+aSeed.y)+aSeed.x*40.)*.22;
          p.z+=cos(uTime*(.4+aSeed.x*.6)+aSeed.y*30.)*.18;
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          float on=step(aSeed.y,uDensity), h=(p.y-uMin.y)/span.y;
          gl_PointSize=on*uSize*(.6+aSeed.x*.8)*uScale/max(-mv.z,.5);
          vAlpha=on*(1.-smoothstep(30.,110.,-mv.z))*smoothstep(0.,.06,h)*(1.-smoothstep(.92,1.,h));
        }`,
      fragmentShader: `uniform float uNight; uniform vec3 uTint; varying float vAlpha;
        void main(){
          float a=(1.-smoothstep(.12,.5,length(gl_PointCoord-.5)))*vAlpha;
          if(a<.01)discard;
          gl_FragColor=vec4(mix(vec3(1.,.98,.96),mix(vec3(.78,.84,.97),uTint,.4),uNight),a*.9);
          #include <colorspace_fragment>
        }`,
    });
    materials.push(material);
    const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.renderOrder = 1; scene.add(points);
  }
  layer(14000, new THREE.Vector3(-70, -9, -50), new THREE.Vector3(-6.4, 24, 55), .07);
  layer(5000, new THREE.Vector3(-17, -6, -9), new THREE.Vector3(-6.3, 12, 13), .05);
  layer(2200, new THREE.Vector3(-5.7, 8.45, -4.3), new THREE.Vector3(3.1, 17, 7.5), .05);

  function update(time: number, o: { density: number; wind: number; night: number; tint: THREE.Color; pixelScale: number }) {
    shared.uTime.value = time; shared.uDensity.value = o.density; shared.uWind.value = o.wind; shared.uNight.value = o.night;
    shared.uTint.value.copy(o.tint); shared.uScale.value = o.pixelScale;
  }
  return { update };
}
