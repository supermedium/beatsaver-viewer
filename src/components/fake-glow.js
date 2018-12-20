import {getGridUvs} from 'aframe-atlas-uvs-component';
require('../../vendor/BufferGeometryUtils');

const colorHelper = new THREE.Color();

const geometry = createGeometry();
const material = new THREE.MeshBasicMaterial({
  alphaMap: createAlphaMap(),
  transparent: true,
  vertexColors: THREE.VertexColors
});

/**
 * Fake glow using merged overlayed cylinders with alpha map.
 * Requires THREE.BufferGeometryUtils.
 */
AFRAME.registerComponent('fake-glow', {
  schema: {
    color: {default: '#FFF'}
  },

  play: function () {
    this.el.setObject3D('mesh', new THREE.Mesh(createGeometry(this.data.color), material));
  }
});

function createAlphaMap () {
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.height = 1;
  alphaCanvas.width = 4;

  const ctx = alphaCanvas.getContext('2d');

  // For first color.
  ctx.fillStyle = 'rgb(10, 10, 10)';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = 'rgb(15, 15, 15)';
  ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = 'rgb(23, 23 ,23)';
  ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = 'rgb(28, 28, 28)';
  ctx.fillRect(3, 0, 1, 1);

  setTimeout(() => {
    alphaCanvas.style.position = 'fixed';
    alphaCanvas.style.zIndex = 999999999999;
    alphaCanvas.style.left = 0;
    alphaCanvas.style.top = 0;
    document.body.appendChild(alphaCanvas);
  }, 1000);
  return new THREE.CanvasTexture(alphaCanvas);
}

function createGeometry (color) {
  var i;
  colorHelper.set(color);

  const cylinders = [
    {height: 0.1831, radius: 0.0055},
    {height: 0.1832, radius: 0.0065},
    {height: 0.1833, radius: 0.0075},
    {height: 0.1834, radius: 0.0085}
  ];

  const geometries = cylinders.map((cylinderData, i) => {
    const cylinder = new THREE.CylinderBufferGeometry(
      cylinderData.radius,
      cylinderData.radius,
      cylinderData.height
    );

    const colorArray = [];
    for (i = 0; i < cylinder.attributes.position.array.length; i += 3) {
      colorArray[i] = colorHelper.r;
      colorArray[i + 1] = colorHelper.g;
      colorArray[i + 2] = colorHelper.b;
    }
    cylinder.addAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));

    const alphaUvs = getGridUvs(0, i, 1, 4);
    const uvs = cylinder.attributes.uv.array;
    for (i = 0; i < uvs.length; i += 6) {
      uvs[i] = alphaUvs[0].x;
      uvs[i + 1] = alphaUvs[0].y;

      uvs[i + 2] = alphaUvs[1].x;
      uvs[i + 3] = alphaUvs[1].y;

      uvs[i + 4] = alphaUvs[2].x;
      uvs[i + 5] = alphaUvs[2].y;
    }
    cylinder.attributes.uv.needsUpdate = true;

    return cylinder;
  });

  const geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
  return geometry
}
