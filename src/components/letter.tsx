import * as THREE from 'three'
import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'

const LETTER_MODEL_URL = `${import.meta.env.BASE_URL}LetterV.glb`

type GLTFResult = GLTF & {
    nodes: {
        Text: THREE.Mesh
    }
    materials: {}
}



export function Letter(props: React.JSX.IntrinsicElements['group']) {
    const { nodes } = useGLTF(LETTER_MODEL_URL) as unknown as GLTFResult

    return (
        <group {...props} dispose={null} >
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Text.geometry}
                material={nodes.Text.material}
                rotation={[Math.PI / 2, 0, 0]}
            />
        </group>
    )
}

type LetterVTargetProps = {
    rotation?: [number, number, number]
}

export default function LetterVTarget({ rotation = [0, 0, 0] }: LetterVTargetProps) {
    const { nodes } = useGLTF(LETTER_MODEL_URL) as any;
    const meshNode = Object.values(nodes).find((n: any) => n.isMesh) as any;

    const geometry = useMemo(() => {
        if (!meshNode) return null;
        const geom = meshNode.geometry.clone();
        geom.center();
        geom.computeBoundingBox();

        const box = geom.boundingBox;
        const maxDim = Math.max(
            box.max.x - box.min.x,
            box.max.y - box.min.y,
            box.max.z - box.min.z,
        );
        if (maxDim > 0) {
            geom.scale(2 / maxDim, 2 / maxDim, 2 / maxDim);
        }

        geom.rotateX(rotation[0]);
        geom.rotateY(rotation[1]);
        geom.rotateZ(rotation[2]);

        // box-mapped UVs
        geom.computeVertexNormals();
        const pos = geom.attributes.position;
        const norm = geom.attributes.normal;
        const uvs = new Float32Array(pos.count * 2);

        const uvScale = 0.5;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);

            const nx = Math.abs(norm.getX(i));
            const ny = Math.abs(norm.getY(i));
            const nz = Math.abs(norm.getZ(i));

            if (nx >= ny && nx >= nz) {
                uvs[i * 2] = z * uvScale;
                uvs[i * 2 + 1] = y * uvScale;
            } else if (ny >= nx && ny >= nz) {
                uvs[i * 2] = x * uvScale;
                uvs[i * 2 + 1] = z * uvScale;
            } else {
                uvs[i * 2] = x * uvScale;
                uvs[i * 2 + 1] = y * uvScale;
            }
        }
        geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

        return geom;
    }, [meshNode, rotation]);

    if (!geometry) return null;
    return <primitive object={geometry} attach="geometry" />;
}

useGLTF.preload(LETTER_MODEL_URL)


