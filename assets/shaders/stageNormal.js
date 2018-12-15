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
    #define FOG_RADIUS  55.0
    #define FOG_FALLOFF 48.0
    #define FOG_COLOR_MULT 0.8
    varying vec2 uvs;
    varying vec3 worldPos;
    uniform vec3 skyColor;
    uniform vec3 backglowColor;
    uniform sampler2D src;

    void main() {
      vec4 col = texture2D(src, uvs);
      float mask;

      // bg
      mask = step(0.5, uvs.x);
      col.xyz = mix(col.xyz * skyColor, col.xyz, mask);

      // backglow
      mask = step(0.5, uvs.x) * step(0.5, uvs.y) * (1.0 - step(0.75, uvs.x));
      col.xyz = mix(col.xyz, col.xyz * backglowColor, mask);

      float fogDensity = 1.0 - pow(clamp(distance(worldPos, vec3(0., 0., -FOG_RADIUS)) / FOG_FALLOFF, 0.0, 1.0), 1.5);
      fogDensity += clamp(0.2 - pow(distance(worldPos, vec3(0.0, 0.0, worldPos.z)) / 10.0, 2.0), 0.0, 1.0);
      col.xyz = mix(col.xyz, backglowColor * FOG_COLOR_MULT, fogDensity);

      gl_FragColor = col;
    }
  `
};
