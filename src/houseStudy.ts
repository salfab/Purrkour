import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PrototypeHouseArt} from './game/PrototypeHouseArt';
import type {DistrictKey} from './game/districts';

// A local inspection scene using the exact same kit as the streamed game.
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector<HTMLCanvasElement>('#study')!,antialias:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));
const scene=new THREE.Scene();scene.background=new THREE.Color('#c8dfeb');
const camera=new THREE.PerspectiveCamera(40,1,.1,100);
const query=new URLSearchParams(location.search);
const face=query.get('view')==='front';
const key=query.get('district');
const district:DistrictKey=key==='old-town'||key==='gardens'||key==='twilight'?key:'market';
const requestedVariant=Number(query.get('variant')??-1);
const variant=Number.isInteger(requestedVariant)&&requestedVariant>=-1?requestedVariant:-1;
camera.position.set(face?16:11,face?4:9,face?0:-14);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(-6.3,3.5,0);controls.minDistance=8;controls.maxDistance=36;
controls.maxPolarAngle=Math.PI*.49;controls.update();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({color:'#dfcfac'}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
const house=new PrototypeHouseArt();house.add(scene,0,1.8,-1,variant,district);
function resize():void{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
resize();window.addEventListener('resize',resize);
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
window.addEventListener('pagehide',()=>{
  renderer.setAnimationLoop(null);controls.dispose();house.dispose();
  floor.geometry.dispose();floor.material.dispose();renderer.dispose();
},{once:true});
