AFRAME.registerShader('stageShader', {
  schema: {
    color: {type: 'vec3', is: 'uniform', default: {x: 0, y: 0, z: 0}},
    fogColor: {type: 'vec3', is: 'uniform', default: {x: 0, y: 0.48, z: 0.72}},
    src: {type: 'map', is: 'uniform'},

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
    #define FOG_RADIUS  50.0
    #define FOG_FALLOFF 45.0
    varying vec2 uvs;
    varying vec3 worldPos;
    uniform vec3 color;
    uniform vec3 fogColor;
    uniform sampler2D src;

    void main() {
      vec4 col = texture2D(src, uvs);
      col.xyz = mix(fogColor, col.xyz, clamp(distance(worldPos, vec3(0., 0., -FOG_RADIUS)) / FOG_FALLOFF, 0., 1.));
      gl_FragColor = col;
    }
  `
});
