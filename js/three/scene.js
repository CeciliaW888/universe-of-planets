import { colorWithAlpha, mixHex, withAlpha } from "../utils/color.js";

export function createThreeSceneController({ state, dom, getActiveWorld }) {
  const hasThree = typeof window.THREE !== "undefined";
  const threeState = {
    enabled: false,
    renderer: null,
    scene: null,
    camera: null,
    ambientLight: null,
    fillLight: null,
    keyLight: null,
    rimLight: null,
    sunLight: null,
    root: null,
    subjectGroup: null,
    atmosphereShell: null,
    atmosphere: null,
    glowShells: [],
    ringMesh: null,
    starField: null,
    dustField: null,
    targetRotationX: 0,
    targetRotationY: 0,
    dragRotationX: 0,
    dragRotationY: 0,
    pointerActive: false,
    pointerId: null,
    lastPointerX: 0,
    lastPointerY: 0,
    animationId: 0,
    resizeObserver: null,
    resizeHandler: null,
    currentWorldId: null,
  };

  function createRingTexture(color) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.12, "rgba(255,255,255,.55)");
    gradient.addColorStop(0.28, color);
    gradient.addColorStop(0.5, "rgba(255,255,255,.16)");
    gradient.addColorStop(0.72, color);
    gradient.addColorStop(0.88, "rgba(255,255,255,.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 120; index += 1) {
      const x = Math.random() * canvas.width;
      const width = 1 + (Math.random() * 4);
      const alpha = 0.04 + (Math.random() * 0.14);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, 0, width, canvas.height);
    }

    const fade = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 20, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    fade.addColorStop(0, "rgba(255,255,255,0)");
    fade.addColorStop(0.46, "rgba(255,255,255,0)");
    fade.addColorStop(0.72, "rgba(255,255,255,.12)");
    fade.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new window.THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }

  function createPlanetTexture(world) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const shadowTone = mixHex(world.color, "#040915", 0.7);
    const brightTone = mixHex(world.color, "#ffffff", 0.44);
    const accentTone = mixHex(world.color, world.type.includes("Ice") ? "#9edbff" : "#ffcc89", 0.42);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, brightTone);
    gradient.addColorStop(0.42, world.color);
    gradient.addColorStop(1, shadowTone);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 18; index += 1) {
      const y = (index / 17) * canvas.height;
      const bandHeight = 18 + (Math.random() * 54);
      const alpha = world.type.includes("Gas") || world.special === "sun"
        ? 0.06 + (Math.random() * 0.18)
        : 0.03 + (Math.random() * 0.1);
      ctx.fillStyle = colorWithAlpha(index % 2 === 0 ? brightTone : accentTone, alpha);
      ctx.beginPath();
      ctx.ellipse(canvas.width * (0.5 + ((Math.random() - 0.5) * 0.04)), y, canvas.width * (0.56 + (Math.random() * 0.12)), bandHeight, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const featureCount = world.type.includes("Gas") ? 10 : 24;
    for (let index = 0; index < featureCount; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radiusX = world.type.includes("Gas") ? 80 + (Math.random() * 150) : 20 + (Math.random() * 60);
      const radiusY = world.type.includes("Gas") ? 20 + (Math.random() * 50) : 12 + (Math.random() * 44);
      const alpha = world.type.includes("Gas") ? 0.08 + (Math.random() * 0.14) : 0.06 + (Math.random() * 0.16);
      ctx.fillStyle = colorWithAlpha(index % 3 === 0 ? shadowTone : accentTone, alpha);
      ctx.beginPath();
      ctx.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    if (world.special === "sun") {
      for (let index = 0; index < 14; index += 1) {
        const flareX = Math.random() * canvas.width;
        ctx.fillStyle = withAlpha("#fff7db", 0.08 + (Math.random() * 0.12));
        ctx.fillRect(flareX, 0, 18 + (Math.random() * 34), canvas.height);
      }
    }

    const texture = new window.THREE.CanvasTexture(canvas);
    texture.colorSpace = window.THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function disposeThreeObject(object) {
    if (!object) {
      return;
    }

    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  function ensureThreeScene() {
    if (!hasThree || threeState.enabled) {
      return;
    }

    const renderer = new window.THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = window.THREE.SRGBColorSpace;
    renderer.toneMapping = window.THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const scene = new window.THREE.Scene();
    scene.fog = new window.THREE.FogExp2(0x060a18, 0.038);
    const camera = new window.THREE.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 0.12, 5.9);

    const root = new window.THREE.Group();
    scene.add(root);

    const ambientLight = new window.THREE.AmbientLight(0xffffff, 0.16);
    const fillLight = new window.THREE.HemisphereLight(0x9fd6ff, 0x050814, 0.34);
    const keyLight = new window.THREE.DirectionalLight(0xfff2cb, 4.8);
    keyLight.position.set(6.4, 2.8, 5.8);
    const rimLight = new window.THREE.DirectionalLight(0x6fdcff, 2.1);
    rimLight.position.set(-6.8, 0.2, -4.8);
    const sunLight = new window.THREE.PointLight(0xffb457, 0, 24, 2);
    sunLight.position.set(-2.4, 1.4, 3.2);
    scene.add(ambientLight, fillLight, keyLight, rimLight, sunLight);

    const starGeometry = new window.THREE.BufferGeometry();
    const starPositions = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index += 1) {
      const radius = 10 + (Math.random() * 20);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const offset = index * 3;
      starPositions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[offset + 1] = radius * Math.cos(phi) * 0.72;
      starPositions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new window.THREE.BufferAttribute(starPositions, 3));
    const starField = new window.THREE.Points(
      starGeometry,
      new window.THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.045,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      }),
    );
    scene.add(starField);

    const dustGeometry = new window.THREE.BufferGeometry();
    const dustPositions = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      const offset = index * 3;
      dustPositions[offset] = (Math.random() - 0.5) * 18;
      dustPositions[offset + 1] = (Math.random() - 0.5) * 10;
      dustPositions[offset + 2] = -4 - (Math.random() * 14);
    }
    dustGeometry.setAttribute("position", new window.THREE.BufferAttribute(dustPositions, 3));
    const dustField = new window.THREE.Points(
      dustGeometry,
      new window.THREE.PointsMaterial({
        color: 0x9fc8ff,
        size: 0.12,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    scene.add(dustField);

    threeState.renderer = renderer;
    threeState.scene = scene;
    threeState.camera = camera;
    threeState.ambientLight = ambientLight;
    threeState.fillLight = fillLight;
    threeState.keyLight = keyLight;
    threeState.rimLight = rimLight;
    threeState.sunLight = sunLight;
    threeState.root = root;
    threeState.starField = starField;
    threeState.dustField = dustField;
    threeState.enabled = true;

    dom.overlayThreeStage.appendChild(renderer.domElement);
    dom.overlayScene.classList.add("has-three");

    const resize = () => {
      const rect = dom.overlayThreeStage.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    threeState.resizeHandler = resize;

    if ("ResizeObserver" in window) {
      threeState.resizeObserver = new ResizeObserver(resize);
      threeState.resizeObserver.observe(dom.overlayThreeStage);
    } else {
      window.addEventListener("resize", resize);
    }

    resize();

    const pointerMove = (event) => {
      if (!threeState.pointerActive || event.pointerId !== threeState.pointerId) {
        return;
      }

      const dx = event.clientX - threeState.lastPointerX;
      const dy = event.clientY - threeState.lastPointerY;
      threeState.lastPointerX = event.clientX;
      threeState.lastPointerY = event.clientY;
      threeState.dragRotationY += dx * 0.005;
      threeState.dragRotationX += dy * 0.0035;
      dom.overlayInteractHint.style.opacity = "0";
    };

    dom.overlayThreeStage.addEventListener("pointerdown", (event) => {
      threeState.pointerActive = true;
      threeState.pointerId = event.pointerId;
      threeState.lastPointerX = event.clientX;
      threeState.lastPointerY = event.clientY;
      dom.overlayThreeStage.setPointerCapture(event.pointerId);
    });
    dom.overlayThreeStage.addEventListener("pointermove", pointerMove);

    const releasePointer = (event) => {
      if (event.pointerId !== threeState.pointerId) {
        return;
      }
      threeState.pointerActive = false;
      threeState.pointerId = null;
    };

    dom.overlayThreeStage.addEventListener("pointerup", releasePointer);
    dom.overlayThreeStage.addEventListener("pointercancel", releasePointer);
  }

  function buildThreeSubject(world) {
    if (!threeState.enabled) {
      return;
    }

    if (threeState.subjectGroup) {
      threeState.root.remove(threeState.subjectGroup);
      disposeThreeObject(threeState.subjectGroup);
    }

    const group = new window.THREE.Group();
    group.rotation.z = world.special === "sun" ? 0.08 : -0.16;

    const radius = world.special === "sun" ? 2.52 : 2.28;
    const geometry = new window.THREE.SphereGeometry(radius, 128, 128);
    const texture = createPlanetTexture(world);
    const material = world.special === "sun"
      ? new window.THREE.MeshPhysicalMaterial({
        map: texture,
        color: new window.THREE.Color(world.color),
        emissive: new window.THREE.Color(world.color),
        emissiveIntensity: 1.85,
        roughness: 0.26,
        metalness: 0.02,
        clearcoat: 0.42,
        clearcoatRoughness: 0.26,
      })
      : new window.THREE.MeshPhysicalMaterial({
        map: texture,
        color: new window.THREE.Color(world.color),
        emissive: new window.THREE.Color(world.color),
        emissiveIntensity: 0.08,
        roughness: 0.66,
        metalness: world.type === "Ice Giant" ? 0.16 : 0.04,
        clearcoat: world.type.includes("Gas") ? 0.38 : 0.18,
        clearcoatRoughness: world.type.includes("Gas") ? 0.34 : 0.56,
      });

    const sphere = new window.THREE.Mesh(geometry, material);
    group.add(sphere);

    const atmosphere = new window.THREE.Mesh(
      new window.THREE.SphereGeometry(radius * (world.special === "sun" ? 1.13 : 1.08), 72, 72),
      new window.THREE.MeshBasicMaterial({
        color: new window.THREE.Color(world.special === "sun" ? "#ffd171" : mixHex(world.color, "#8eddff", 0.42)),
        transparent: true,
        opacity: world.special === "sun" ? 0.26 : 0.14,
        side: window.THREE.BackSide,
      }),
    );
    group.add(atmosphere);

    const atmosphereShell = new window.THREE.Mesh(
      new window.THREE.SphereGeometry(radius * (world.special === "sun" ? 1.21 : 1.12), 64, 64),
      new window.THREE.MeshBasicMaterial({
        color: new window.THREE.Color(world.special === "sun" ? "#ffd68d" : mixHex(world.color, "#8eddff", 0.35)),
        transparent: true,
        opacity: world.special === "sun" ? 0.12 : 0.18,
        side: window.THREE.BackSide,
      }),
    );
    group.add(atmosphereShell);

    const glowShells = [];
    if (world.special === "sun") {
      const warmGlow = new window.THREE.Mesh(
        new window.THREE.SphereGeometry(radius * 1.3, 48, 48),
        new window.THREE.MeshBasicMaterial({
          color: new window.THREE.Color("#ffd46d"),
          transparent: true,
          opacity: 0.24,
        }),
      );
      const outerGlow = new window.THREE.Mesh(
        new window.THREE.SphereGeometry(radius * 1.56, 36, 36),
        new window.THREE.MeshBasicMaterial({
          color: new window.THREE.Color("#ff9b47"),
          transparent: true,
          opacity: 0.13,
        }),
      );
      group.add(warmGlow, outerGlow);
      glowShells.push(warmGlow, outerGlow);
    }

    let ringMesh = null;
    if (world.ring) {
      const ringTexture = createRingTexture(withAlpha(world.color, 0.86));
      const ringMaterial = new window.THREE.MeshBasicMaterial({
        map: ringTexture,
        transparent: true,
        opacity: 1,
        side: window.THREE.DoubleSide,
        depthWrite: false,
      });
      ringMesh = new window.THREE.Mesh(new window.THREE.RingGeometry(radius * 1.34, radius * 2.18, 220), ringMaterial);
      ringMesh.rotation.x = -1.02;
      ringMesh.rotation.z = -0.38;
      group.add(ringMesh);
    }

    threeState.subjectGroup = group;
    threeState.atmosphereShell = atmosphereShell;
    threeState.atmosphere = atmosphere;
    threeState.glowShells = glowShells;
    threeState.ringMesh = ringMesh;
    threeState.currentWorldId = world.id;
    threeState.root.add(group);
  }

  function animateThreeScene() {
    if (!threeState.enabled || threeState.animationId) {
      return;
    }

    const tick = () => {
      threeState.animationId = window.requestAnimationFrame(tick);
      if (!state.overlayOpen || document.hidden) {
        return;
      }

      if (threeState.subjectGroup) {
        const world = getActiveWorld();
        const speed = world.special === "sun" ? 0.0036 : 0.0046;
        threeState.targetRotationY += speed;
        threeState.targetRotationX = Math.sin(performance.now() * 0.00032) * (world.special === "sun" ? 0.1 : 0.06);
        threeState.dragRotationY *= 0.95;
        threeState.dragRotationX *= 0.91;
        threeState.subjectGroup.rotation.y += ((threeState.targetRotationY + threeState.dragRotationY) - threeState.subjectGroup.rotation.y) * 0.1;
        threeState.subjectGroup.rotation.x += ((threeState.targetRotationX + threeState.dragRotationX) - threeState.subjectGroup.rotation.x) * 0.1;

        if (threeState.ringMesh) {
          threeState.ringMesh.rotation.z += 0.0014;
        }

        if (threeState.glowShells.length) {
          threeState.glowShells.forEach((mesh, index) => {
            mesh.rotation.y -= 0.001 * (index + 1);
            mesh.rotation.z += 0.0008 * (index + 1);
          });
        }
      }

      if (threeState.starField) {
        threeState.starField.rotation.y += 0.00035;
        threeState.starField.rotation.x += 0.00012;
      }

      if (threeState.dustField) {
        threeState.dustField.rotation.y -= 0.00018;
        threeState.dustField.position.x = Math.sin(performance.now() * 0.00024) * 0.12;
      }

      threeState.renderer.render(threeState.scene, threeState.camera);
    };

    tick();
  }

  function updateThreeScene(world) {
    if (!hasThree) {
      return;
    }

    ensureThreeScene();
    if (!threeState.enabled) {
      return;
    }

    if (threeState.currentWorldId !== world.id) {
      buildThreeSubject(world);
    }

    const isSun = world.special === "sun";
    threeState.ambientLight.intensity = isSun ? 0.2 : 0.12;
    if (threeState.fillLight) {
      threeState.fillLight.intensity = isSun ? 0.52 : 0.28;
    }
    threeState.keyLight.color.set(isSun ? "#ffe0a8" : "#fff3d1");
    threeState.keyLight.intensity = isSun ? 6.4 : 5.4;
    threeState.keyLight.position.set(6.8, 2.8, 5.8);
    threeState.rimLight.color.set(isSun ? "#ff9b40" : "#72d7ff");
    threeState.rimLight.intensity = isSun ? 3.2 : 2.4;
    threeState.rimLight.position.set(-6.6, 0.25, -4.8);
    threeState.sunLight.color.set(isSun ? "#ffb85c" : mixHex(world.color, "#ffd48a", 0.32));
    threeState.sunLight.intensity = isSun ? 9.4 : 3.1;
    threeState.sunLight.distance = isSun ? 32 : 22;
    threeState.camera.fov = isSun ? 23 : 21;
    threeState.camera.position.z = isSun ? 6.05 : 5.1;
    threeState.camera.position.y = isSun ? 0.12 : 0.02;
    threeState.targetRotationX = isSun ? 0.09 : 0.04;
    threeState.targetRotationY = 0.28;
    threeState.dragRotationX = 0;
    threeState.dragRotationY = 0;
    threeState.camera.updateProjectionMatrix();

    animateThreeScene();
  }

  function pauseAnimation() {
    if (threeState.animationId) {
      window.cancelAnimationFrame(threeState.animationId);
      threeState.animationId = 0;
    }
  }

  function destroyThreeScene() {
    if (!threeState.enabled) {
      return;
    }

    pauseAnimation();
    if (threeState.resizeObserver) {
      threeState.resizeObserver.disconnect();
    }
    if (threeState.resizeHandler) {
      window.removeEventListener("resize", threeState.resizeHandler);
    }
    if (threeState.subjectGroup) {
      disposeThreeObject(threeState.subjectGroup);
    }
    if (threeState.starField) {
      disposeThreeObject(threeState.starField);
    }
    if (threeState.dustField) {
      disposeThreeObject(threeState.dustField);
    }
    threeState.renderer.dispose();
  }

  return {
    hasThree,
    updateThreeScene,
    pauseAnimation,
    destroyThreeScene,
  };
}
