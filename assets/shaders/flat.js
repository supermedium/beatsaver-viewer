module.exports = {
  vertexShader : `
    varying vec2 uvs;
    void main() {
      uvs.xy = uv.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,

  fragmentShader: `
    varying vec2 uvs;
    uniform sampler2D src;

    void main() {
      gl_FragColor = texture2D(src, uvs);
    }
`};
