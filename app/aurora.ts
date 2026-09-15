import * as THREE from "three";

// A continuous world-space sky, shared by the window and skylight openings.
// Colours, sway and pulse come from the playing record's mood (see moods.ts); `beat` is a decaying onset envelope.
export function createAurora() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      time: { value: 0 }, intensity: { value: 0 }, bass: { value: 0 }, high: { value: 0 }, beat: { value: 0 }, sway: { value: 1 },
      colorA: { value: new THREE.Color("#39e5b1") }, colorB: { value: new THREE.Color("#cd4bff") }, colorC: { value: new THREE.Color("#4588ff") },
    },
    vertexShader: `varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `precision highp float;
      varying vec3 direction;
      uniform float time, intensity, bass, high, beat, sway;
      uniform vec3 colorA, colorB, colorC;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.;float a=.5;for(int j=0;j<4;j++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return v;}
      void main(){
        vec3 d=normalize(direction);
        vec2 uv=vec2(atan(d.z,-d.x),asin(d.y));
        vec3 day=mix(vec3(.72,.36,.48),vec3(.22,.32,.53),smoothstep(-.4,1.2,d.y));
        day+=vec3(.38,.19,.08)*exp(-pow(d.y+.1,2.)*9.);
        vec3 night=mix(vec3(.015,.023,.073),vec3(.05,.035,.14),max(d.y,0.));
        float drift=time*.085;
        float warp=fbm(vec2(uv.x*2.7,drift*.4));
        for(int i=0;i<7;i++){
          float f=float(i);
          float ridge=-.04+f*.145+(sin(uv.x*2.2+drift+f*.7)*(.12+bass*.07)+sin(uv.x*5.-drift*.8+f)*.055)*sway+(warp-.5)*.26+beat*.012*sin(f*1.7);
          float delta=uv.y-ridge;
          float curtain=exp(-max(delta,0.)*(6.+f*.7))*smoothstep(-.025,.018,delta);
          float folds=pow(fbm(vec2(uv.x*65.+warp*5.,drift+f)),2.)*1.8;
          float rays=.5+.5*sin(uv.x*180.+warp*16.+drift*(1.+high));
          float veil=curtain*folds*(.7+.3*rays);
          // Each curtain drifts between the base colour and accent streaks, fading to the fringe colour as it rises.
          vec3 base=mix(colorA,colorC,smoothstep(.55,.85,noise(vec2(uv.x*1.4+drift*.3,f*.61))));
          night+=mix(base,colorB,smoothstep(.04,.42,delta))*veil*(.24+bass*.22+high*.3+beat*.3);
          night+=base*exp(-abs(delta)*110.)*(.07+bass*.06+beat*.1)*folds;
        }
        vec2 grid=uv*200.;float star=step(.995,hash(floor(grid)))*pow(max(0.,1.-length(fract(grid)-.5)*2.),6.);
        night+=vec3(star)*(.4+.25*sin(time*.3+uv.x*19.));
        gl_FragColor=vec4(mix(day,night,intensity),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
