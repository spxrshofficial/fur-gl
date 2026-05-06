import { Canvas } from '@react-three/fiber'
import './App.css'
import { FurMesh } from './components/FurMesh'
import LetterVTarget from './components/letter'
import { PerspectiveCamera, Stats } from '@react-three/drei'
import { useControls, folder } from "leva";
import { CursorTiltScene, SceneEnvironment, SceneLights, useSceneControls, WheelZoomCamera } from './components/sceneSetup'


type ShapeOption = 'letterV' | 'cube' | 'sphere' | 'torusKnot'

function ShapeTarget({ shape }: { shape: ShapeOption }) {
  if (shape === 'cube') {
    return <boxGeometry args={[1.6, 1.6, 1.6]} />
  }

  if (shape === 'sphere') {
    return <sphereGeometry args={[1, 64, 64]} />
  }

  if (shape === 'torusKnot') {
    return <torusKnotGeometry args={[0.8, 0.28, 180, 32]} />
  }

  return <LetterVTarget rotation={[Math.PI / 2, Math.PI/6, 0]} />
}


function App() {
  const sceneControls = useSceneControls()

  const furControls = useControls({
    Shapes: folder({
      shape: {
        value: 'letterV',
        options: {
          'Letter V': 'letterV',
          Cube: 'cube',
          Sphere: 'sphere',
          'Torus Knot': 'torusKnot',
        },
      },
    }, { collapsed: true }),
    Fur: folder({
      color: "#0029af",
      tipColor: "#636363",
      "Fur Height": { value: 0.5, min: 0.1, max: 4, step: 0.05 },
      "Strand Detail": { value: 5, min: 1, max: 10, step: 0.1 },
      Sharpness: { value: 1.15, min: 0.2, max: 3.0, step: 0.05 },
      "Tip Falloff": { value: 0.82, min: 0, max: 1, step: 0.01 },
      "Brush Angle": { value: 1.00, min: 0, max: 1, step: 0.01 },
      "Shell Layers": { value: 16, min: 10, max: 75, step: 1 },
      Roughness: { value: 0.64, min: 0, max: 1, step: 0.01 },
      Metalness: { value: 0.44, min: 0, max: 1, step: 0.01 },
    }),
  });

  return (
    <main className='main'>
      <Canvas className='canvas'>

        <Stats />

        {/* Camera */}
        <PerspectiveCamera position={[0, 0, 2]} makeDefault />
        <WheelZoomCamera minZ={0.2} maxZ={12} />
        

        <CursorTiltScene
          tiltEnabled={sceneControls.cursorTilt}
          autoRotate={sceneControls.autorotate}
        >
          {/* Lights */}
          <SceneLights
            ambientIntensity={sceneControls.ambientIntensity}
            ambientColor={sceneControls.ambientColor}
            dir1={{
              x: sceneControls.x,
              y: sceneControls.y,
              z: sceneControls.z,
              intensity: sceneControls.intensity,
              color: sceneControls.color,
              helper: sceneControls.helper,
            }}
            dir2={{
              x: sceneControls.dir2X,
              y: sceneControls.dir2Y,
              z: sceneControls.dir2Z,
              intensity: sceneControls.dir2Intensity,
              color: sceneControls.dir2Color,
              helper: sceneControls.dir2Helper,
            }}
          />
          <SceneEnvironment
            preset={sceneControls.environmentPreset}
            intensity={sceneControls.environmentIntensity}
            blur={sceneControls.environmentBlur}
            background={sceneControls.environmentBackground}
          />

          {/* Mesh */}
          <FurMesh
            color={furControls.color}
            tipColor={furControls.tipColor}
            length={furControls['Fur Height']}
            density={furControls['Strand Detail']}
            sharpness={furControls.Sharpness}
            smoothness={furControls['Tip Falloff']}
            comb={furControls['Brush Angle']}
            quality={furControls['Shell Layers']}
            roughness={furControls.Roughness}
            metalness={furControls.Metalness}
          >
            <ShapeTarget shape={furControls.shape as ShapeOption} />
          </FurMesh>
        </CursorTiltScene>

      </Canvas>
      <footer className='footer'>
        made by{' '}
        <a href='https://www.spxrsh.com' target='_blank' rel='noreferrer'>
          spxrsh
        </a>
      </footer>
    </main>
  )
}



export default App
