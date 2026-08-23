import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function FoilRollCanvasReact({ activeVariant }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDraggingState, setIsDraggingState] = React.useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Photographic studio reflection environment with vertical, horizontal, and angled rectangular softboxes against dark charcoal (#06080A)
    const createStudioEnvironment = () => {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 1024;
      envCanvas.height = 1024;
      const ctx = envCanvas.getContext('2d');

      // Deep dark neutral charcoal environment background (#06080A)
      ctx.fillStyle = '#06080A';
      ctx.fillRect(0, 0, 1024, 1024);

      // 1. Large Top Main Overhead Softbox (Brilliant pure white specular source)
      const topGrad = ctx.createLinearGradient(0, 40, 0, 320);
      topGrad.addColorStop(0.0, '#FFFFFF');
      topGrad.addColorStop(0.35, '#E4E7EA');
      topGrad.addColorStop(0.75, '#686D72');
      topGrad.addColorStop(1.0, '#101316');
      ctx.fillStyle = topGrad;
      ctx.fillRect(160, 40, 704, 280);

      // 2. High-Contrast Vertical Key Softbox Rectangles (Creates vertical specular reflection bars across roll & sheet)
      const vGrad1 = ctx.createLinearGradient(120, 0, 280, 0);
      vGrad1.addColorStop(0.0, '#06080A');
      vGrad1.addColorStop(0.2, '#1A1D20');
      vGrad1.addColorStop(0.5, '#FFFFFF');
      vGrad1.addColorStop(0.8, '#1A1D20');
      vGrad1.addColorStop(1.0, '#06080A');
      ctx.fillStyle = vGrad1;
      ctx.fillRect(120, 360, 160, 420);

      const vGrad2 = ctx.createLinearGradient(740, 0, 900, 0);
      vGrad2.addColorStop(0.0, '#06080A');
      vGrad2.addColorStop(0.2, '#1A1D20');
      vGrad2.addColorStop(0.5, '#FFFFFF');
      vGrad2.addColorStop(0.8, '#1A1D20');
      vGrad2.addColorStop(1.0, '#06080A');
      ctx.fillStyle = vGrad2;
      ctx.fillRect(740, 360, 160, 420);

      // 3. Central Specular Highlight Spot
      const cGrad = ctx.createRadialGradient(512, 512, 10, 512, 512, 220);
      cGrad.addColorStop(0.0, '#FFFFFF');
      cGrad.addColorStop(0.4, '#C8CCCF');
      cGrad.addColorStop(1.0, 'rgba(6, 8, 10, 0)');
      ctx.fillStyle = cGrad;
      ctx.fillRect(300, 380, 424, 260);

      // 4. Rotated Angled Rim Softbox Light Source
      ctx.save();
      ctx.translate(250, 200);
      ctx.rotate(-Math.PI / 6);
      const rotGrad = ctx.createLinearGradient(0, 0, 300, 0);
      rotGrad.addColorStop(0.0, 'rgba(6, 8, 10, 0)');
      rotGrad.addColorStop(0.5, '#FFFFFF');
      rotGrad.addColorStop(1.0, 'rgba(6, 8, 10, 0)');
      ctx.fillStyle = rotGrad;
      ctx.fillRect(0, 0, 320, 90);
      ctx.restore();

      // 5. Studio Floor Soft Silver-Gray Reflection Bounce
      const floorGrad = ctx.createLinearGradient(0, 800, 0, 1024);
      floorGrad.addColorStop(0.0, '#3a3e42');
      floorGrad.addColorStop(0.5, '#686d72');
      floorGrad.addColorStop(0.85, '#42464a');
      floorGrad.addColorStop(1.0, '#303336');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 800, 1024, 224);

      const sphereGeo = new THREE.SphereGeometry(50, 32, 32);
      const sphereMat = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(envCanvas),
        side: THREE.BackSide
      });
      envScene.add(new THREE.Mesh(sphereGeo, sphereMat));

      const envMap = pmremGenerator.fromScene(envScene).texture;
      pmremGenerator.dispose();
      return envMap;
    };

    const studioEnvMap = createStudioEnvironment();
    scene.environment = studioEnvMap;

    // 1. Ambient Light - soft silver ambient fill (0.42) to prevent pitch-black environment shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambientLight);

    // 2. Key Light - overhead studio softbox light
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.6);
    keyLight.position.set(4, 14, 8);
    scene.add(keyLight);

    // 3. Fill Light - neutral silver fill
    const fillLight = new THREE.DirectionalLight(0xf0f2f2, 1.4);
    fillLight.position.set(-6, 3, 5);
    scene.add(fillLight);

    // 4. Rim Light - crisp specular highlight
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 3.2);
    rimLight1.position.set(-5, 8, -8);
    scene.add(rimLight1);

    // 5. Front Silver Sheet Fill Light (Prevents dark environment shadow patches on unrolled sheet)
    const sheetFillLight = new THREE.DirectionalLight(0xe2e6ea, 1.8);
    sheetFillLight.position.set(0, 4, 12);
    scene.add(sheetFillLight);

    // GENERATE EXTREMELY SUBTLE MICRO-NORMAL MAP FOR LOOSE FOIL SHEET (MOSTLY SMOOTH FROM A DISTANCE, SUBTLE REFLECTION DISTORTION ONLY)
    const createFoilNormalTextureSheet = () => {
      const W = 1024, H = 1024;
      const heightMap = new Float32Array(W * H);
      heightMap.fill(0.5);

      // Subtle, low-frequency organic surface variations (no visible embossed grid/crosshatch)
      for (let i = 0; i < 45; i++) {
        const x0 = Math.random() * W;
        const y0 = Math.random() * H;
        const radius = 80 + Math.random() * 220;
        const amp = (Math.random() - 0.5) * 0.015;

        const minX = Math.max(0, Math.floor(x0 - radius));
        const maxX = Math.min(W - 1, Math.ceil(x0 + radius));
        const minY = Math.max(0, Math.floor(y0 - radius));
        const maxY = Math.min(H - 1, Math.ceil(y0 + radius));

        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            const dx = px - x0;
            const dy = py - y0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius) {
              const falloff = 0.5 * (1 + Math.cos((dist / radius) * Math.PI));
              heightMap[py * W + px] += amp * falloff;
            }
          }
        }
      }

      // Compute gentle gradient derivatives (dh/dx, dh/dy)
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const c = cv.getContext('2d');
      const imgData = c.createImageData(W, H);
      const data = imgData.data;

      const normalStrength = 1.5;

      for (let y = 0; y < H; y++) {
        const yPrev = (y - 1 + H) % H;
        const yNext = (y + 1) % H;
        for (let x = 0; x < W; x++) {
          const xPrev = (x - 1 + W) % W;
          const xNext = (x + 1) % W;

          const dhdx = (heightMap[y * W + xNext] - heightMap[y * W + xPrev]) * normalStrength;
          const dhdy = (heightMap[yNext * W + x] - heightMap[yPrev * W + x]) * normalStrength;

          const len = Math.sqrt(dhdx * dhdx + dhdy * dhdy + 1.0);
          const nx = -dhdx / len;
          const ny = -dhdy / len;
          const nz = 1.0 / len;

          const idx = (y * W + x) * 4;
          data[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
          data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
          data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
          data[idx + 3] = 255;
        }
      }

      c.putImageData(imgData, 0, 0);

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return tex;
    };

    // GENERATE EXTREMELY SUBTLE NORMAL MAP FOR CYLINDER ROLL (SMOOTH TIGHTLY WOUND ROLL)
    const createFoilNormalTextureRoll = () => {
      const W = 1024, H = 1024;
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const c = cv.getContext('2d');
      const imgData = c.createImageData(W, H);
      const data = imgData.data;

      // Clean flat normal map (128, 128, 255 = pointing straight out)
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = 128;
        data[i + 1] = 128;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }

      c.putImageData(imgData, 0, 0);

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return tex;
    };

    // Create subtle procedural roughness map for loose sheet (smooth reflective ~0.14)
    const createFoilRoughnessTextureSheet = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');

      // Smooth reflective base roughness ~0.14 (#242424)
      c.fillStyle = '#242424';
      c.fillRect(0, 0, 1024, 1024);

      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const r = 100 + Math.random() * 250;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, '#181818');
        g.addColorStop(1, 'rgba(36, 36, 36, 0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return tex;
    };

    // Create procedural roughness map for cylinder roll (mirror smooth surface ~0.08)
    const createFoilRoughnessTextureRoll = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      c.fillStyle = '#141414'; // ~0.08 roughness
      c.fillRect(0, 0, 1024, 1024);

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return tex;
    };

    const foilNormalTextureSheet = createFoilNormalTextureSheet();
    const foilNormalTextureRoll = createFoilNormalTextureRoll();
    const foilRoughnessTextureSheet = createFoilRoughnessTextureSheet();
    const foilRoughnessTextureRoll = createFoilRoughnessTextureRoll();

    // Group Setup
    const foilRollGroup = new THREE.Group();

    // Single Source-of-Truth Photorealistic Real Aluminium Foil Material (Shared 100% identically between Cylinder Roll and Unrolled Sheet)
    const aluminiumMaterialRoll = new THREE.MeshPhysicalMaterial({
      color: 0xA4A8AC,        // Neutral medium silver (#A4A8AC)
      metalness: 1.0,         // 100% metallic PBR
      roughness: 0.08,        // Mirror smooth specular response
      roughnessMap: foilRoughnessTextureRoll,
      normalMap: foilNormalTextureRoll,
      normalScale: new THREE.Vector2(0.08, 0.08), // Extremely subtle micro-normal
      envMapIntensity: 2.0,
      side: THREE.DoubleSide
    });

    // Unrolled sheet uses the exact same physically based aluminium material as the cylinder roll
    const aluminiumMaterialSheet = aluminiumMaterialRoll;

    // 1. Texture for End-Lip Cardboard Tube Wall Ring (Raw unbleached kraft paper pulp, 80 compressed paper plies & raw cut fibers)
    const createCardboardEndLipTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      
      const cx = 512, cy = 512;
      const rInner = 200, rOuter = 260;

      // Authentic unbleached kraft paper tan base (#987856)
      c.fillStyle = '#987856';
      c.fillRect(0, 0, 1024, 1024);

      // Fine organic paper pulp specks
      for (let i = 0; i < 6000; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = rInner + Math.random() * (rOuter - rInner);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(205, 180, 150, 0.35)' : 'rgba(45, 30, 18, 0.50)';
        c.fillRect(x, y, 1.2 + Math.random() * 2.5, 1.2 + Math.random() * 2.5);
      }

      // 48 Compressed spiral paper ply rings (shows paper winding construction on cut edge)
      const numPlies = 48;
      for (let i = 0; i < numPlies; i++) {
        const r = rInner + (i / numPlies) * (rOuter - rInner);
        
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(35, 22, 12, 0.40)';
        c.lineWidth = 1.2;
        c.stroke();

        c.beginPath();
        c.arc(cx, cy, r + 0.6, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(215, 190, 160, 0.30)';
        c.lineWidth = 1.0;
        c.stroke();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 16;
      return tex;
    };

    // 2. Texture for Outer Protruding Cardboard Rim Cylinder (Spiral paper plies & kraft fibers)
    const createCardboardRimTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      
      c.fillStyle = '#987856';
      c.fillRect(0, 0, 1024, 1024);

      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(205, 180, 150, 0.30)' : 'rgba(45, 30, 18, 0.40)';
        c.fillRect(x, y, 2 + Math.random() * 3, 1.5 + Math.random() * 2.5);
      }

      // 45-degree diagonal spiral paper winding overlap folds
      for (let i = -1024; i < 2048; i += 90) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 1024, 1024);
        c.strokeStyle = 'rgba(35, 22, 12, 0.40)';
        c.lineWidth = 5;
        c.stroke();

        c.beginPath();
        c.moveTo(i + 6, 0);
        c.lineTo(i + 1030, 1024);
        c.strokeStyle = 'rgba(215, 190, 160, 0.35)';
        c.lineWidth = 3;
        c.stroke();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 1);
      return tex;
    };

    // 3. Texture for Interior Tube Tunnel Wall (Darker raw kraft paper #5C4630 with deep inner shadow)
    const createCardboardInteriorTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      
      c.fillStyle = '#5C4630';
      c.fillRect(0, 0, 1024, 1024);

      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(140, 115, 90, 0.20)' : 'rgba(25, 18, 10, 0.35)';
        c.fillRect(x, y, 2 + Math.random() * 3, 1.5 + Math.random() * 2.5);
      }

      // Interior spiral paper seam
      for (let i = -1024; i < 2048; i += 180) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 1024, 1024);
        c.strokeStyle = 'rgba(20, 14, 8, 0.45)';
        c.lineWidth = 6;
        c.stroke();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      return tex;
    };

    const cardboardEndLipTexture = createCardboardEndLipTexture();
    const cardboardRimTexture = createCardboardRimTexture();

    // Cardboard Core Materials: NON-METALLIC (metalness = 0), matte roughness ~0.92, authentic desaturated kraft tan/brown 0x987856
    const interiorCardboardMat = new THREE.MeshStandardMaterial({
      color: 0x5C4630,
      map: createCardboardInteriorTexture(),
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const cardboardRingMat = new THREE.MeshStandardMaterial({
      color: 0x987856,
      map: cardboardEndLipTexture,
      bumpMap: cardboardEndLipTexture,
      bumpScale: 0.10,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const cardboardRimMat = new THREE.MeshStandardMaterial({
      color: 0x987856,
      map: cardboardRimTexture,
      bumpMap: cardboardRimTexture,
      bumpScale: 0.10,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    // Sub-group for spinning components (the roll cylinder, core, and rings)
    const rollCylinderGroup = new THREE.Group();
    foilRollGroup.add(rollCylinderGroup);

    // 1. FULL 3D CYLINDER FOIL ROLL MESH (Length 4.2)
    const outerGeo = new THREE.CylinderGeometry(0.95, 0.95, 4.2, 64, 1, true);
    const outerFoilMesh = new THREE.Mesh(outerGeo, aluminiumMaterialRoll);
    outerFoilMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(outerFoilMesh);

    // 2. PROTRUDING 3D CARDBOARD CORE TUBE (Length 4.36 - Sticks out 0.08 on each end)
    const coreTunnelGeo = new THREE.CylinderGeometry(0.40, 0.40, 4.36, 64, 1, true);
    const coreTunnelMesh = new THREE.Mesh(coreTunnelGeo, interiorCardboardMat);
    coreTunnelMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(coreTunnelMesh);

    const cardboardRimGeo = new THREE.CylinderGeometry(0.52, 0.52, 4.36, 64, 1, true);
    const cardboardRimMesh = new THREE.Mesh(cardboardRimGeo, cardboardRimMat);
    cardboardRimMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(cardboardRimMesh);

    const cardboardRingGeo = new THREE.RingGeometry(0.40, 0.52, 64);
    
    const leftCardboardRing = new THREE.Mesh(cardboardRingGeo, cardboardRingMat);
    leftCardboardRing.position.x = -2.181;
    leftCardboardRing.rotation.y = Math.PI / 2;
    rollCylinderGroup.add(leftCardboardRing);

    const rightCardboardRing = new THREE.Mesh(cardboardRingGeo, cardboardRingMat);
    rightCardboardRing.position.x = 2.181;
    rightCardboardRing.rotation.y = Math.PI / 2;
    rollCylinderGroup.add(rightCardboardRing);

    // Helper: Create 100% photorealistic concentric wound silver foil layer edge texture matching reference image (550 paper-thin 2D concentric arcs)
    const createFoilEdgeTexture = () => {
      const W = 2048, H = 2048; // High resolution 2K canvas for ultra-sharp micro layer lines!
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const c = cv.getContext('2d');

      const cx = 1024, cy = 1024;
      const rInner = 560; // Core radius boundary (matches 0.52 ratio)
      const rOuter = 1020; // Outer roll boundary (matches 0.95 ratio)

      // 1. Base background
      c.fillStyle = '#A4A8AC';
      c.fillRect(0, 0, W, H);

      // 2. Base metallic silver radial tone gradient matching reference image (#E0E4E8 -> #8E9296 -> #FFFFFF)
      const baseGrad = c.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
      baseGrad.addColorStop(0.00, '#E0E4E8');
      baseGrad.addColorStop(0.25, '#B8BCBF');
      baseGrad.addColorStop(0.50, '#8E9296');
      baseGrad.addColorStop(0.85, '#CCD0D4');
      baseGrad.addColorStop(1.00, '#FFFFFF');

      c.fillStyle = baseGrad;
      c.beginPath();
      c.arc(cx, cy, rOuter, 0, Math.PI * 2);
      c.fill();

      // 3. Draw 550 razor-sharp 2D CONCENTRIC CIRCULAR RINGS (ctx.arc) around cardboard core center (cx, cy)
      const numLayers = 550;
      for (let i = 0; i < numLayers; i++) {
        const r = rInner + (i / numLayers) * (rOuter - rInner);
        const randSeed = i * 1.618033 + 5.14;
        const brightnessVar = Math.sin(randSeed * 23.0) * 0.20;
        const alphaHighlight = Math.min(1.0, 0.82 + brightnessVar);

        // Ultra-fine dark shadow groove arc
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(2, 4, 6, 0.96)';
        c.lineWidth = 1.2;
        c.stroke();

        // Razor-sharp specular metallic silver layer edge line arc
        c.beginPath();
        c.arc(cx, cy, r + 0.5, 0, Math.PI * 2);
        c.strokeStyle = `rgba(255, 255, 255, ${alphaHighlight})`;
        c.lineWidth = 1.0;
        c.stroke();

        // Micro tone variation for metallic depth
        if (i % 3 === 0) {
          c.beginPath();
          c.arc(cx, cy, r + 0.9, 0, Math.PI * 2);
          c.strokeStyle = 'rgba(180, 185, 190, 0.50)';
          c.lineWidth = 0.8;
          c.stroke();
        }
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
      return tex;
    };

    const foilEdgeTexture = createFoilEdgeTexture();

    // 3. ROLLED FOIL EDGE RINGS (550 HIGH-DENSITY CONCENTRIC METALLIC FOIL LAYERS MATCHING REFERENCE)
    const ringGeo = new THREE.RingGeometry(0.52, 0.95, 128);
    const ringPos = ringGeo.attributes.position;
    const ringUv = ringGeo.attributes.uv;

    // Override RingGeometry UVs to Planar Cartesian coordinates for 100% perfect 2D concentric circular mapping
    for (let i = 0; i < ringPos.count; i++) {
      const px = ringPos.getX(i);
      const py = ringPos.getY(i);
      const u = (px / 1.90) + 0.5;
      const v = (py / 1.90) + 0.5;
      ringUv.setXY(i, u, v);
    }
    ringUv.needsUpdate = true;

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xB0B4B8,        // Neutral silver (matches reference image)
      map: foilEdgeTexture,
      bumpMap: foilEdgeTexture,
      bumpScale: 0.18,        // High physical micro-groove depth between 550 foil layers
      metalness: 1.0,         // 100% metallic PBR
      roughness: 0.08,        // Mirror-sharp specular reflection
      envMap: studioEnvMap,
      envMapIntensity: 2.2,
      side: THREE.DoubleSide
    });

    const leftRing = new THREE.Mesh(ringGeo, ringMat);
    leftRing.position.x = -2.101;
    leftRing.rotation.y = Math.PI / 2;
    rollCylinderGroup.add(leftRing);

    const rightRing = new THREE.Mesh(ringGeo, ringMat);
    rightRing.position.x = 2.101;
    rightRing.rotation.y = Math.PI / 2;
    rollCylinderGroup.add(rightRing);

    // 4. INVISIBLE 3D HIT ENCLOSURE (Guarantees 100% hit detection on top, sides, and rings)
    const cylinderHitGeo = new THREE.CylinderGeometry(1.2, 1.2, 4.6, 32);
    const cylinderHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const cylinderHitMesh = new THREE.Mesh(cylinderHitGeo, cylinderHitMat);
    cylinderHitMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(cylinderHitMesh);

    // 5. UNROLLED 3D FOIL SHEET EXTENSION (Mathematically continuous parametric surface)
    const baseSheetLength = 3.6;
    const sheetGeo = new THREE.PlaneGeometry(4.2, baseSheetLength, 80, 80);
    sheetGeo.translate(0, -baseSheetLength / 2, 0);

    const R_sheet = 0.951;  // Fits flush on cylinder radius 0.95
    const v_detach = 1.40;  // Detaches at lower-front face in full camera view
    const theta_d = -0.95;  // Lower-front detachment angle (~ -54.4 deg)
    const theta_0 = theta_d - (v_detach / R_sheet); // -2.422 rad (wrapped on cylinder back)

    const y_d = R_sheet * Math.sin(theta_d); // -0.774 (lower-front Y)
    const z_d = R_sheet * Math.cos(theta_d); // +0.553 (lower-front Z, in full view of camera)

    // Tangent Direction at theta_d: DOWNWARD & FORWARD off lower-front cylinder face
    const Ty = Math.cos(theta_d);  // +0.582
    const Tz = -Math.sin(theta_d); // +0.813

    let lastRenderedPull = -1;

    // Store pristine original V coordinates once so dynamic updates never corrupt vertex sampling
    const origVArray = new Float32Array(sheetGeo.attributes.position.count);
    const initPos = sheetGeo.attributes.position;
    for (let k = 0; k < initPos.count; k++) {
      origVArray[k] = -initPos.getY(k);
    }

    let is360Mode = false;
    let isDragging = false;

    // Deterministic pseudo-random generator (seeded so crease field is 100% stable & cached)
    const pseudoRandom = (seed) => {
      let s = Math.sin(seed) * 10000;
      return s - Math.floor(s);
    };

    // Pre-calculate 38 deterministic, multi-directional sparse crease segments
    // Distribution: 60% smooth, 30% light creases, 10% isolated sharp fold intersections
    // Angles cover full 0 to 180 degrees (diagonal, cross, horizontal, vertical)
    const sparseCreases = [];
    for (let cIdx = 0; cIdx < 38; cIdx++) {
      const seed = cIdx * 1.618033 + 7.12;
      const x0 = (pseudoRandom(seed * 1.1) - 0.5) * 3.8;          // -1.9 to 1.9 across sheet width
      const v0 = 1.0 + pseudoRandom(seed * 2.2) * 2.5;           // 1.0 to 3.5 along sheet length
      const angle = pseudoRandom(seed * 3.3) * Math.PI;          // Full 0-180 deg coverage
      const len = 0.25 + pseudoRandom(seed * 4.4) * 0.95;         // 0.25 to 1.2 length
      const width = 0.08 + pseudoRandom(seed * 5.5) * 0.12;       // 0.08 to 0.20 narrow width
      const amp = (pseudoRandom(seed * 6.6) > 0.48 ? 1 : -1) * (0.002 + pseudoRandom(seed * 7.7) * 0.004); // 0.002 to 0.006 VERY SMALL physical amplitude!

      sparseCreases.push({
        x0, v0,
        cosA: Math.cos(angle),
        sinA: Math.sin(angle),
        len,
        width,
        amp
      });
    }

    // DETERMINISTIC SPARSE IRREGULAR CREASE FIELD SYSTEM (NO REPEATING PARALLEL SINE WAVES!)
    const updateSheetGeometry = (pullLength, time = 0) => {
      const pos = sheetGeo.attributes.position;
      const homeLengthFactor = is360Mode ? 1.0 : 0.78; // Slightly shorter unrolled area on Home page only!
      const unrolledTotal = ((baseSheetLength - v_detach) * homeLengthFactor) + pullLength;

      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        const v = origVArray[j]; // Read pristine, uncorrupted V coordinate!

        let currY, currZ;

        if (v <= v_detach) {
          // ZONE 1 — ROLL CONTACT: Wrapped 100% flush over cylinder curve to lower-front exit point
          const theta = theta_0 + (v / R_sheet);
          currY = R_sheet * Math.sin(theta);
          currZ = R_sheet * Math.cos(theta);
        } else {
          // ZONES 2, 3 & 4 — Continuous C1/C2 Smootherstep Transition off Lower-Front Roll Face
          const progressInOriginal = (v - v_detach) / (baseSheetLength - v_detach);
          const s = progressInOriginal * unrolledTotal;

          // Zone 2 (Tangent Exit): Pure tangent continuation off lower-front cylinder face
          const tangentY = y_d + s * Ty;
          const tangentZ = z_d + s * Tz;

          // Zone 4 (Free Ground Sheet): Horizontally relaxing ground plane
          const groundY = y_d + s * (-0.18) - Math.min(s * 0.12, 0.30);
          const groundZ = z_d + s * (+0.98);

          // C2 Smootherstep Easing Weight over first 1.5 units of unrolled length
          const t = Math.min(s / 1.5, 1.0);
          const w = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);

          // Blend curved tangent exit (Zone 2 & 3) into loose unrolled sheet (Zone 4)
          const baseY = (1.0 - w) * tangentY + w * groundY;
          const baseZ = (1.0 - w) * tangentZ + w * groundZ;

          const prog = progressInOriginal; // 0.0 at roll detachment to 1.0 at outer edge

          // 0–15%: Tight curved exit following roll tangent smoothly (0% wrinkles at roll exit)
          // 15–40%: Curvature relaxes smoothly
          // 40–100%: Layered irregular crinkles
          let wrinkleIntensity = 0;
          if (prog > 0.12) {
            const normProg = (prog - 0.12) / 0.88;
            wrinkleIntensity = Math.pow(normProg, 1.3);
          }

          // LAYER 1: MACRO FORM (Gentle overall bending so sheet isn't a flat stiff board)
          const macroForm = (Math.sin(x * 0.7 + 0.4) * 0.0025) * Math.sin(prog * Math.PI * 0.8);

          // LAYER 2: MEDIUM CREASES (Sparse irregular 2D crease line segments)
          let mediumCreaseDisp = 0;
          for (let c = 0; c < sparseCreases.length; c++) {
            const cr = sparseCreases[c];
            const dx = x - cr.x0;
            const dv = v - cr.v0;
            const proj = dx * cr.cosA + dv * cr.sinA;
            if (proj >= 0 && proj <= cr.len) {
              const perp = Math.abs(-dx * cr.sinA + dv * cr.cosA);
              if (perp < cr.width * 1.8) {
                const distRatio = perp / cr.width;
                const lenProgress = proj / cr.len;
                const lenFalloff = Math.sin(lenProgress * Math.PI);
                const profile = Math.exp(-distRatio * distRatio * 2.2) * lenFalloff;
                mediumCreaseDisp += cr.amp * profile;
              }
            }
          }

          // LAYER 3: MICRO WRINKLES (High frequency small surface crinkles for realistic reflection dispersion)
          const microWrinkles = (Math.sin(x * 24.0 + v * 18.0) * Math.cos(x * 15.0 - v * 12.0) * 0.0012);

          // FREE LOOSE EDGE (Slightly more natural edge irregularity at the far end 70%–100%)
          let freeEdgeCrumple = 0;
          if (prog > 0.70) {
            const edgeProg = (prog - 0.70) / 0.30;
            freeEdgeCrumple = Math.pow(edgeProg, 2.2) * (Math.sin(x * 14.0 + 0.8) * 0.0035 + Math.cos(x * 8.5) * 0.002);
          }

          // Total physical deformation amplitude remains SMALL (extremely thin sheet)
          const totalWave = macroForm + (mediumCreaseDisp + microWrinkles + freeEdgeCrumple) * wrinkleIntensity;

          const Ny_up = 0.98;
          const Nz_up = 0.18;

          currY = baseY + totalWave * Ny_up;
          currZ = baseZ + totalWave * Nz_up;

          const metalDrape = Math.pow(prog, 1.8) * 0.025;
          currY -= metalDrape * 0.85;
          currZ -= metalDrape * 0.35;
        }

        pos.setX(j, x);
        pos.setY(j, currY);
        pos.setZ(j, currZ);
      }

      pos.needsUpdate = true;
      sheetGeo.computeVertexNormals();
    };

    updateSheetGeometry(0, 0);

    const sheetMesh = new THREE.Mesh(sheetGeo, aluminiumMaterialSheet);
    sheetMesh.position.set(0, 0, 0);
    sheetMesh.rotation.set(0, 0, 0);
    sheetMesh.castShadow = false;
    sheetMesh.receiveShadow = false;
    
    foilRollGroup.add(sheetMesh);

    // 6. INVISIBLE HITBOX FOR EASIER INTERACTION
    // Sits right where the sheet and Pull Me text are, guaranteeing 100% reliable drag triggering everywhere
    const hitGeo = new THREE.PlaneGeometry(10, 10);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, -2, 0);
    foilRollGroup.add(hitMesh);

    // Initial Global Orientation (Exact Production 3/4 perspective)
    foilRollGroup.rotation.x = -0.25; // Bottom points forward so sheet flows towards camera
    foilRollGroup.rotation.y = 0.65;  // Core end faces camera in production 3/4 perspective
    foilRollGroup.rotation.z = 0.35;  // Right end higher, left end lower
    foilRollGroup.position.set(-0.4, 0.6, 0);

    scene.add(foilRollGroup);

    // Interaction State
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let dragStartClientY = 0;
    let targetFoilPull = 0;
    let currentFoilPull = 0;
    const maxPull = 12.0;

    let mouseX = 0, mouseY = 0;
    let targetRotationX = 0, targetRotationY = 0;
    let manualYRotation = 0;
    let manualXRotation = 0;
    let dragStartClientX = 0;
    
    // Base positions for the animation loop to use
    let baseFoilX = -0.4;
    let baseFoilY = 0.6;

    window.__toggle360Mode = () => {
      is360Mode = !is360Mode;
      targetFoilPull = 0;
      currentFoilPull = 0;
      lastRenderedPull = -1;
      updateSheetGeometry(0, 0);
      window.dispatchEvent(new CustomEvent('360-mode-toggle', { detail: { active: is360Mode } }));
    };

    const handlePointerDown = (e) => {
      // Don't intercept clicks on interactive buttons, links, or form controls
      if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea, [role="button"], [title="360° Free Rotation Mode"]')) {
        return;
      }
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const set3DCursor = (cursorStyle) => {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = cursorStyle;
        }
        if (document.body.style.cursor) {
          document.body.style.cursor = '';
        }
      };

      // In 360° mode: ANY click ANYWHERE on screen starts free rotation immediately
      if (is360Mode) {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        setIsDraggingState(true);
        dragStartClientY = clientY;
        dragStartClientX = clientX;
        set3DCursor('grabbing');
        if (e.pointerId !== undefined && canvasRef.current.setPointerCapture) {
          try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) {}
        }
        return;
      }

      // Normal mode: check raycast or screen bounds on hero canvas
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const isClickedOverlay = overlayRef.current && overlayRef.current.contains(e.target);
      
      // Allow drag if user touches/clicks 3D model, overlay, or anywhere in interaction zone
      const isMobileOrTablet = window.innerWidth < 1024;
      const isScreenTarget = isMobileOrTablet ? clientY > window.innerHeight * 0.25 : clientX > window.innerWidth * 0.35;

      if (intersects.length > 0 || isClickedOverlay || isScreenTarget) {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        setIsDraggingState(true);
        setHasInteracted(true);
        // Start manual pull from current smooth position to prevent any jump
        targetFoilPull = currentFoilPull;
        dragStartClientY = clientY;
        dragStartClientX = clientX;
        set3DCursor('grabbing');
        if (e.pointerId !== undefined && canvasRef.current.setPointerCapture) {
          try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }
    };

    const handlePointerMove = (e) => {
      if (isDragging && e.cancelable) {
        e.preventDefault();
      }
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      // Update global mouse for parallax
      mouseX = (clientX / window.innerWidth) * 2 - 1;
      mouseY = -(clientY / window.innerHeight) * 2 + 1;

      if (!isDragging) {
        if (is360Mode) {
          set3DCursor('grab');
          setIsHovered(true);
        } else {
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
          const isOverMesh = raycaster.intersectObjects(foilRollGroup.children, true).length > 0;
          const isOverOverlay = overlayRef.current && overlayRef.current.contains(e.target);
          if (isOverMesh || isOverOverlay) {
            set3DCursor('grab');
            setIsHovered(true);
          } else {
            set3DCursor('');
            setIsHovered(false);
          }
        }
        return;
      }
      
      // Calculate drag deltas with responsive scale factor for mobile/tablet screen sizes
      const deltaX = clientX - dragStartClientX;
      const deltaY = clientY - dragStartClientY;
      
      if (is360Mode) {
        manualYRotation += deltaX * 0.01;
        manualXRotation += deltaY * 0.01;
      } else {
        // Compensate for 3D model scale factor on mobile (0.5x) and tablet (0.6x)
        const deviceScaleFactor = window.innerWidth < 768 ? 2.0 : (window.innerWidth < 1024 ? 1.6 : 1.0);
        const directionalDelta = (deltaY * 0.7 + deltaX * 0.7);
        const effectivePullDelta = directionalDelta * 0.005 * deviceScaleFactor;
        
        targetFoilPull += effectivePullDelta;
        if (targetFoilPull > maxPull) targetFoilPull = maxPull;
        if (targetFoilPull < 0) targetFoilPull = 0;
      }
      
      dragStartClientX = clientX;
      dragStartClientY = clientY;
    };

    const handlePointerUp = (e) => {
      if (e && e.pointerId !== undefined && canvasRef.current && canvasRef.current.releasePointerCapture) {
        try { canvasRef.current.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (isDragging) {
        isDragging = false;
        setIsDraggingState(false);
        set3DCursor('');
        
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        if (raycaster.intersectObjects([sheetMesh, hitMesh]).length > 0) {
          set3DCursor('grab');
          setIsHovered(true);
        } else {
          setIsHovered(false);
        }
      }
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      
      // Responsive scaling and positioning
      if (width < 768) {
        // Mobile: Scaled down, centered visually, and pushed slightly below the text
        foilRollGroup.scale.set(0.5, 0.5, 0.5);
        baseFoilX = 0;
        baseFoilY = 0;
      } else if (width < 1024) {
        // Tablet: Medium scale, slightly right
        foilRollGroup.scale.set(0.6, 0.6, 0.6);
        baseFoilX = 0;
        baseFoilY = -0.4;
      } else {
        // Desktop: Full scale, default position
        foilRollGroup.scale.set(1, 1, 1);
        baseFoilX = -0.4;
        baseFoilY = 0.6;
      }
      
      // We set the position directly here once, but animate() will overwrite it using baseFoilX/Y on the next frame.
      foilRollGroup.position.set(baseFoilX, baseFoilY, 0);
      
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    // Initialize responsive layout
    handleResize();

    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('pointerdown', handlePointerDown);
    }
    // Also listen on document so 360° mode captures clicks from anywhere on the page
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('resize', handleResize);

    // IntersectionObserver to pause WebGL rendering when scrolled out of view (prevents GPU layer flickering)
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    if (canvasEl) {
      observer.observe(canvasEl);
    }

    // Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (foilRollGroup) {
        // Smoothly glide back to original default angle when customer releases mouse/touch
        if (!isDragging) {
          manualYRotation += (0 - manualYRotation) * 0.08;
          manualXRotation += (0 - manualXRotation) * 0.08;
        }

        // Drive hand tutorial gesture AND 3D foil unrolling directly from the exact same WebGL animation frame
        if (!isDragging && !is360Mode) {
          const cycleMs = 2800;
          const now = performance.now() % cycleMs;
          const cycle = now / cycleMs;

          let targetPull = 0;
          let handScale = 1;
          let handRotate = 0;
          let handOpacity = 1;
          let handTransX = 0;
          let handTransY = 0;

          if (cycle < 0.12) {
            // Fade in at resting top position
            targetPull = 0;
            handScale = 1;
            handRotate = 0;
            handOpacity = cycle / 0.12;
            handTransX = 0;
            handTransY = 0;
          } else if (cycle >= 0.12 && cycle < 0.25) {
            // Press / Clamp down phase
            const grabProg = (cycle - 0.12) / 0.13;
            targetPull = 0;
            handScale = 1.0 - grabProg * 0.15;
            handRotate = -grabProg * 12;
            handOpacity = 1.0;
            handTransX = 0;
            handTransY = 0;
          } else if (cycle >= 0.25 && cycle <= 0.70) {
            // Pull phase (Hand moves downward-right in 100% lockstep with 3D foil unrolling)
            const pullProg = (cycle - 0.25) / 0.45;
            targetPull = pullProg * 0.45;
            handScale = 0.85;
            handRotate = -12;
            handOpacity = 1.0;
            handTransX = pullProg * 40; // 40px rightward translation
            handTransY = pullProg * 50; // 50px downward translation
          } else if (cycle > 0.70 && cycle <= 0.84) {
            // Release phase (hand unclamps and lets go)
            const releaseProg = (cycle - 0.70) / 0.14;
            targetPull = 0.45 * (1.0 - releaseProg * 0.6);
            handScale = 0.85 + releaseProg * 0.15;
            handRotate = -12 + releaseProg * 12;
            handOpacity = 1.0;
            handTransX = 40 * (1.0 - releaseProg * 0.4);
            handTransY = 50 * (1.0 - releaseProg * 0.4);
          } else {
            // Return & Fade out phase
            const returnProg = (cycle - 0.84) / 0.16;
            targetPull = 0.18 * (1.0 - returnProg);
            handScale = 1.0;
            handRotate = 0;
            handOpacity = 1.0 - returnProg;
            handTransX = 24 * (1.0 - returnProg);
            handTransY = 30 * (1.0 - returnProg);
          }

          currentFoilPull = targetPull;

          if (overlayRef.current) {
            const handEl = overlayRef.current.querySelector('.tutorial-hand-cursor');
            if (handEl) {
              handEl.style.transform = `translate(${handTransX}px, ${handTransY}px) scale(${handScale}) rotate(${handRotate}deg)`;
              handEl.style.opacity = `${handOpacity}`;
            }
          }
        } else {
          // Smooth unroll interpolation for manual user dragging (Smooth, weighted pull speed)
          currentFoilPull += (targetFoilPull - currentFoilPull) * 0.08;
        }

        // EXACT FIXED ANGLE + MANUAL 360 ROTATION (AUTOSNAPS BACK ON RELEASE)
        foilRollGroup.rotation.x = -0.25 + manualXRotation;
        foilRollGroup.rotation.y = 0.65 + manualYRotation;
        foilRollGroup.rotation.z = 0.35;
        
        const bounce = Math.sin(Date.now() * 0.0016) * 0.09;
        foilRollGroup.position.x = baseFoilX;
        foilRollGroup.position.y = baseFoilY + bounce;

        // Dynamically track drag handle & tutorial hand directly to the surface of the unrolled foil sheet as it moves
        if (overlayRef.current && canvasRef.current) {
          if (is360Mode) {
            overlayRef.current.style.opacity = '0';
            overlayRef.current.style.pointerEvents = 'none';
          } else {
            overlayRef.current.style.opacity = '1';
            overlayRef.current.style.pointerEvents = 'auto';

            // Calculate 3D midpoint position along the moving unrolled sheet
            const unrolledTail = ((baseSheetLength - v_detach) * (is360Mode ? 1.0 : 0.78)) + currentFoilPull;
            const midTail = unrolledTail * 0.45;

            // Positioned lower on the unrolled foil sheet surface (Desktop: Y -0.65 | Tablet: Y -0.55 | Mobile: Y -0.45)
            const isMobile = window.innerWidth < 768;
            const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

            const trackX = isMobile ? -0.20 : (isTablet ? -0.05 : 0.10);
            const trackYOffset = isMobile ? -0.45 : (isTablet ? -0.55 : -0.65);
            const trackZOffset = isMobile ? 0.25 : (isTablet ? 0.35 : 0.45);

            const trackVec = new THREE.Vector3(
              trackX,
              y_d + midTail * Ty + trackYOffset,
              z_d + midTail * Tz + trackZOffset
            );

            // Transform 3D local coordinate to world space, then project to 2D screen pixels
            trackVec.applyMatrix4(foilRollGroup.matrixWorld);
            trackVec.project(camera);

            const canvasRect = canvasRef.current.getBoundingClientRect();
            const screenX = (trackVec.x * 0.5 + 0.5) * canvasRect.width;
            const screenY = (-trackVec.y * 0.5 + 0.5) * canvasRect.height;

            overlayRef.current.style.left = `${screenX}px`;
            overlayRef.current.style.top = `${screenY}px`;
            overlayRef.current.style.bottom = 'auto';
            overlayRef.current.style.transform = 'translate(-50%, -100%)';
          }
        }

        // Dispatch custom event so right gallery & text fade out ONLY when customer manually drags/pulls
        const pullState = isDragging;
        if (window.__lastFoilPullState !== pullState) {
          window.__lastFoilPullState = pullState;
          window.dispatchEvent(new CustomEvent('foil-pull-state', { detail: { isPulled: pullState } }));
        }

        // Dynamically re-render unrolled sheet tail & gravitational physics waves in 3D View mode
        const timeSec = Date.now() * 0.001;
        if (window.__last360ModeState !== is360Mode) {
          window.__last360ModeState = is360Mode;
          lastRenderedPull = -1;
        }

        if (Math.abs(currentFoilPull - lastRenderedPull) > 0.001 || is360Mode || isDragging) {
          lastRenderedPull = currentFoilPull;
          updateSheetGeometry(currentFoilPull, timeSec);
        }
        
        // Prevent texture stretching by dynamically increasing texture tiling based on scale
        
        // Spin the cylinder roll dynamically based on pulled distance (circumference ratio)
        // Cylinder radius is 0.95. Unroll rotation = distance / radius
        rollCylinderGroup.rotation.x = -currentFoilPull / 0.95;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      document.body.style.cursor = '';
      delete window.__toggle360Mode;
      if (reqId) cancelAnimationFrame(reqId);
      if (canvasEl && observer) {
        observer.unobserve(canvasEl);
        canvasEl.removeEventListener('pointerdown', handlePointerDown);
      }
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div className="canvas-container" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block', 
          pointerEvents: 'auto', 
          touchAction: 'none',
          transform: 'translateZ(0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden' 
        }} 
      />


        <div 
        ref={overlayRef}
        className="pull-me-hint"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: 'translate(-50%, -100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20,
          pointerEvents: 'auto',
          cursor: 'grab',
          userSelect: 'none',
          transition: 'opacity 0.2s ease'
        }}
      >
        {/* Animated Hand Tutorial - Pristine macOS System Open Hand */}
        <div className="tutorial-hand-cursor" style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.75))',
          opacity: isDraggingState ? 0 : 1,
          visibility: isDraggingState ? 'hidden' : 'visible',
          transition: 'opacity 0.15s ease'
        }}>
          {/* Direct Micro-Instruction Pill */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '20px',
            padding: '3px 12px',
            color: '#34d399',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
            marginBottom: '2px'
          }}>
            DRAG ME
          </div>

          {/* Clean macOS Hand Cursor Icon with Pristine Finger Tops */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M9 1.75C9.69 1.75 10.25 2.31 10.25 3V10.25H11V4C11 3.31 11.56 2.75 12.25 2.75C12.94 2.75 13.5 3.31 13.5 4V10.25H14.25V5.25C14.25 4.56 14.81 4 15.5 4C16.19 4 16.75 4.56 16.75 5.25V10.25H17.5V6.75C17.5 6.06 18.06 5.5 18.75 5.5C19.44 5.5 20 6.06 20 6.75V13C20 17.14 16.64 20.5 12.5 20.5C9.25 20.5 6.45 18.4 5.5 15.3L3.4 8.6C3.15 7.8 3.75 7 4.6 7C5.15 7 5.65 7.35 5.85 7.9L7.5 13V3C7.5 2.31 8.06 1.75 8.75 1.75H9Z" 
              fill="#FFFFFF" 
              stroke="#0F172A" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes foilBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(10px); }
          60% { transform: translateY(5px); }
        }

        .tutorial-hand-cursor {
          will-change: transform, opacity;
        }
      `}
      </style>
    </div>
  );
}
