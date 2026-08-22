import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function FoilRollCanvasReact({ activeVariant }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // High-contrast chrome studio environment with deep charcoal metallic shadows under cylinder
    const createStudioEnvironment = () => {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 1024;
      envCanvas.height = 1024;
      const ctx = envCanvas.getContext('2d');

      // Deep dark charcoal metallic background
      ctx.fillStyle = '#020406';
      ctx.fillRect(0, 0, 1024, 1024);

      // Top softbox light (brilliant specular silver white)
      const g1 = ctx.createLinearGradient(0, 0, 0, 360);
      g1.addColorStop(0.0, '#FFFFFF');
      g1.addColorStop(0.4, '#CBD5E1');
      g1.addColorStop(1.0, '#1E293B');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, 1024, 360);

      // Sharp central chrome reflection band (pure white highlight bordered by deep charcoal)
      const g2 = ctx.createLinearGradient(0, 420, 0, 680);
      g2.addColorStop(0.0, '#020406');
      g2.addColorStop(0.15, '#334155');
      g2.addColorStop(0.5, '#FFFFFF');
      g2.addColorStop(0.85, '#334155');
      g2.addColorStop(1.0, '#020406');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 420, 1024, 260);

      // Deep shadow curve under roll (creates realistic dark metallic shading under cylinder)
      const g3 = ctx.createLinearGradient(0, 750, 0, 1024);
      g3.addColorStop(0.0, '#020406');
      g3.addColorStop(0.4, '#64748B');
      g3.addColorStop(0.8, '#0F172A');
      g3.addColorStop(1.0, '#020406');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 750, 1024, 274);

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

    // Create high-resolution crinkled foil texture (horizontal wrap lines + dense polygonal crinkle facets)
    const createFoilBumpTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      c.fillStyle = '#808080';
      c.fillRect(0, 0, 1024, 1024);

      // 1. Horizontal wrapped foil crease lines (running along roll length)
      c.lineWidth = 2.0;
      for (let y = 0; y < 1024; y += 12) {
        c.beginPath();
        c.moveTo(0, y + (Math.random() - 0.5) * 4);
        c.lineTo(1024, y + (Math.random() - 0.5) * 4);
        c.strokeStyle = Math.random() > 0.4 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
        c.stroke();
      }

      // 2. Dense crinkled foil facets (triangular & polygonal crease noise)
      for (let i = 0; i < 600; i++) {
        const x1 = Math.random() * 1024;
        const y1 = Math.random() * 1024;
        const radius = 20 + Math.random() * 80;
        
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x1 + (Math.random() - 0.5) * radius, y1 + (Math.random() - 0.5) * radius);
        c.lineTo(x1 + (Math.random() - 0.5) * radius, y1 + (Math.random() - 0.5) * radius);
        c.closePath();
        
        c.strokeStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)';
        c.lineWidth = 1.2 + Math.random() * 2.5;
        c.stroke();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      return tex;
    };

    const foilBumpTexture = createFoilBumpTexture();

    // 1. Ambient Light - low fill so shadowed undersides develop rich dark metallic depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);

    // 2. Key Light - top overhead specular
    const keyLight = new THREE.DirectionalLight(0xffffff, 5.2);
    keyLight.position.set(4, 14, 8);
    scene.add(keyLight);

    // 3. Fill Light - cool silver fill
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 2.2);
    fillLight.position.set(-6, 3, 5);
    scene.add(fillLight);

    // 4. Rim Light
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 3.8);
    rimLight1.position.set(-5, 8, -8);
    scene.add(rimLight1);

    // Group Setup
    const foilRollGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // Photorealistic Deep High-Contrast Aluminum Foil Material
    const aluminiumMaterial = new THREE.MeshStandardMaterial({
      color: 0x717C8D,        // Rich gunmetal steel-silver (creates deep realistic metallic shadows)
      metalness: 0.98,        // 98% metallic chrome character
      roughness: 0.11,        // Razor-sharp specular highlights & deep contrast
      bumpMap: foilBumpTexture,
      bumpScale: 0.07,        // Deep foil wrinkles & crinkled facets
      envMap: studioEnvMap,
      envMapIntensity: 2.5,
      side: THREE.DoubleSide
    });

    // Use pure procedural metallic reflections for both the cylinder and the sheet.
    // This guarantees a flawless, invisible seam where the sheet unrolls from the cylinder.
    // The sheet will get its realism entirely from its 3D physical waves catching the specular lights.

    // 1. Texture for the End-Lip Cardboard Tube Wall Ring (Rough-cut grayish-tan recycled cardboard pulp with deep cut notches)
    const createCardboardEndLipTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      
      const cx = 512, cy = 512;
      const rInner = 200, rOuter = 260;

      // Darker warm grayish-brown recycled cardboard base matching reference photo
      c.fillStyle = '#98846E';
      c.fillRect(0, 0, 1024, 1024);

      // Fine recycled paper pulp fiber specks
      for (let i = 0; i < 6000; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = rInner + Math.random() * (rOuter - rInner);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(215, 195, 170, 0.5)' : 'rgba(50, 32, 18, 0.55)';
        c.fillRect(x, y, 1.5 + Math.random() * 3.5, 1.5 + Math.random() * 3.5);
      }

      // 48 High-contrast rough-cut cardboard edge notches and radial paper fold crease lines
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
        const r1 = rInner - 12 + Math.random() * 15;
        const r2 = rOuter + 12 - Math.random() * 15;
        
        // Deep shadow notch cut
        c.beginPath();
        c.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        c.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        c.strokeStyle = 'rgba(20, 10, 5, 0.9)';
        c.lineWidth = 4.0 + Math.random() * 4.0;
        c.stroke();

        // Bright paper fold edge highlight stroke
        c.beginPath();
        c.moveTo(cx + Math.cos(angle + 0.02) * r1, cy + Math.sin(angle + 0.02) * r1);
        c.lineTo(cx + Math.cos(angle + 0.02) * r2, cy + Math.sin(angle + 0.02) * r2);
        c.strokeStyle = 'rgba(255, 235, 210, 0.8)';
        c.lineWidth = 3.0;
        c.stroke();
      }

      // Compressed cardboard layer winding rings
      for (let r = rInner + 10; r <= rOuter - 10; r += 12) {
        c.beginPath();
        c.arc(cx, cy, r + (Math.random() - 0.5) * 3, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(30, 18, 8, 0.6)';
        c.lineWidth = 3.5;
        c.stroke();
      }

      // Outer paper wrap border
      c.beginPath();
      c.arc(cx, cy, rOuter, 0, Math.PI * 2);
      c.strokeStyle = '#584028';
      c.lineWidth = 7;
      c.stroke();

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 16;
      return tex;
    };

    // 2. Texture for the Outer Protruding Cardboard Rim Cylinder (Heavy 3D spiral paper overlap folds & ply seams)
    const createCardboardRimTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      
      // Warm grayish-brown kraft cardboard base
      c.fillStyle = '#98846E';
      c.fillRect(0, 0, 1024, 1024);

      // Fine paper pulp fiber specks
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(225, 205, 180, 0.5)' : 'rgba(45, 28, 14, 0.55)';
        c.fillRect(x, y, 2 + Math.random() * 4, 1.5 + Math.random() * 3);
      }

      // 28 High-contrast 45-degree diagonal spiral paper winding overlap folds (folded paper layers on outer rim!)
      for (let i = -1024; i < 2048; i += 110) {
        // Deep dark paper overlap shadow seam
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 1024, 1024);
        c.strokeStyle = 'rgba(20, 10, 5, 0.92)';
        c.lineWidth = 10;
        c.stroke();

        // Bright paper fold edge highlight ridge
        c.beginPath();
        c.moveTo(i + 8, 0);
        c.lineTo(i + 1032, 1024);
        c.strokeStyle = 'rgba(255, 235, 210, 0.85)';
        c.lineWidth = 6;
        c.stroke();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 1);
      return tex;
    };

    // 3. Texture for the Interior Tube Tunnel Wall (Dark warm recycled cardboard paper inside the tube)
    const createCardboardInteriorTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 1024;
      const c = cv.getContext('2d');
      
      // Dark warm recycled cardboard brown base matching reference photo
      c.fillStyle = '#6E553F';
      c.fillRect(0, 0, 1024, 1024);

      // High-density paper fiber pulp noise
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        c.fillStyle = Math.random() > 0.5 ? 'rgba(175, 150, 120, 0.35)' : 'rgba(45, 28, 15, 0.4)';
        c.fillRect(x, y, 2 + Math.random() * 4, 1.5 + Math.random() * 3);
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      return tex;
    };

    const cardboardEndLipTexture = createCardboardEndLipTexture();
    const cardboardRimTexture = createCardboardRimTexture();

    const interiorCardboardMat = new THREE.MeshStandardMaterial({
      color: 0x6E553F,
      map: createCardboardInteriorTexture(),
      roughness: 0.95,
      metalness: 0.01,
      side: THREE.DoubleSide
    });

    const cardboardRingMat = new THREE.MeshStandardMaterial({
      color: 0x98846E,
      map: cardboardEndLipTexture,
      bumpMap: cardboardEndLipTexture,
      bumpScale: 0.22,         // Deep 3D cut-notches & paper fold creases on end lip!
      roughness: 0.88,
      metalness: 0.01,
      side: THREE.DoubleSide
    });

    const cardboardRimMat = new THREE.MeshStandardMaterial({
      color: 0x98846E,
      map: cardboardRimTexture,
      bumpMap: cardboardRimTexture,
      bumpScale: 0.28,         // Heavy 3D paper ply winding folds & overlap seams on outer rim!
      roughness: 0.90,
      metalness: 0.01,
      side: THREE.DoubleSide
    });

    // Sub-group for spinning components (the roll cylinder, core, and rings)
    const rollCylinderGroup = new THREE.Group();
    foilRollGroup.add(rollCylinderGroup);

    // 1. FULL 3D CYLINDER FOIL ROLL MESH (Length 4.2)
    const outerGeo = new THREE.CylinderGeometry(0.95, 0.95, 4.2, 64, 1, true);
    const outerFoilMesh = new THREE.Mesh(outerGeo, aluminiumMaterial);
    outerFoilMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(outerFoilMesh);

    // 2. PROTRUDING 3D CARDBOARD CORE TUBE (Length 4.36 - Sticks out 0.08 on each end!)
    const coreTunnelGeo = new THREE.CylinderGeometry(0.40, 0.40, 4.36, 64, 1, true);
    const coreTunnelMesh = new THREE.Mesh(coreTunnelGeo, interiorCardboardMat);
    coreTunnelMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(coreTunnelMesh);

    // Outer cardboard tube wall rim cylinder (the 0.08 lip sticking out past foil with heavy paper winding folds!)
    const cardboardRimGeo = new THREE.CylinderGeometry(0.52, 0.52, 4.36, 64, 1, true);
    const cardboardRimMesh = new THREE.Mesh(cardboardRimGeo, cardboardRimMat);   // CRITICAL FIX: Pass cardboardRimMat!
    cardboardRimMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(cardboardRimMesh);

    // Cardboard core end rings (front face of the protruding tube wall: 0.40 to 0.52)
    const cardboardRingGeo = new THREE.RingGeometry(0.40, 0.52, 64);
    
    const leftCardboardRing = new THREE.Mesh(cardboardRingGeo, cardboardRingMat);
    leftCardboardRing.position.x = -2.181;
    leftCardboardRing.rotation.y = Math.PI / 2;
    rollCylinderGroup.add(leftCardboardRing);

    const rightCardboardRing = new THREE.Mesh(cardboardRingGeo, cardboardRingMat);
    rightCardboardRing.position.x = 2.181;
    rightCardboardRing.rotation.y = Math.PI / 2;
    rollCylinderGroup.add(rightCardboardRing);

    // Helper: Create photorealistic concentric wound silver foil layer edge texture matching reference photo
    const createFoilEdgeTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      const cx = 512, cy = 512;
      const rInner = 266;
      const rOuter = 490;

      // Authentic cool steel-silver metallic base (NO WHITE BLOWOUT)
      const baseGrad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
      baseGrad.addColorStop(0.0, '#717C8D');
      baseGrad.addColorStop(0.3, '#9EA8B6');
      baseGrad.addColorStop(0.65, '#4A5568');
      baseGrad.addColorStop(1.0, '#2D3748');

      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 1024, 1024);

      // Draw 60 sharp concentric wound foil layer rings (alternating specular silver & dark grooves)
      const rings = 60;
      for (let i = 0; i < rings; i++) {
        const r = rInner + (i / rings) * (rOuter - rInner);
        
        // Dark metallic foil layer shadow line
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // Crisp specular metallic reflection line
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
      return tex;
    };

    const foilEdgeTexture = createFoilEdgeTexture();

    // 3. ROLLED FOIL EDGE RINGS (HIGH-CONTRAST METALLIC CONCENTRIC FOIL LAYERS)
    const ringGeo = new THREE.RingGeometry(0.52, 0.95, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x717C8D,        // Cool steel-silver (matches roll body)
      map: foilEdgeTexture,
      bumpMap: foilEdgeTexture,
      bumpScale: 0.05,
      metalness: 0.96,        // 96% metallic character
      roughness: 0.18,        // Crisp specular roll-off
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

    // Invisible Cylinder Hit Enclosure (Guarantees 100% hit detection on top, sides, and rings)
    const cylinderHitGeo = new THREE.CylinderGeometry(1.2, 1.2, 4.6, 32);
    const cylinderHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const cylinderHitMesh = new THREE.Mesh(cylinderHitGeo, cylinderHitMat);
    cylinderHitMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(cylinderHitMesh);

    // 5. UNROLLED 3D FOIL SHEET EXTENSION (Mathematically continuous parametric surface)
    const baseSheetLength = 3.6;
    const sheetGeo = new THREE.PlaneGeometry(4.2, baseSheetLength, 64, 64);
    sheetGeo.translate(0, -baseSheetLength / 2, 0);

    const R_sheet = 0.951;  // Fits flush on cylinder radius 0.95
    const theta_0 = -2.9;   // Starts wrapped deep at the BACK of the cylinder (100% hidden from view)
    const v_detach = 1.0;   // Wraps all the way around the bottom curve to the front

    const theta_d = theta_0 + (v_detach / R_sheet);
    const y_d = R_sheet * Math.sin(theta_d);
    const z_d = R_sheet * Math.cos(theta_d);
    const Ty = Math.cos(theta_d);
    const Tz = -Math.sin(theta_d);
    const Ny = Math.sin(theta_d);
    const Nz = Math.cos(theta_d);

    let lastRenderedPull = -1;

    // Store pristine original V coordinates once so dynamic updates never corrupt vertex sampling
    const origVArray = new Float32Array(sheetGeo.attributes.position.count);
    const initPos = sheetGeo.attributes.position;
    for (let k = 0; k < initPos.count; k++) {
      origVArray[k] = -initPos.getY(k);
    }

    let is360Mode = false;
    let isDragging = false;

    const updateSheetGeometry = (pullLength, time = 0) => {
      const pos = sheetGeo.attributes.position;
      const unrolledTotal = (baseSheetLength - v_detach) + pullLength;

      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        const v = origVArray[j]; // Read pristine, uncorrupted V coordinate!

        let currY, currZ;

        if (v <= v_detach) {
          // Wrapped flush on the bottom curve of the cylinder (100% PERMANENT LOCKED)
          const theta = theta_0 + (v / R_sheet);
          currY = R_sheet * Math.sin(theta);
          currZ = R_sheet * Math.cos(theta);
        } else {
          // Unrolling tail extends outwards according to pullLength
          const progressInOriginal = (v - v_detach) / (baseSheetLength - v_detach);
          const s = progressInOriginal * unrolledTotal;

          const unrollY = y_d + s * Ty;
          const unrollZ = z_d + s * Tz;

          const intensity = Math.pow(progressInOriginal, 1.5);
          const wave1 = Math.sin(x * 5.0 + s * 2.5 + time * 2.0) * 0.04;
          const wave2 = Math.cos(x * 9.0 - s * 4.0 - time * 1.5) * 0.02;
          const wave = (wave1 + wave2) * intensity;

          currY = unrollY + wave * Ny;
          currZ = unrollZ + wave * Nz;

          // GRAVITY PHYSICS APPLICATION:
          // Earth's gravity sag and pendulum sway apply strictly in 3D View mode or while dragging,
          // preserving 100% exact original position in default resting state
          if (is360Mode || isDragging) {
            const gravityWeight = Math.pow(progressInOriginal, 1.8) * 0.55;
            const gravitySway = Math.sin(time * 2.2 + progressInOriginal * 3.0) * 0.03 * progressInOriginal;
            
            // Downward gravity pull
            currY -= gravityWeight * 0.85;
            currZ -= gravityWeight * 0.35 + gravitySway;
          }
        }

        pos.setX(j, x);
        pos.setY(j, currY);
        pos.setZ(j, currZ);
      }

      pos.needsUpdate = true;
      sheetGeo.computeVertexNormals();
    };

    updateSheetGeometry(0, 0);

    const sheetMesh = new THREE.Mesh(sheetGeo, aluminiumMaterial);
    sheetMesh.position.set(0, 0, 0);
    sheetMesh.rotation.set(0, 0, 0);
    
    foilRollGroup.add(sheetMesh);

    // 6. INVISIBLE HITBOX FOR EASIER INTERACTION
    // Sits right where the sheet and Pull Me text are, guaranteeing 100% reliable drag triggering everywhere
    const hitGeo = new THREE.PlaneGeometry(10, 10);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, -2, 0);
    foilRollGroup.add(hitMesh);

    // Initial Global Orientation (Corrected 3/4 perspective)
    foilRollGroup.rotation.x = -0.25; // Bottom points forward so sheet flows towards camera
    foilRollGroup.rotation.y = 0.65;  // Right end points away into background, left end comes forward
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
      lastRenderedPull = -1;
      updateSheetGeometry(currentFoilPull, 0);
      window.dispatchEvent(new CustomEvent('360-mode-toggle', { detail: { active: is360Mode } }));
    };

    const handlePointerDown = (e) => {
      // Don't intercept clicks on interactive buttons, links, or form controls
      if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea, [role="button"], [title="360° Free Rotation Mode"]')) {
        return;
      }
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // In 360° mode: ANY click ANYWHERE on screen starts free rotation immediately
      if (is360Mode) {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        dragStartClientY = clientY;
        dragStartClientX = clientX;
        document.body.style.cursor = 'grabbing';
        if (e.pointerId !== undefined && canvasRef.current.setPointerCapture) {
          try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) {}
        }
        return;
      }

      // Normal mode: raycast from camera to hit 3D model even if clicking over transparent text overlay containers
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(foilRollGroup.children, true);
      
      if (intersects.length > 0) {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        dragStartClientY = clientY;
        dragStartClientX = clientX;
        document.body.style.cursor = 'grabbing';
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
          // In 360° mode: always show grab cursor everywhere
          if (document.body.style.cursor !== 'grab') document.body.style.cursor = 'grab';
        } else if (e.target === canvasRef.current) {
          // Normal mode: only show grab when hovering over the 3D model
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
          if (raycaster.intersectObjects(foilRollGroup.children, true).length > 0) {
            if (document.body.style.cursor !== 'grab') document.body.style.cursor = 'grab';
          } else {
            if (document.body.style.cursor !== 'default') document.body.style.cursor = 'default';
          }
        } else {
           if (document.body.style.cursor === 'grab') document.body.style.cursor = 'default';
        }
        return;
      }
      
      // Calculate drag deltas
      const deltaX = clientX - dragStartClientX;
      const deltaY = clientY - dragStartClientY;
      
      if (is360Mode) {
        // FREELY ROTATE 360 IN ANY DIRECTION ONLY WHEN BUTTON IS CLICKED!
        manualYRotation += deltaX * 0.01;
        manualXRotation += deltaY * 0.01;
      } else {
        // Normal vertical unroll mode
        targetFoilPull += deltaY * 0.015;
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
        targetFoilPull = 0; // Automatically retract when released
        document.body.style.cursor = 'default';
        
        // Check if still hovering to reset cursor appropriately
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        if (raycaster.intersectObjects([sheetMesh, hitMesh]).length > 0) {
          document.body.style.cursor = 'grab';
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

      // Do zero WebGL rendering or DOM mutations when hero is scrolled out of viewport
      if (!isVisible) return;

      // Smooth unroll interpolation
      currentFoilPull += (targetFoilPull - currentFoilPull) * 0.15;


      if (foilRollGroup) {
        // Smoothly glide back to original default angle when customer releases mouse/touch
        if (!isDragging) {
          manualYRotation += (0 - manualYRotation) * 0.08;
          manualXRotation += (0 - manualXRotation) * 0.08;
        }

        // EXACT FIXED ANGLE + MANUAL 360 ROTATION (AUTOSNAPS BACK ON RELEASE)
        foilRollGroup.rotation.x = -0.25 + manualXRotation;
        foilRollGroup.rotation.y = 0.65 + manualYRotation;
        foilRollGroup.rotation.z = 0.35;
        
        const bounce = window.innerWidth < 768 ? 0 : Math.sin(Date.now() * 0.0016) * 0.09;
        foilRollGroup.position.x = baseFoilX;
        foilRollGroup.position.y = baseFoilY + bounce;

        // Dynamically track PULL ME hint directly to the 3D surface of the unrolled foil sheet as it moves
        if (overlayRef.current && canvasRef.current) {
          const isUnrolledOr360 = isDragging || currentFoilPull > 0.1 || is360Mode;
          if (isUnrolledOr360) {
            overlayRef.current.style.opacity = '0';
            overlayRef.current.style.pointerEvents = 'none';
          } else {
            overlayRef.current.style.opacity = '1';
            overlayRef.current.style.pointerEvents = 'auto';

            // Calculate 3D midpoint position along the moving unrolled sheet
            const unrolledTail = (baseSheetLength - v_detach) + currentFoilPull;
            const midTail = unrolledTail * 0.45;

            // Responsive 3D tracking offsets tuned for each device scale
            const isMobile = window.innerWidth < 768;
            const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

            const trackX = isMobile ? 0.95 : (isTablet ? 1.15 : 1.35);
            const trackYOffset = isMobile ? 0.10 : (isTablet ? -0.05 : -0.15);
            const trackZOffset = isMobile ? 0.05 : 0.1;

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

        // Dispatch custom event so right gallery fades out ONLY when pulling
        const pullState = isDragging || currentFoilPull > 0.2;
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
          updateSheetGeometry(currentFoilPull, is360Mode || isDragging ? timeSec : 0);
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
      >
        <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '1.5px', marginBottom: '6px' }}>
          Pull Me
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25d958" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
          <line x1="12" y1="4" x2="12" y2="20"></line>
          <polyline points="19 13 12 20 5 13"></polyline>
        </svg>
      </div>
      <style>{`
        @keyframes foilBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(10px); }
          60% { transform: translateY(5px); }
        }
      `}
      </style>
    </div>
  );
}
