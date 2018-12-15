
const COLORS = require('../constants/colors.js');
const HIT_COLOR = new THREE.Color(COLORS.NEON_RED);
const BORDER_COLOR = new THREE.Color(COLORS.NEON_BLUE);

AFRAME.registerShader('floorShader', {
  schema: {
    normalMap: {type: 'map', is: 'uniform'},
    envMap: {type: 'map', is: 'uniform'},
    hitRight: {type: 'vec3', is: 'uniform', default: {x: 0, y: 1, z: 0}},
    hitLeft: {type: 'vec3', is: 'uniform', default: {x: 0, y: 0, z: 0}}
  },

  vertexShader: `
    varying vec2 uvs;
    varying vec3 worldPos;
    void main() {
      uvs.xy = uv.xy;
      vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      worldPos = (modelMatrix * vec4( position, 1.0 )).xyz;
      gl_Position = p;
    }
  `,

  fragmentShader: `
    varying vec2 uvs;
    varying vec3 worldPos;
    uniform vec3 color;
    uniform sampler2D normalMap;
    uniform sampler2D envMap;
    uniform vec3 hitRight;
    uniform vec3 hitLeft;

    #define HIT_COLOR vec3(${HIT_COLOR.r}, ${HIT_COLOR.g}, ${HIT_COLOR.b})
    #define BORDER_COLOR vec3(${BORDER_COLOR.r}, ${BORDER_COLOR.g}, ${BORDER_COLOR.b})

    vec3 drawCircle(vec3 p, vec3 center, float radius, float edgeWidth, vec3 color) {
      return color*(1.0-smoothstep(radius, radius+edgeWidth, length(p-center)));
    }

    void main() {
      vec2 p = uvs.xy - 0.5;
      vec3 border = vec3(smoothstep(0.49, 0.495, abs(p.x)) + smoothstep(0.49, 0.495, abs(p.y)));
      border += BORDER_COLOR * (smoothstep(0.475, 0.495, abs(p.x)) + smoothstep(0.475, 0.495, abs(p.y))) * .7;
      p*= 4.0;

      vec3 hitColor = HIT_COLOR;
      vec3 hit = vec3(0.0);

      hit += drawCircle(worldPos, hitRight, 0.04, 0.05, hitColor);
      hit += drawCircle(worldPos, hitRight, 0.02, 0.03, vec3(0.7, 0.7, 0.7));
      hit += drawCircle(worldPos, hitLeft, 0.04, 0.05, hitColor);
      hit += drawCircle(worldPos, hitLeft, 0.02, 0.03, vec3(0.7, 0.7, 0.7));

      vec3 normal = normalize(texture2D(normalMap, uvs).xyz);

      // environment reflection
      vec3 reflectVec = normalize(reflect(normalize(worldPos - cameraPosition), normal));
      //vec3 reflectView = normalize((viewMatrix * vec4(reflectVec, 0.0)).xyz + vec3(0.0, 0.0, 1.0));

      vec3 ref = texture2D(envMap, reflectVec.xy * vec2(0.3, 1.0) + vec2(0.75, -cameraPosition.z * 0.05)).xyz * 0.14;

      gl_FragColor = vec4(ref + border + hit, 1.0);
    }
  `
});
