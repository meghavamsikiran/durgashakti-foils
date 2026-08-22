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
    renderer.toneMappingExposure = 1.1;

    // No complex environment map - we will rely entirely on strong specular lighting
    // to create the metallic reflections, which is more reliable for cylinders.
    scene.environment = null;

    // 1. Very Low Ambient Light - prevents the metal from looking flat and washed out
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // 2. Strong Key Light - creates the primary sharp silver highlight
    const keyLight = new THREE.DirectionalLight(0xffffff, 5.0);
    keyLight.position.set(5, 10, 10);
    scene.add(keyLight);

    // 3. Fill Light - slightly blueish to simulate studio reflection
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 3.0);
    fillLight.position.set(-8, 2, 5);
    scene.add(fillLight);

    // 4. Sharp Rim Light - critical for cylinders to pop from the dark background
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 4.0);
    rimLight1.position.set(-5, 10, -10);
    scene.add(rimLight1);
    
    const rimLight2 = new THREE.DirectionalLight(0xffffff, 3.5);
    rimLight2.position.set(5, -5, -10);
    scene.add(rimLight2);

    // Group Setup
    const foilRollGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // True Photorealistic Brushed Aluminum Material (Starts as solid silver, texture mapped on load)
    const aluminiumMaterial = new THREE.MeshStandardMaterial({
      color: 0x99a0a8,        // Medium grey base - metal gets its brightness from reflections!
      metalness: 0.9,         // High metalness - it IS metal
      roughness: 0.35,        // Moderate roughness - spreads the specular highlights beautifully
      side: THREE.DoubleSide
    });

    // Use pure procedural metallic reflections for both the cylinder and the sheet.
    // This guarantees a flawless, invisible seam where the sheet unrolls from the cylinder.
    // The sheet will get its realism entirely from its 3D physical waves catching the specular lights.

    const createCardboardCoreTexture = () => {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 512;
      const c = cv.getContext('2d');
      c.fillStyle = '#7A5836';
      c.fillRect(0, 0, 512, 512);
      c.strokeStyle = '#543B22';
      c.lineWidth = 8;
      for (let i = -512; i < 1024; i += 44) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 512, 512);
        c.stroke();
      }
      return new THREE.CanvasTexture(cv);
    };

    const coreMaterial = new THREE.MeshStandardMaterial({
      map: createCardboardCoreTexture(),
      roughness: 0.85,
      metalness: 0.05
    });

    // Sub-group for spinning components (the roll cylinder, core, and rings)
    const rollCylinderGroup = new THREE.Group();
    foilRollGroup.add(rollCylinderGroup);

    // 1. FULL 3D CYLINDER FOIL ROLL MESH
    const outerGeo = new THREE.CylinderGeometry(0.95, 0.95, 4.2, 64, 1, true);
    const outerFoilMesh = new THREE.Mesh(outerGeo, aluminiumMaterial);
    outerFoilMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(outerFoilMesh);

    // 2. FULL 3D CARDBOARD CORE TUBE MESH
    const innerGeo = new THREE.CylinderGeometry(0.55, 0.55, 4.24, 32);
    const innerCoreMesh = new THREE.Mesh(innerGeo, coreMaterial);
    innerCoreMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(innerCoreMesh);

    // Helper: Create photorealistic moiré-free concentric wound foil layer texture
    const createFoilEdgeTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      const cx = 512, cy = 512;
      const rInner = 280;
      const rOuter = 490;

      // Gleaming silver metallic base
      const baseGrad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
      baseGrad.addColorStop(0, '#FFFFFF');
      baseGrad.addColorStop(0.3, '#E2E8F0');
      baseGrad.addColorStop(0.6, '#FFFFFF');
      baseGrad.addColorStop(0.85, '#CBD5E1');
      baseGrad.addColorStop(1, '#FFFFFF');

      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 1024, 1024);

      // Draw 22 clean, wide, high-contrast concentric foil grooves (NO MOIRE ARTIFACTS)
      const rings = 22;
      for (let i = 0; i < rings; i++) {
        const r = rInner + (i / rings) * (rOuter - rInner);
        
        // Dark metallic groove
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.lineWidth = 4.5;
        ctx.stroke();

        // 3D Specular highlight stroke right next to it
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }

      // Add radial metallic reflection sheen matching the reference photo
      const sheenGrad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      sheenGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
      sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true);
      ctx.fill();

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
      return tex;
    };

    const foilEdgeTexture = createFoilEdgeTexture();

    // 3. ROLLED FOIL EDGE RINGS (BRIGHT GLEAMING SILVER CONCENTRIC LAYERS)
    const ringGeo = new THREE.RingGeometry(0.55, 0.95, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      map: foilEdgeTexture,
      bumpMap: foilEdgeTexture,
      bumpScale: 0.04,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x333344,
      emissiveMap: foilEdgeTexture,
      emissiveIntensity: 0.3,
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

    // 4. DARK CORE INTERIOR CAP & INVISIBLE 3D HIT ENCLOSURE
    const darkCoreGeo = new THREE.CylinderGeometry(0.48, 0.48, 4.26, 32);
    const darkCoreMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0e });
    const darkCore = new THREE.Mesh(darkCoreGeo, darkCoreMat);
    darkCore.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(darkCore);

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

    const updateSheetGeometry = (pullLength) => {
      const pos = sheetGeo.attributes.position;
      const unrolledTotal = (baseSheetLength - v_detach) + pullLength;

      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        const v = origVArray[j]; // Read pristine, uncorrupted V coordinate!

        let currY, currZ;

        if (v <= v_detach) {
          // Wrapped flush on the bottom curve of the cylinder (100% PERMANENTLY LOCKED)
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
          const wave1 = Math.sin(x * 5.0 + s * 2.5) * 0.04;
          const wave2 = Math.cos(x * 9.0 - s * 4.0) * 0.02;
          const wave = (wave1 + wave2) * intensity;

          currY = unrollY + wave * Ny;
          currZ = unrollZ + wave * Nz;
        }

        pos.setX(j, x);
        pos.setY(j, currY);
        pos.setZ(j, currZ);
      }

      pos.needsUpdate = true;
      sheetGeo.computeVertexNormals();
    };

    updateSheetGeometry(0);

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
    let isDragging = false;
    let dragStartClientY = 0;
    let targetFoilPull = 0;
    let currentFoilPull = 0;
    const maxPull = 12.0;

    let mouseX = 0, mouseY = 0;
    let targetRotationX = 0, targetRotationY = 0;
    let manualYRotation = 0;
    let manualXRotation = 0;
    let is360Mode = false;
    let dragStartClientX = 0;
    
    // Base positions for the animation loop to use
    let baseFoilX = -0.4;
    let baseFoilY = 0.6;

    window.__toggle360Mode = () => {
      is360Mode = !is360Mode;
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

        // Hide PULL TO UNROLL text completely while dragging, unrolled, or when 360° mode is active
        if (overlayRef.current) {
          const isUnrolledOr360 = isDragging || currentFoilPull > 0.1 || is360Mode;
          overlayRef.current.style.opacity = isUnrolledOr360 ? '0' : '1';
        }

        // Dispatch custom event so right gallery fades out ONLY when pulling
        const pullState = isDragging || currentFoilPull > 0.2;
        if (window.__lastFoilPullState !== pullState) {
          window.__lastFoilPullState = pullState;
          window.dispatchEvent(new CustomEvent('foil-pull-state', { detail: { isPulled: pullState } }));
        }

        // Dynamically extend unrolled sheet tail while keeping top edge 100% locked to cylinder
        if (Math.abs(currentFoilPull - lastRenderedPull) > 0.001) {
          lastRenderedPull = currentFoilPull;
          updateSheetGeometry(currentFoilPull);
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
