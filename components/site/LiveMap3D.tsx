"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const BRAND = 0x2356f6;
const SKY = 0x9cc2ff;
const INK = 0x0a0a0c;
const CELL = 2.2;

/** Small seeded random so the city looks the same on every visit. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Route along road centre lines, with rounded corners. */
function buildRoute() {
  const corners = [
    new THREE.Vector3(-5.5, 0.06, -3.3),
    new THREE.Vector3(-1.1, 0.06, -3.3),
    new THREE.Vector3(-1.1, 0.06, 1.1),
    new THREE.Vector3(3.3, 0.06, 1.1),
    new THREE.Vector3(3.3, 0.06, 5.5),
  ];
  const r = 0.55;
  const pts: THREE.Vector3[] = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const prev = corners[i - 1];
    const c = corners[i];
    const next = corners[i + 1];
    const a = c.clone().add(prev.clone().sub(c).normalize().multiplyScalar(r));
    const b = c.clone().add(next.clone().sub(c).normalize().multiplyScalar(r));
    const curve = new THREE.QuadraticBezierCurve3(a, c, b);
    pts.push(...curve.getPoints(8));
  }
  pts.push(corners[corners.length - 1]);
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  return path;
}

export default function LiveMap3D({ onProgress }: { onProgress?: (t: number) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const progressCb = useRef(onProgress);
  progressCb.current = onProgress;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the tile keeps its flat background and labels.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    const target = new THREE.Vector3(-0.4, 0, 1.4);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d3e6, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(6, 12, 5);
    scene.add(sun);

    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // Ground (the white roads).
    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(60, 60)), keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // City blocks as one instanced mesh.
    const rand = rng(7);
    const span = 6;
    const count = (span * 2 + 1) ** 2;
    const blockGeo = keep(new THREE.BoxGeometry(1, 1, 1));
    blockGeo.translate(0, 0.5, 0);
    const blockMat = keep(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }));
    const blocks = new THREE.InstancedMesh(blockGeo, blockMat, count);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    const palette = [0xe9edf4, 0xe3e9f3, 0xdde4f0, 0xeef1f6];
    let n = 0;
    for (let i = -span; i <= span; i++) {
      for (let j = -span; j <= span; j++) {
        const park = (i === -3 && j === 2) || (i === 2 && j === -3);
        const nearRoute = i >= -3 && i <= 2 && j >= -2 && j <= 3;
        const tall = !nearRoute && rand() < 0.14;
        const h = park ? 0.06 : tall ? 0.9 + rand() * 1.1 : 0.12 + rand() * (nearRoute ? 0.25 : 0.45);
        m.compose(new THREE.Vector3(i * CELL, 0, j * CELL), new THREE.Quaternion(), new THREE.Vector3(1.6, h, 1.6));
        blocks.setMatrixAt(n, m);
        blocks.setColorAt(n, col.set(park ? 0xddf6e7 : palette[Math.floor(rand() * palette.length)]));
        n++;
      }
    }
    scene.add(blocks);

    // Route: pale full line plus a brand-blue "travelled" line that grows.
    const route = buildRoute();
    const tubeSegs = 360;
    const fullTube = new THREE.Mesh(keep(new THREE.TubeGeometry(route, tubeSegs, 0.09, 8, false)), keep(new THREE.MeshStandardMaterial({ color: SKY, roughness: 0.6 })));
    const doneGeo = keep(new THREE.TubeGeometry(route, tubeSegs, 0.13, 10, false));
    const doneTube = new THREE.Mesh(doneGeo, keep(new THREE.MeshStandardMaterial({ color: BRAND, roughness: 0.4 })));
    const doneIndexCount = doneGeo.index ? doneGeo.index.count : 0;
    scene.add(fullTube, doneTube);

    // Start ring.
    const startRing = new THREE.Mesh(keep(new THREE.TorusGeometry(0.28, 0.07, 12, 32)), keep(new THREE.MeshStandardMaterial({ color: INK })));
    startRing.rotation.x = -Math.PI / 2;
    startRing.position.copy(route.getPointAt(0)).setY(0.12);
    scene.add(startRing);

    // Destination pin.
    const pin = new THREE.Group();
    const pinMat = keep(new THREE.MeshStandardMaterial({ color: INK, roughness: 0.35 }));
    const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.42, 32, 16)), pinMat);
    head.position.y = 1.15;
    const tip = new THREE.Mesh(keep(new THREE.ConeGeometry(0.3, 0.75, 32)), pinMat);
    tip.rotation.x = Math.PI;
    tip.position.y = 0.62;
    const dot = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 16, 8)), keep(new THREE.MeshStandardMaterial({ color: 0xffffff })));
    dot.position.set(0, 1.18, 0.32);
    pin.add(head, tip, dot);
    pin.position.copy(route.getPointAt(1)).setY(0);
    scene.add(pin);

    // Rider puck with a live pulse ring.
    const rider = new THREE.Group();
    const puck = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.46, 0.46, 0.2, 40)), keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })));
    const core = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 40)), keep(new THREE.MeshStandardMaterial({ color: BRAND, roughness: 0.3 })));
    const pulseMat = keep(new THREE.MeshBasicMaterial({ color: BRAND, transparent: true, opacity: 0.25, depthWrite: false }));
    const pulse = new THREE.Mesh(keep(new THREE.CircleGeometry(0.5, 40)), pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.02;
    rider.add(pulse, puck, core);
    puck.position.y = 0.22;
    core.position.y = 0.26;
    scene.add(rider);

    // Sizing.
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) frame(0);
    });
    ro.observe(el);
    resize();

    // Pointer steers the camera a little.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width - 0.5;
      pointer.ty = (e.clientY - r.top) / r.height - 0.5;
    };
    const onLeave = () => {
      pointer.tx = 0;
      pointer.ty = 0;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    const LOOP = 14; // seconds to drive the route
    const HOLD = 1.6; // pause at the gate
    let t = reduce ? 0.55 : 0;
    let last = performance.now();
    let elapsed = 0;
    let lastReported = -1;

    function frame(dt: number) {
      elapsed += dt;
      if (!reduce) {
        const cycle = (elapsed % (LOOP + HOLD)) / LOOP;
        t = Math.min(cycle, 1);
      }
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      const az = 0.72 + pointer.x * 0.5 + (reduce ? 0 : Math.sin(elapsed * 0.15) * 0.06);
      const el2 = 1.02 - pointer.y * 0.22;
      const radius = 25;
      camera.position.set(
        target.x + radius * Math.cos(el2) * Math.sin(az),
        target.y + radius * Math.sin(el2),
        target.z + radius * Math.cos(el2) * Math.cos(az),
      );
      camera.lookAt(target);

      const p = route.getPointAt(t);
      rider.position.set(p.x, 0.06, p.z);
      doneGeo.setDrawRange(0, Math.floor((doneIndexCount * t) / 6) * 6);

      const pulsePhase = (elapsed * 0.7) % 1;
      pulse.scale.setScalar(1 + pulsePhase * 1.6);
      pulseMat.opacity = 0.32 * (1 - pulsePhase);
      pin.position.y = reduce ? 0 : Math.abs(Math.sin(elapsed * 2)) * 0.18;

      renderer.render(scene, camera);

      const rounded = Math.round(t * 100) / 100;
      if (rounded !== lastReported) {
        lastReported = rounded;
        progressCb.current?.(t);
      }
    }

    let raf = 0;
    let visible = false;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frame(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || reduce) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    });
    io.observe(el);
    const onVis = () => (document.hidden || !visible ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    frame(0);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      blocks.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mount} className="absolute inset-0" aria-hidden />;
}
