import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  RotateCw,
  Layers,
  Info,
  Radio,
} from 'lucide-react';
import { type SensorTelemetryItem } from '../../mock/dashboardData';

interface NetworkTopology3DProps {
  nodes?: SensorTelemetryItem[];
  selectedDepartmentId?: number | string;
  onSelectNode?: (node: SensorTelemetryItem) => void;
  className?: string;
}

export const NetworkTopology3D: React.FC<NetworkTopology3DProps> = ({
  nodes = [],
  selectedDepartmentId,
  onSelectNode,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeNode, setActiveNode] = useState<SensorTelemetryItem | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'alert'>('all');
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  // Filter nodes based on selected department and status
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchDept =
        !selectedDepartmentId ||
        selectedDepartmentId === 'all' ||
        String(n.departmentId) === String(selectedDepartmentId);
      const matchStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'healthy'
          ? n.healthStatus === 'healthy' || n.healthStatus === 'calibrating'
          : n.healthStatus === 'alert' || n.healthStatus === 'warning';
      return matchDept && matchStatus;
    });
  }, [nodes, selectedDepartmentId, filterStatus]);

  useEffect(() => {
    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 500;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131c30); // Deep industrial navy slate
    scene.fog = new THREE.FogExp2(0x131c30, 0.022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 14, 22);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting (Tactile 3D Studio lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 1.4);
    mainSun.position.set(12, 20, 15);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 1024;
    mainSun.shadow.mapSize.height = 1024;
    scene.add(mainSun);

    const yellowAccentLight = new THREE.PointLight(0xffd21c, 2.0, 30);
    yellowAccentLight.position.set(0, 3, 0);
    scene.add(yellowAccentLight);

    const blueBackLight = new THREE.PointLight(0x5ba4f5, 1.8, 40);
    blueBackLight.position.set(-15, 8, -15);
    scene.add(blueBackLight);

    // 4. Industrial Floor Grid
    const gridHelper = new THREE.GridHelper(36, 36, 0x2f4268, 0x1c2740);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // 5. Build Central Raspberry Pi 5 Gateway Coordinator Model
    const gatewayGroup = new THREE.Group();

    // Base chassis
    const baseGeo = new THREE.BoxGeometry(4.2, 0.4, 3.2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1f2c46,
      roughness: 0.35,
      metalness: 0.5,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    gatewayGroup.add(baseMesh);

    // PCB Substrate (Pi Green)
    const pcbGeo = new THREE.BoxGeometry(3.8, 0.1, 2.8);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f5c35,
      roughness: 0.4,
      metalness: 0.2,
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.y = 0.45;
    gatewayGroup.add(pcbMesh);

    // Central BCM2712 Processor with Silver Heat Spreader
    const cpuGeo = new THREE.BoxGeometry(1.0, 0.2, 1.0);
    const cpuMat = new THREE.MeshStandardMaterial({
      color: 0xd9dde5,
      metalness: 0.85,
      roughness: 0.2,
    });
    const cpuMesh = new THREE.Mesh(cpuGeo, cpuMat);
    cpuMesh.position.set(-0.3, 0.6, -0.1);
    gatewayGroup.add(cpuMesh);

    // GPIO 40-Pin Header (Gold pins)
    const gpioGeo = new THREE.BoxGeometry(2.4, 0.25, 0.35);
    const gpioMat = new THREE.MeshStandardMaterial({
      color: 0xffd21c,
      metalness: 0.8,
      roughness: 0.3,
    });
    const gpioMesh = new THREE.Mesh(gpioGeo, gpioMat);
    gpioMesh.position.set(-0.2, 0.6, -1.1);
    gatewayGroup.add(gpioMesh);

    // Dual Ethernet & USB Blocks
    const portGeo = new THREE.BoxGeometry(0.7, 0.5, 0.6);
    const portMat = new THREE.MeshStandardMaterial({
      color: 0xa0aec0,
      metalness: 0.9,
      roughness: 0.2,
    });
    const eth1 = new THREE.Mesh(portGeo, portMat);
    eth1.position.set(1.5, 0.7, 0.6);
    const eth2 = new THREE.Mesh(portGeo, portMat);
    eth2.position.set(1.5, 0.7, -0.6);
    gatewayGroup.add(eth1, eth2);

    // Status Pulsing Beacon Ring
    const ringGeo = new THREE.TorusGeometry(2.6, 0.05, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x78e9ad,
      transparent: true,
      opacity: 0.7,
    });
    const beaconRing = new THREE.Mesh(ringGeo, ringMat);
    beaconRing.rotation.x = Math.PI / 2;
    beaconRing.position.y = 0.5;
    gatewayGroup.add(beaconRing);

    scene.add(gatewayGroup);

    // 6. Build 3D Distributed Sensor Nodes and Signal Arcs
    const nodeMeshes: { mesh: THREE.Group; data: SensorTelemetryItem; originY: number }[] = [];
    const pulseParticles: {
      mesh: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      progress: number;
      speed: number;
    }[] = [];

    const totalNodes = visibleNodes.length || 1;
    const radius = 9.5;

    visibleNodes.forEach((node, i) => {
      const angle = (i / totalNodes) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.2);
      const dist = radius + ((i % 3) - 1) * 1.5;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(x, 0, z);

      // Status color resolution
      let nodeColor = 0x78e9ad; // Mint = healthy
      if (node.healthStatus === 'warning' || node.healthStatus === 'calibrating') nodeColor = 0xffd21c; // Yellow
      if (node.healthStatus === 'alert' || node.healthStatus === 'offline') nodeColor = 0xef6461; // Red

      // Different physical sensor transducer geometry by type
      if (node.sensorType.toLowerCase().includes('pressure')) {
        // Cylindrical hydraulic pressure cell with hex base
        const hexGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 6);
        const hexMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.7, roughness: 0.3 });
        const hexMesh = new THREE.Mesh(hexGeo, hexMat);
        hexMesh.position.y = 0.125;
        nodeGroup.add(hexMesh);

        const cylGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 24);
        const cylMat = new THREE.MeshStandardMaterial({ color: 0xd9dde5, metalness: 0.8, roughness: 0.2 });
        const cylMesh = new THREE.Mesh(cylGeo, cylMat);
        cylMesh.position.y = 0.65;
        nodeGroup.add(cylMesh);
      } else if (node.sensorType.toLowerCase().includes('temp') || node.sensorType.toLowerCase().includes('thermal')) {
        // Finned thermal transducer
        const finGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const finMat = new THREE.MeshStandardMaterial({ color: 0x2b3e63, metalness: 0.4, roughness: 0.3 });
        const finMesh = new THREE.Mesh(finGeo, finMat);
        finMesh.position.y = 0.4;
        nodeGroup.add(finMesh);

        const probeGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 16);
        const probeMat = new THREE.MeshStandardMaterial({ color: 0xffd21c, metalness: 0.8, roughness: 0.2 });
        const probeMesh = new THREE.Mesh(probeGeo, probeMat);
        probeMesh.position.y = 1.1;
        nodeGroup.add(probeMesh);
      } else {
        // Universal industrial puck / dome enclosure
        const domeGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.5, 24);
        const domeMat = new THREE.MeshStandardMaterial({ color: 0x263756, metalness: 0.5, roughness: 0.3 });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.y = 0.25;
        nodeGroup.add(domeMesh);

        const capGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.2 });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.y = 0.5;
        nodeGroup.add(capMesh);
      }

      // Glowing status LED bead
      const ledGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const ledMat = new THREE.MeshBasicMaterial({ color: nodeColor });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.y = 1.1;
      nodeGroup.add(ledMesh);

      // Node ground pedestal shadow disc
      const discGeo = new THREE.CircleGeometry(0.9, 24);
      const discMat = new THREE.MeshBasicMaterial({
        color: 0x0a101d,
        transparent: true,
        opacity: 0.4,
      });
      const discMesh = new THREE.Mesh(discGeo, discMat);
      discMesh.rotation.x = -Math.PI / 2;
      discMesh.position.y = 0.02;
      nodeGroup.add(discMesh);

      // Attach metadata for raycasting
      nodeGroup.userData = { nodeData: node };
      scene.add(nodeGroup);
      nodeMeshes.push({ mesh: nodeGroup, data: node, originY: nodeGroup.position.y });

      // Build Bezier Communication Arc to Gateway
      const pStart = new THREE.Vector3(x, 0.4, z);
      const pMid = new THREE.Vector3(x * 0.4, 2.5 + (i % 2) * 0.8, z * 0.4);
      const pEnd = new THREE.Vector3(0, 0.6, 0);

      const curve = new THREE.QuadraticBezierCurve3(pStart, pMid, pEnd);
      const points = curve.getPoints(32);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: node.healthStatus === 'alert' ? 0xef6461 : 0x2f4a7a,
        transparent: true,
        opacity: 0.5,
      });
      const arcLine = new THREE.Line(lineGeo, lineMat);
      scene.add(arcLine);

      // Animated Pulse Packet particle flowing along the arc
      const pulseGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: node.healthStatus === 'alert' ? 0xef6461 : 0x78e9ad,
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      scene.add(pulseMesh);

      pulseParticles.push({
        mesh: pulseMesh,
        curve,
        progress: (i * 0.23) % 1.0,
        speed: 0.003 + (i % 3) * 0.0015,
      });
    });

    // 7. Raycasting & Interaction Setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0.4;
    let currentRotationY = 0;
    let currentRotationX = 0.4;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = clientX - prevMouseX;
        const deltaY = clientY - prevMouseY;
        prevMouseX = clientX;
        prevMouseY = clientY;

        targetRotationY += deltaX * 0.006;
        targetRotationX = Math.max(0.1, Math.min(1.2, targetRotationX + deltaY * 0.004));
      }

      // Compute normalized mouse coordinates for raycasting
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      isDragging = false;

      // Detect click on node
      const rect = canvas.getBoundingClientRect();
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      nodeMeshes.forEach((n) => allObjects.push(...n.mesh.children));

      const intersects = raycaster.intersectObjects(allObjects, false);
      if (intersects.length > 0) {
        let parent = intersects[0].object.parent;
        while (parent && !parent.userData?.nodeData && parent !== scene) {
          parent = parent.parent;
        }
        if (parent && parent.userData?.nodeData) {
          const clickedNode = parent.userData.nodeData as SensorTelemetryItem;
          setActiveNode(clickedNode);
          if (onSelectNode) onSelectNode(clickedNode);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.005;
      camera.position.z = Math.max(12, Math.min(35, camera.position.z + zoomDelta));
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Auto rotation when enabled and not dragging
      if (isRotating && !isDragging) {
        targetRotationY += 0.0025;
      }

      // Smooth interpolation for camera orbit
      currentRotationY += (targetRotationY - currentRotationY) * 0.05;
      currentRotationX += (targetRotationX - currentRotationX) * 0.05;

      const camDist = camera.position.length();
      camera.position.x = Math.sin(currentRotationY) * Math.cos(currentRotationX) * camDist;
      camera.position.y = Math.sin(currentRotationX) * camDist;
      camera.position.z = Math.cos(currentRotationY) * Math.cos(currentRotationX) * camDist;
      camera.lookAt(0, 0.8, 0);

      // Pulse Gateway beacon ring
      const ringScale = 1.0 + Math.sin(elapsedTime * 2.5) * 0.12;
      beaconRing.scale.set(ringScale, ringScale, ringScale);
      beaconRing.rotation.z = elapsedTime * 0.4;

      // Animate packet pulses along Bezier arcs
      pulseParticles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1.0) p.progress = 0;
        const pos = p.curve.getPoint(p.progress);
        p.mesh.position.copy(pos);
      });

      // Subtle float animation on selected node
      nodeMeshes.forEach((item) => {
        if (activeNode && item.data.id === activeNode.id) {
          item.mesh.position.y = 0.4 + Math.sin(elapsedTime * 4) * 0.15;
        } else {
          item.mesh.position.y = 0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, [visibleNodes, isRotating, activeNode, onSelectNode]);

  return (
    <div className={`relative rounded-3xl overflow-hidden clay-dark text-white ${className}`}>
      {/* 3D WebGL Canvas or Resilient Fallback */}
      {webGlSupported ? (
        <div ref={containerRef} className="relative w-full h-[480px] sm:h-[560px] cursor-grab active:cursor-grabbing">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      ) : (
        <div className="p-8 text-center min-h-[440px] flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1F2C46] flex items-center justify-center text-[#FFD21C]">
            <Layers className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white">WebGL Hardware Acceleration Unavailable</h4>
          <p className="text-xs text-slate-400 max-w-md">
            Your browser does not have WebGL enabled. Falling back to the 2.5D schematic view.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl pt-4">
            {visibleNodes.slice(0, 8).map((node) => (
              <div
                key={node.id}
                onClick={() => setActiveNode(node)}
                className="p-3.5 rounded-2xl bg-[#1F2C46] text-left cursor-pointer hover:bg-[#253554] transition-colors"
              >
                <div className="flex justify-between items-center text-xs font-mono font-bold text-white">
                  <span>{node.id}</span>
                  <span className="w-2 h-2 rounded-full bg-[#78E9AD]" />
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-1">{node.sensorType}</div>
                <div className="text-[10px] text-[#FFD21C] mt-2 font-semibold">
                  {node.latestMeasurement} {node.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Overlay Bar: Gateway Indicator & View Controls */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-10">
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#172238]/85 backdrop-blur-md border border-[#2B3E63] text-xs font-semibold shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-[#78E9AD] animate-pulse" />
          <span className="text-slate-200">RPi 5 Central Gateway Coordinator</span>
          <span className="text-[10px] font-mono text-slate-400 pl-1 border-l border-slate-700">
            {visibleNodes.length} Nodes Active
          </span>
        </div>

        {/* Tactical View Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#172238]/85 backdrop-blur-md p-1 rounded-2xl border border-[#2B3E63] shadow-md">
          <button
            onClick={() => setIsRotating((prev) => !prev)}
            title={isRotating ? 'Pause Orbit' : 'Resume Orbit'}
            className={`p-2 rounded-xl text-xs font-medium transition-all ${
              isRotating
                ? 'bg-[#FFD21C] text-[#172238] font-bold shadow-2xs'
                : 'text-slate-300 hover:text-white hover:bg-[#253554]'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>

          <button
            onClick={() => {
              setFilterStatus((prev) => (prev === 'all' ? 'healthy' : prev === 'healthy' ? 'alert' : 'all'));
            }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-300 hover:bg-[#253554] transition-colors"
          >
            Filter: <span className="text-[#FFD21C] uppercase font-bold">{filterStatus}</span>
          </button>
        </div>
      </div>

      {/* Bottom Info HUD: Interactive Node Inspector Drawer */}
      {activeNode ? (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 pointer-events-auto z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-4 rounded-3xl bg-[#172238]/95 backdrop-blur-md border border-[#2B3E63] shadow-xl text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#253554]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#78E9AD]" />
                <span className="font-mono font-bold text-white text-sm">{activeNode.id}</span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#E8FAF1] text-[#0C5A37]">
                  {activeNode.healthStatus}
                </span>
              </div>
              <button
                onClick={() => setActiveNode(null)}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-[#253554]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Sensor Type</span>
                <span className="font-semibold text-white">{activeNode.sensorType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Department</span>
                <span className="font-semibold text-[#FFD21C]">{activeNode.departmentName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Telemetry Value</span>
                <span className="font-mono font-bold text-white text-sm">
                  {activeNode.latestMeasurement} {activeNode.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Confidence</span>
                <span className="font-mono font-semibold text-[#78E9AD]">
                  {(100 - parseFloat(activeNode.varianceScore || '0.5') * 10).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#253554] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#5BA4F5]" />
                <span>Mesh Link: <strong>-68 dBm</strong></span>
              </span>
              <span>Updated: {activeNode.lastReceived}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 pointer-events-none z-10 text-[11px] text-slate-400 flex items-center gap-2 bg-[#172238]/70 backdrop-blur-xs px-3 py-1.5 rounded-full border border-[#2B3E63]/60">
          <Info className="w-3.5 h-3.5 text-[#FFD21C]" />
          <span>{visibleNodes.length > 0 ? 'Click any 3D node to inspect real-time telemetry • Drag to rotate view' : 'Gateway Coordinator Active • 0 Transducers Connected • Drag to rotate view'}</span>
        </div>
      )}
    </div>
  );
};
