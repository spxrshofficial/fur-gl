import { useFrame, useThree } from '@react-three/fiber'
import { folder, useControls } from 'leva'
import { useEffect, useRef } from 'react'
import { Environment } from '@react-three/drei'
import type { ReactNode } from 'react'
import * as THREE from 'three'

type DirectionalLightConfig = {
  x: number
  y: number
  z: number
  intensity: number
  color: string
  helper: boolean
}

type SceneControls = {
  ambientIntensity: number
  ambientColor: string
  x: number
  y: number
  z: number
  intensity: number
  color: string
  helper: boolean
  dir2X: number
  dir2Y: number
  dir2Z: number
  dir2Intensity: number
  dir2Color: string
  dir2Helper: boolean
  environmentPreset: 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse'
  environmentIntensity: number
  environmentBlur: number
  environmentBackground: boolean
  cursorTilt: boolean
  autorotate: boolean
}

function DirectionalLightWithHelper({ config }: { config: DirectionalLightConfig }) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const helperRef = useRef<THREE.DirectionalLightHelper | null>(null)
  const { scene } = useThree()

  useEffect(() => {
    if (!lightRef.current || !config.helper) return

    const helper = new THREE.DirectionalLightHelper(lightRef.current, 0.5, 0x66ccff)
    helperRef.current = helper
    scene.add(helper)

    return () => {
      scene.remove(helper)
      helper.dispose()
      helperRef.current = null
    }
  }, [scene, config.helper])

  useFrame(() => {
    helperRef.current?.update()
  })

  return (
    <directionalLight
      ref={lightRef}
      position={[config.x, config.y, config.z]}
      intensity={config.intensity}
      color={config.color}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-3}
      shadow-camera-right={3}
      shadow-camera-top={3}
      shadow-camera-bottom={-3}
      shadow-camera-near={0.1}
      shadow-camera-far={20}
      shadow-bias={-0.0005}
    />
  )
}

export function SceneLights({
  ambientIntensity,
  ambientColor,
  dir1,
  dir2,
}: {
  ambientIntensity: number
  ambientColor: string
  dir1: DirectionalLightConfig
  dir2: DirectionalLightConfig
}) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <DirectionalLightWithHelper config={dir1} />
      <DirectionalLightWithHelper config={dir2} />
    </>
  )
}

export function SceneEnvironment({
  preset,
  intensity,
  blur,
  background,
}: {
  preset: SceneControls['environmentPreset']
  intensity: number
  blur: number
  background: boolean
}) {
  return (
    <Environment
      preset={preset}
      environmentIntensity={intensity}
      blur={blur}
      background={background}
    />
  )
}

export function CursorTiltScene({
  children,
  tiltEnabled,
  autoRotate,
}: {
  children: ReactNode
  tiltEnabled: boolean
  autoRotate: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const manualYawRef = useRef(0)
  const manualPitchRef = useRef(0)
  const dragStateRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  })
  const { gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const dragSensitivity = 0.005
    const maxPitch = 1.1

    const handlePointerDown = (event: PointerEvent) => {
      dragStateRef.current.isDragging = true
      dragStateRef.current.lastX = event.clientX
      dragStateRef.current.lastY = event.clientY
      el.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current.isDragging) return

      const dx = event.clientX - dragStateRef.current.lastX
      const dy = event.clientY - dragStateRef.current.lastY
      dragStateRef.current.lastX = event.clientX
      dragStateRef.current.lastY = event.clientY

      manualYawRef.current += dx * dragSensitivity
      manualPitchRef.current = THREE.MathUtils.clamp(
        manualPitchRef.current + dy * dragSensitivity,
        -maxPitch,
        maxPitch,
      )
    }

    const handlePointerUp = (event: PointerEvent) => {
      dragStateRef.current.isDragging = false
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId)
      }
    }

    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('pointercancel', handlePointerUp)
    el.addEventListener('pointerleave', handlePointerUp)

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('pointercancel', handlePointerUp)
      el.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [gl])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    if (autoRotate) manualYawRef.current += delta * 0.6

    const maxTilt = 0.22
    const tiltX = tiltEnabled ? -state.pointer.y * maxTilt : 0
    const tiltY = tiltEnabled ? state.pointer.x * maxTilt : 0
    const targetX = manualPitchRef.current + tiltX
    const targetY = manualYawRef.current + tiltY

    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetX,
      8,
      delta,
    )
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetY,
      8,
      delta,
    )
  })

  return <group ref={groupRef}>{children}</group>
}

export function WheelZoomCamera({ minZ = 0.2, maxZ = 12 }: { minZ?: number, maxZ?: number }) {
  const { gl, camera } = useThree()
  const targetZRef = useRef(camera.position.z)

  useEffect(() => {
    const el = gl.domElement
    const zoomSpeed = 0.0025

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      targetZRef.current = THREE.MathUtils.clamp(
        targetZRef.current + event.deltaY * zoomSpeed,
        minZ,
        maxZ,
      )
    }

    el.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      el.removeEventListener('wheel', handleWheel)
    }
  }, [gl, minZ, maxZ])

  useFrame((_, delta) => {
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZRef.current, 10, delta)
    camera.updateProjectionMatrix()
  })

  return null
}

export function useSceneControls(): SceneControls {
  return useControls({
    Lighting: folder({
      Ambient: folder({
        ambientIntensity: { value: 0.35, min: 0, max: 3, step: 0.01 },
        ambientColor: '#ffffff',
      }, { collapsed: true }),
      Direction: folder({
        x: { value: 3, min: -10, max: 10, step: 0.1 },
        y: { value: 5, min: -10, max: 10, step: 0.1 },
        z: { value: 4, min: -10, max: 10, step: 0.1 },
        intensity: { value: 1.2, min: 0, max: 5, step: 0.01 },
        color: '#ffffff',
        helper: false,
      }, { collapsed: true }),
      'Direction 2': folder({
        dir2X: { value: -3, min: -10, max: 10, step: 0.1 },
        dir2Y: { value: 2, min: -10, max: 10, step: 0.1 },
        dir2Z: { value: -3, min: -10, max: 10, step: 0.1 },
        dir2Intensity: { value: 0.6, min: 0, max: 5, step: 0.01 },
        dir2Color: '#ffffff',
        dir2Helper: false,
      }, { collapsed: true }),
      Environment: folder({
        environmentPreset: {
          value: 'sunset',
          options: [
            'apartment',
            'city',
            'dawn',
            'forest',
            'lobby',
            'night',
            'park',
            'studio',
            'sunset',
            'warehouse',
          ],
          label: 'Preset',
        },
        environmentIntensity: { value: 1, min: 0, max: 5, step: 0.01, label: 'Intensity' },
        environmentBlur: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Blur' },
        environmentBackground: { value: true, label: 'Background' },
      }, { collapsed: true }),
    }, { collapsed: true }),
    Scene: folder({
      cursorTilt: { value: true, label: 'Cursor Tilt' },
      autorotate: { value: false, label: 'Autorotate' },
    }, { collapsed: true }),
  }) as SceneControls
}
