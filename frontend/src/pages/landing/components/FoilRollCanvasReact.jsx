import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function FoilRollCanvasReact({ activeVariant }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer, reqId, observer;

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

    // High-Res Seamless Brushed Silver Texture Map
    const silverBrushedTexture = textureLoader.load('/pure_foil_texture_seamless.jpg');
    silverBrushedTexture.wrapS = THREE.RepeatWrapping;
    silverBrushedTexture.wrapT = THREE.RepeatWrapping;
    silverBrushedTexture.repeat.set(3, 2); // Increased tiling for finer grain

    // True Photorealistic Brushed Aluminum Material
    const aluminiumMaterial = new THREE.MeshStandardMaterial({
      map: silverBrushedTexture,
      bumpMap: silverBrushedTexture,
      bumpScale: 0.015,       // Stronger bump for brushed feel
      color: 0x99a0a8,        // Medium grey base - metal gets its brightness from reflections!
      metalness: 0.9,         // High metalness - it IS metal
      roughness: 0.35,        // Moderate roughness - spreads the specular highlights beautifully
      side: THREE.DoubleSide
    });

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
    const cylinderHitGeo = new THREE.CylinderGeometry(1.1, 1.1, 4.4, 32);
    const cylinderHitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const cylinderHitMesh = new THREE.Mesh(cylinderHitGeo, cylinderHitMat);
    cylinderHitMesh.rotation.z = Math.PI / 2;
    rollCylinderGroup.add(cylinderHitMesh);

    // 5. UNROLLED 3D FOIL SHEET EXTENSION (Seamlessly connected)
    const baseSheetLength = 2.25;
    const sheetGeo = new THREE.PlaneGeometry(4.2, baseSheetLength, 64, 64);
    
    // Shift geometry so its origin (pivot point) is exactly at the top edge
    sheetGeo.translate(0, -baseSheetLength / 2, 0);

    // Apply realistic crumpled foil waves and an elegant swoop
    const sheetPos = sheetGeo.attributes.position;
    for (let j = 0; j < sheetPos.count; j++) {
      const x = sheetPos.getX(j);
      const y = sheetPos.getY(j);
      
      const intensity = Math.pow(Math.abs(y) / baseSheetLength, 1.5); 
      
      const wave1 = Math.sin(x * 5.0 + y * 2.5) * 0.04;
      const wave2 = Math.cos(x * 9.0 - y * 4.0) * 0.02;
      const z = (wave1 + wave2) * intensity;
      
      // Foil exits perfectly straight and natural. The deep diagonal flow comes purely from the cylinder's 3D rotation.
      sheetPos.setX(j, x);
      sheetPos.setZ(j, z);
    }
    sheetGeo.computeVertexNormals();

    // Create an independent material and texture instance for the sheet
    // so we can dynamically scale the texture tiling when it is pulled, preventing stretching.
    const sheetTexture = silverBrushedTexture.clone();
    sheetTexture.needsUpdate = true;
    const sheetMaterial = aluminiumMaterial.clone();
    sheetMaterial.map = sheetTexture;
    sheetMaterial.bumpMap = sheetTexture;

    const sheetMesh = new THREE.Mesh(sheetGeo, sheetMaterial);
    
    // Position exactly at the bottom-front tangent of the cylinder
    sheetMesh.position.set(0, -0.94, 0.05); 
    sheetMesh.rotation.set(-1.25, 0, 0);
    
    foilRollGroup.add(sheetMesh);

    // 6. INVISIBLE HITBOX FOR EASIER INTERACTION
    // This sits exactly where the sheet is, but is much larger so hovering near the text always triggers it.
    const hitGeo = new THREE.PlaneGeometry(8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, -3, 0);
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

    window.__toggle360Mode = () => {
      is360Mode = !is360Mode;
      window.dispatchEvent(new CustomEvent('360-mode-toggle', { detail: { active: is360Mode } }));
    };

    const handlePointerDown = (e) => {
      // Don't intercept clicks on the 360° toggle button itself — let it toggle normally
      if (e.target && e.target.closest && e.target.closest('[title="360° Free Rotation Mode"]')) {
        return;
      }
      
      if (e.cancelable) e.preventDefault();
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // In 360° mode: ANY click ANYWHERE on screen starts free rotation immediately
      if (is360Mode) {
        isDragging = true;
        dragStartClientY = clientY;
        dragStartClientX = clientX;
        document.body.style.cursor = 'grabbing';
        if (e.pointerId !== undefined && canvasRef.current.setPointerCapture) {
          try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) {}
        }
        return;
      }

      // Normal mode: only start drag if clicking directly on the canvas and hitting the 3D model
      if (e.target !== canvasRef.current) return;
      
      if (e.pointerId !== undefined && canvasRef.current.setPointerCapture) {
        try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) {}
      }
      
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(foilRollGroup.children, true);
      
      if (intersects.length > 0) {
        isDragging = true;
        dragStartClientY = clientY;
        dragStartClientX = clientX;
        document.body.style.cursor = 'grabbing';
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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

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

      // Fade out 'Pull Me' indicator when interacted with
      if (overlayRef.current) {
        overlayRef.current.style.opacity = currentFoilPull > 0.1 ? '0' : '1';
      }

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
        
        foilRollGroup.position.x = -0.4;
        foilRollGroup.position.y = 0.6 + Math.sin(Date.now() * 0.0016) * 0.09;

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

        // Apply interactive foil pull length (scale sheet)
        const scaleY = (baseSheetLength + currentFoilPull) / baseSheetLength;
        sheetMesh.scale.y = scaleY;
        
        // Prevent texture stretching by dynamically increasing texture tiling based on scale
        sheetTexture.repeat.set(3, 2 * scaleY);
        
        // Spin the cylinder roll dynamically based on pulled distance (circumference ratio)
        // Cylinder radius is 0.95. Unroll rotation = distance / radius
        rollCylinderGroup.rotation.x = currentFoilPull / 0.95;
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
        style={{
          position: 'absolute',
          bottom: '32%',
          left: '58%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          animation: 'foilBounce 2s infinite',
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.9), 0 1px 3px rgba(0, 0, 0, 1)',
          fontFamily: 'sans-serif',
          transition: 'opacity 0.2s ease',
          zIndex: 30
        }}
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
