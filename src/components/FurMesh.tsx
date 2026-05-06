"use client";

import { useRef, useMemo } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ---------- noise texture generation ----------

function generateNoiseTexture(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const idx = i * 4;
    data[idx] = Math.floor(Math.random() * 255);
    data[idx + 1] = Math.floor(Math.random() * 60 + 195);
    data[idx + 2] = 0;
    data[idx + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// ---------- shell shader injections ----------

const SHELL_VERTEX_DECL = /* glsl */ `
uniform float uShellHeight;
uniform float uMaxHeight;
uniform mat4 uBrushMatrix;
varying float vNormHeight;
varying vec2 vShellUv;
`;

const SHELL_VERTEX_BODY = /* glsl */ `
vec3 brushedNormal = (uBrushMatrix * vec4(objectNormal, 0.0)).xyz;
transformed += uShellHeight * brushedNormal;
vNormHeight = uShellHeight / uMaxHeight;
vShellUv = uv;
`;

const SHELL_FRAGMENT_DECL = /* glsl */ `
uniform sampler2D uNoiseTex;
uniform float uNoiseScale;
uniform float uSharpness;
uniform float uSmoothness;
uniform float uMaxAo;
uniform vec3 uTipColor;
varying float vNormHeight;
varying vec2 vShellUv;
`;

const SHELL_FRAGMENT_BODY = /* glsl */ `
vec4 furNoise = texture2D(uNoiseTex, uNoiseScale * vShellUv);
float strandHeight = max(0.01, pow(furNoise.r, uSharpness));
float strandT = vNormHeight / strandHeight;
if (strandT >= 1.0) discard;
float strandAo = uMaxAo + (1.0 - uMaxAo) * 0.9 * (strandT * strandT);
vec3 strandCol = mix(diffuseColor.rgb, uTipColor, strandT);
diffuseColor.rgb = strandCol * furNoise.g;
diffuseColor.a *= pow(1.0 - strandT, uSmoothness);
`;

const SHELL_AO_BODY = /* glsl */ `
reflectedLight.directDiffuse *= strandAo;
reflectedLight.indirectDiffuse *= strandAo;
`;

interface ShellUniforms {
  uShellHeight: { value: number };
  uMaxHeight: { value: number };
  uBrushMatrix: { value: THREE.Matrix4 };
  uNoiseTex: { value: THREE.DataTexture };
  uNoiseScale: { value: number };
  uSharpness: { value: number };
  uSmoothness: { value: number };
  uMaxAo: { value: number };
  uTipColor: { value: THREE.Color };
}

function buildShellMaterial(uniforms: ShellUniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ transparent: true });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\n${SHELL_VERTEX_DECL}`,
      )
      .replace(
        "#include <project_vertex>",
        `${SHELL_VERTEX_BODY}\n#include <project_vertex>`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${SHELL_FRAGMENT_DECL}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>\n${SHELL_FRAGMENT_BODY}`,
      )
      .replace(
        "#include <aomap_fragment>",
        `#include <aomap_fragment>\n${SHELL_AO_BODY}`,
      );
  };
  return mat;
}

// ---------- component ----------

interface FurMeshProps {
  children: ReactNode;
  color: string;
  tipColor: string;
  length: number;
  density: number;
  sharpness: number;
  smoothness: number;
  comb: number;
  quality: number;
  roughness: number;
  metalness: number;
}

export function FurMesh({
  children,
  color,
  tipColor,
  length,
  density,
  sharpness,
  smoothness,
  comb,
  quality,
  roughness,
  metalness,
}: FurMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  const noiseTex = useMemo(() => generateNoiseTexture(512), []);

  const shellData = useMemo(() => {
    const heights: number[] = [];
    const count = Math.round(quality);
    for (let i = 0; i < count; i++) {
      heights.push((0.05 * length * (i + 1)) / count);
    }
    const maxH = heights[heights.length - 1];
    return { heights, maxH };
  }, [quality, length]);

  const shellLayers = useMemo(() => {
    return shellData.heights.map((h) => {
      const uniforms: ShellUniforms = {
        uShellHeight: { value: h },
        uMaxHeight: { value: shellData.maxH },
        uBrushMatrix: { value: new THREE.Matrix4() },
        uNoiseTex: { value: noiseTex },
        uNoiseScale: { value: 1 },
        uSharpness: { value: 1 },
        uSmoothness: { value: 1 },
        uMaxAo: { value: 0.7 },
        uTipColor: { value: new THREE.Color() },
      };
      const material = buildShellMaterial(uniforms);
      return { material, uniforms };
    });
  }, [shellData, noiseTex]);

  const baseMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(color) }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Live-update uniforms each frame
  useFrame(() => {
    const c = new THREE.Color(color);
    const tc = new THREE.Color(tipColor);
    const sm = Math.pow(smoothness + 0.5, 2);
    const brush = new THREE.Matrix4().makeRotationX(
      -0.65 * (Math.PI / 2) * comb,
    );

    baseMaterial.color.copy(c).multiplyScalar(0.7);
    baseMaterial.roughness = roughness;
    baseMaterial.metalness = metalness;

    shellLayers.forEach((layer, i) => {
      const u = layer.uniforms;
      u.uShellHeight.value = shellData.heights[i];
      u.uMaxHeight.value = shellData.maxH;
      u.uBrushMatrix.value.copy(brush);
      u.uNoiseScale.value = density;
      u.uSharpness.value = sharpness;
      u.uSmoothness.value = sm;
      u.uMaxAo.value = 0.7;
      u.uTipColor.value.copy(tc);
      layer.material.color.copy(c);
      layer.material.roughness = roughness;
      layer.material.metalness = metalness;
    });
  });

  return (
    <group ref={groupRef}>
      <mesh material={baseMaterial} castShadow receiveShadow>
        {children}
      </mesh>
      {shellLayers.map((layer, i) => (
        <mesh key={i} material={layer.material} receiveShadow>
          {children}
        </mesh>
      ))}
    </group>
  );
}
