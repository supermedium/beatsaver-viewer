module.exports = {
  vertexShader : `
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
    uniform vec3 tunnelNeon;
    uniform vec3 leftLaser;
    uniform vec3 rightLaser;
    uniform vec3 floorNeon;
    uniform vec3 textGlow;
    uniform sampler2D src;

    void main() {
      float mask;
      vec4 col = texture2D(src, uvs);

      // tunnel neon
      mask = step(0.87, uvs.x) *  step(0.5, uvs.y) * (1.0 - step(0.935, uvs.x)) * ( 1.0 - step(0.75, uvs.y));
      col.xyz = mix(col.xyz, col.xyz * tunnelNeon, mask);

      // floor & corridor neons
      mask = step(0.935, uvs.x) * step(0.5, uvs.y) * ( 1.0 - step(0.75, uvs.y));
      col.xyz = mix(col.xyz, col.xyz * floorNeon, mask);

      // left laser
      mask = step(0.5, uvs.x) * (1.0 - step(0.625, uvs.x)) * (1.0 - step(0.5, uvs.y));
      col.xyz = mix(col.xyz, col.xyz * leftLaser, mask);

      // right laser
      mask = step(0.625, uvs.x) * (1.0 - step(0.75, uvs.x)) * (1.0 - step(0.5, uvs.y));
      col.xyz = mix(col.xyz, col.xyz * rightLaser, mask);

      // text glows
      mask = step(0.87, uvs.x) *  step(0.25, uvs.y) * (1.0 - step(0.935, uvs.x)) * ( 1.0 - step(0.5, uvs.y));
      col.xyz = mix(col.xyz, col.xyz * textGlow, mask);

      gl_FragColor = col;
    }
  `
};
