import * as THREE from 'three';

export class WarpRenderer {
  constructor({ canvas }) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.texture = new THREE.Texture();
    this.texture.flipY = true;
    this.texture.needsUpdate = true;

    this.uniforms = {
      uTex: { value: this.texture },
      uHinv: { value: new THREE.Matrix3() }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform mat3 uHinv;
        varying vec2 vUv;

        void main() {
          // vUv is in [0..1] for the screen pixel
          // We want to find where this pixel came from in source UV
          vec3 p = uHinv * vec3(vUv.x, vUv.y, 1.0);
          vec2 uv = p.xy / p.z;

          // Outside source -> black
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          gl_FragColor = texture2D(uTex, uv);
        }
      `
    });

    const geom = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geom, material);
    this.scene.add(this.mesh);

    this.setSizeFromCss();
  }

  setSizeFromCss() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    this.renderer.setSize(w, h, false);
  }

  setSourceCanvas(sourceCanvas) {
    this.texture.image = sourceCanvas;
    this.texture.needsUpdate = true;
  }

  // H maps source UV -> screen UV. We render by sampling with H^-1.
  setHomographyUvToScreenUv(H) {
    if (!H) return;

    const Hinv = invertHomography3x3(H);
    if (!Hinv) return;

    // Fill Three.js Matrix3 (column-major)
    this.uniforms.uHinv.value.set(
      Hinv[0], Hinv[3], Hinv[6],
      Hinv[1], Hinv[4], Hinv[7],
      Hinv[2], Hinv[5], Hinv[8]
    );
  }

  render() {
    this.texture.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}

// --- Small 3x3 inverse ---
function invertHomography3x3(H) {
  const a = H[0], b = H[1], c = H[2];
  const d = H[3], e = H[4], f = H[5];
  const g = H[6], h = H[7], i = H[8];

  const A =   e * i - f * h;
  const B = -(d * i - f * g);
  const C =   d * h - e * g;
  const D = -(b * i - c * h);
  const E =   a * i - c * g;
  const F = -(a * h - b * g);
  const G =   b * f - c * e;
  const Hc = -(a * f - c * d);
  const I =   a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;

  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, Hc * invDet,
    C * invDet, F * invDet, I * invDet
  ];
}
