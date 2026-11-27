import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec3 uViolet;
  uniform vec3 uGold;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.02;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.012;
    vec2 p = uv * 2.6 + vec2(t, -t * 0.35);

    float n1 = fbm(p + fbm(p * 1.7 + t));
    float n2 = fbm(p * 0.7 - t * 0.8 + 12.0);
    float cloud = smoothstep(0.32, 0.95, n1 * 0.68 + n2 * 0.5);

    vec3 color = vec3(0.018, 0.011, 0.038);
    color = mix(color, uViolet * 0.5, cloud * (0.35 + 0.4 * uv.y));

    float gold = smoothstep(0.63, 1.0, fbm(p * 0.9 + 31.0 - t));
    color += uGold * gold * 0.09 * (1.0 - uv.y);

    float bloom = distance(uv, uPointer);
    color += uViolet * 0.08 * smoothstep(0.6, 0.0, bloom);

    float vignette = smoothstep(1.3, 0.2, length(uv - 0.5));
    color *= 0.5 + 0.5 * vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function NebulaPlane() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.55) },
      uViolet: { value: new THREE.Color('#4b1d7a') },
      uGold: { value: new THREE.Color('#8a6e14') },
    }),
    [],
  );

  useFrame((state, delta) => {
    const shader = material.current;
    if (!shader) return;

    shader.uniforms.uTime!.value += Math.min(delta, 0.05);
    const targetX = (state.pointer.x + 1) / 2;
    const targetY = (state.pointer.y + 1) / 2;
    const pointer = shader.uniforms.uPointer!.value as THREE.Vector2;
    pointer.x += (targetX - pointer.x) * 0.02;
    pointer.y += (targetY - pointer.y) * 0.02;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

function Stars() {
  const geometry = useMemo(() => {
    let seed = 90210;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    const positions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i += 1) {
      positions[i * 3] = (next() - 0.5) * 16;
      positions[i * 3 + 1] = (next() - 0.5) * 10;
      positions[i * 3 + 2] = -1 - next() * 4;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  const points = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (points.current) {
      points.current.rotation.z += delta * 0.004;
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        color="#ede7f6"
        size={0.035}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function NebulaScene() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ position: [0, 0, 1], fov: 50 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <NebulaPlane />
      <Stars />
    </Canvas>
  );
}
