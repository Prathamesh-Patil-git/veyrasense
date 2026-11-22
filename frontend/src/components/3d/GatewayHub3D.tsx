import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Radio } from 'lucide-react';

interface GatewayHub3DProps {
  className?: string;
}

export const GatewayHub3D: React.FC<GatewayHub3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
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
    let width = container.clientWidth || 320;
    let height = container.clientHeight || 220;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 3.5, 6.2);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Studio lighting for claymorphic tactile reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xffd21c, 1.8, 15);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x5ba4f5, 1.2, 12);
    rimLight.position.set(3, -2, -3);
    scene.add(rimLight);

    // Create 3D Tactile Sensor Node Model
    const modelGroup = new THREE.Group();

    // 1. Molded industrial clay-white enclosure base
    const enclosureGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.9, 32);
    const enclosureMat = new THREE.MeshStandardMaterial({
      color: 0xfdfdfc,
      roughness: 0.25,
      metalness: 0.05,
    });
    const enclosure = new THREE.Mesh(enclosureGeo, enclosureMat);
    enclosure.position.y = 0;
    modelGroup.add(enclosure);

    // 2. Slate anodized top bezel ring
    const bezelGeo = new THREE.TorusGeometry(1.4, 0.12, 16, 48);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x172238,
      roughness: 0.3,
      metalness: 0.7,
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.y = 0.46;
    modelGroup.add(bezel);

    // 3. Central Transducer Sensor Dome
    const domeGeo = new THREE.SphereGeometry(1.1, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xffd21c,
      roughness: 0.2,
      metalness: 0.3,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.45;
    modelGroup.add(dome);

    // 4. Glowing status orbit ring
    const ringGeo = new THREE.RingGeometry(1.9, 2.05, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x78e9ad,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const orbitRing = new THREE.Mesh(ringGeo, ringMat);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.position.y = -0.4;
    modelGroup.add(orbitRing);

    // 5. Antenna / connector stalk
    const antGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x2b3e63, metalness: 0.8 });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(0.9, 0.8, -0.6);
    ant.rotation.z = -0.2;
    modelGroup.add(ant);

    scene.add(modelGroup);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle floating and gyroscopic tilt
      modelGroup.rotation.y = t * 0.45;
      modelGroup.rotation.x = Math.sin(t * 0.6) * 0.12 + 0.15;
      modelGroup.position.y = Math.sin(t * 1.5) * 0.08;

      orbitRing.rotation.z = -t * 0.5;

      renderer.render(scene, camera);
    };

    animate();

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
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {webGlSupported ? (
        <div ref={containerRef} className="w-full h-full min-h-[180px] flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF6C9] flex items-center justify-center text-[#172238] shadow-sm">
            <Radio className="w-8 h-8 text-[#875B00]" />
          </div>
        </div>
      )}
    </div>
  );
};
