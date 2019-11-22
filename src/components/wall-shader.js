const COLORS = require('../constants/colors.js');

const WALL_COLOR = new THREE.Color(COLORS.NEON_RED);
const WALL_BG = new THREE.Color(COLORS.SKY_RED);


AFRAME.registerShader('wallShader', {
  schema: {
    iTime: {type: 'time', is: 'uniform'},
    hitRight: {type: 'vec3', is: 'uniform', default: {x: 0, y: 1, z: 0}},
    hitLeft: {type: 'vec3', is: 'uniform', default: {x: 0, y: 0, z: 0}}
  },

  vertexShader: `
    varying vec2 uvs;
    varying vec3 nrml;
    varying vec3 worldPos;
    void main() {
      uvs.xy = uv.xy;
      nrml.xyz = normal.xyz;
      vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      worldPos = (modelMatrix * vec4( position, 1.0 )).xyz;
      gl_Position = p;
    }
  `,

  fragmentShader: `
    varying vec2 uvs;
    varying vec3 nrml;
    varying vec3 worldPos;
    uniform float iTime;
    //uniform sampler2D env;
    uniform vec3 hitRight;
    uniform vec3 hitLeft;

    #define SEED 19.1254
    #define time (3.0 + iTime)/1000.0 * 0.15

    float noise(vec3 uv) {
      return fract(sin(uv.x*123243. + uv.y*424. + uv.z*642. + SEED) * 1524.);
    }

    vec3 drawCircle(vec3 p, vec3 center, float radius, float edgeWidth, vec3 color) {
      return color * (1.0 - smoothstep(radius, radius + edgeWidth, length(p - center)));
    }

    float smoothNoise(vec3 uvw, float frec){
      vec3 luvw = vec3(smoothstep(0.0, 1.0, fract(uvw.xy * frec)), fract(uvw.z * frec));
      vec3 id = floor(uvw * frec);
      float blt = noise(id);
      float brt = noise(id + vec3(1.0, 0.0, 0.0));
      float tlt = noise(id + vec3(0.0, 1.0, 0.0));
      float trt = noise(id + vec3(1.0, 1.0, 0.0));

      float blb = noise(id + vec3(0.0, 0.0, 1.0));
      float brb = noise(id + vec3(1.0, 0.0, 1.0));
      float tlb = noise(id + vec3(0.0, 1.0, 1.0));
      float trb = noise(id + vec3(1.0, 1.0, 1.0));

      float a = mix(blt, brt, luvw.x);
      float b = mix(tlt, trt, luvw.x);
      float c = mix(a, b, luvw.y);

      float d = mix(blb, brb, luvw.x);
      float e = mix(tlb, trb, luvw.x);
      float f = mix(d, e, luvw.y);

      return mix(c, f, luvw.z);
    }

    #define WALL_COLOR vec3(${WALL_COLOR.r}, ${WALL_COLOR.g}, ${WALL_COLOR.b})
    #define WALL_BG vec3(${WALL_BG.r}, ${WALL_BG.g}, ${WALL_BG.b})

    void main() {
      vec2 uv1 = uvs.xy-0.5;
      float angle = time / 10.0;
      vec2 uv;
      uv.x = uv1.x * cos(angle) - uv1.y * sin(angle);
      uv.y = uv1.y * cos(angle) + uv1.x * sin(angle);
      uv.x += sin(uv.y * 1.7 + time / 1.7) * 0.2;
      uv.y += sin(uv.x * 1.1 + time / 2.4) * 0.3;

      float w, r, bg;
      r = 0.;

      bg = smoothstep(0.5, 1.0, r) + smoothstep(0.5, 0.0, r);
      r = smoothstep(0.4, 0.50, r) - smoothstep(0.50, 0.6, r);
      w = smoothstep(0.97, 1.0, r);


      r += smoothstep(0.44, 0.50, abs(uv1.x));
      r += smoothstep(0.44, 0.50, abs(uv1.y));

      w += smoothstep(0.49, 0.498, abs(uv1.x));
      w += smoothstep(0.49, 0.498, abs(uv1.y));

      w *= 0.9;
      bg *= 0.5;

      vec3 COL = WALL_COLOR;
      vec3 BG = WALL_BG * 0.1;

      vec3 col = vec3(r * COL.r + w + BG.r, r * COL.g + w + BG.g, r * COL.b + w + BG.b);

      gl_FragColor = vec4(col, 0.7 + w);
    }
`

});
