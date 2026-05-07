# fur-gl

This project is my take on shell instance-based fur rendering in Three.js.

## Live Demo

[https://spxrshofficial.github.io/fur-gl/](https://spxrshofficial.github.io/fur-gl/)

## Overview

This project explores shell-based fur rendering (shell texturing / shell instancing style) in Three.js, a real-time technique used in AAA game pipelines to fake dense fur/hair at interactive frame rates.

The core idea here:
- custom shader patches on `MeshStandardMaterial`
- layered shell meshes with per-layer uniforms
- runtime controls via Leva for fur, shapes, lighting, environment, and scene motion
