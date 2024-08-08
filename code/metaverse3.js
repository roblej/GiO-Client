import * as THREE from 'three';
import Stats from "stats.js";
import { GLTFLoader } from "../jsm/loaders/GLTFLoader.js";
import { Octree } from "../jsm/math/Octree.js";
import { Capsule } from "../jsm/math/Capsule.js";
import { OrbitControls } from "../jsm/controls/OrbitControls.js";
import { onMouseMove } from './event.js';
import { FBXLoader } from '../jsm/loaders/FBXLoader.js';
import { getSticker } from './event.js';
// import {stickerNumber} from './event.js';
import { updateSticker } from './event.js'
import { globalId } from './login.js';

export var game_name = "";

export function initThreeJS() {
    console.log("function complete")
    const loadingPage = document.getElementById('loadingPage');
    loadingPage.style.display = 'flex';

    const divContainer = document.querySelector("#webgl-container");
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    divContainer.appendChild(renderer.domElement);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    const scenes = [];
    const mixers = [];
    let currentSceneIndex = 0;
    let currentScene = null;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 100, 400);

    const controls = new OrbitControls(camera, divContainer);
    controls.target.set(0, 100, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 300;
    controls.maxDistance = 1000;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = 80 * (Math.PI / 180);

    const stats = new Stats();
    divContainer.appendChild(stats.dom);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const _mouse = { x: 0, y: 0 };
    const _positionLabel = document.getElementById("positionLabel");

    window.addEventListener('resize', onWindowResize, false);

    function initScene0() {
        const scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        scene.background = loader.load('./data/sky_images.jpeg');

        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        scene.add(ambientLight);

        const shadowLight = new THREE.DirectionalLight(0xffffff, 2);
        shadowLight.position.set(-1000, 1200, -2350);
        shadowLight.target.position.set(50, 0, -1000);
        scene.add(shadowLight);
        scene.add(shadowLight.target);
        shadowLight.castShadow = true;
        shadowLight.shadow.mapSize.width = 1024;
        shadowLight.shadow.mapSize.height = 1024;
        shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 5000;
        shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -5000;
        shadowLight.shadow.camera.near = 100;
        shadowLight.shadow.camera.far = 5000;
        shadowLight.shadow.radius = 2;

        const planeGeometry = new THREE.PlaneGeometry(20000, 20000);
        const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x0A630A });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.name = "plane";
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0;
        scene.add(plane);
        plane.receiveShadow = true;

        const worldOctree = new Octree();
        worldOctree.fromGraphNode(plane);

        new GLTFLoader().load("./data/schooln.glb", (gltf) => {
            const map = gltf.scene;
            scene.add(map);
            map.scale.set(500, 500, 500);
            map.position.set(0, 1, -2100);
            map.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            worldOctree.fromGraphNode(map);
            loadingPage.style.display = 'none';
        });

        new GLTFLoader().load("./data/maru_anim_noneT.glb", (gltf) => {
            const support = gltf.scene;
            scene.add(support);

            support.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.isMesh) {
                    child.userData.type = 'maru';
                }
            });

            const mixer = new THREE.AnimationMixer(support);
            mixers.push(mixer);
            const animationsMap = {};
            gltf.animations.forEach((clip) => {
                animationsMap[clip.name] = mixer.clipAction(clip);
            });
            support.userData.animationsMap = animationsMap;
            support.userData.mixer = mixer;
            if (animationsMap['Run']) {
                const idleAction = animationsMap['Run'];
                idleAction.play();
            }
            support.scale.set(20, 20, 20);
            support.position.set(50, 0, 0);
            support.rotation.y = Math.PI;
            worldOctree.fromGraphNode(support);
        });

        // Other models and NPCs loading similarly...

        return { scene, worldOctree };
    }

    // 다른 씬 초기화 함수들
    function initScene1() {
        const scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        scene.background = loader.load('./data/sky_images.jpeg');

        // 씬 1에 대한 설정

        return { scene, worldOctree: new Octree() };
    }

    function initScene2() {
        const scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        scene.background = loader.load('./data/sky_images.jpeg');

        // 씬 2에 대한 설정

        return { scene, worldOctree: new Octree() };
    }

    function initScene3() {
        const scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        scene.background = loader.load('./data/sky_images.jpeg');

        // 씬 3에 대한 설정

        return { scene, worldOctree: new Octree() };
    }

    function initScene4() {
        const scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        scene.background = loader.load('./data/sky_images.jpeg');

        // 씬 4에 대한 설정

        return { scene, worldOctree: new Octree() };
    }

    // 씬 전환 함수
    function switchScene(index) {
        if (currentScene) {
            scenes[currentSceneIndex].scene.children.forEach((child) => {
                currentScene.remove(child);
            });
        }

        if (!scenes[index]) {
            let initFunction;
            switch (index) {
                case 0:
                    initFunction = initScene0;
                    break;
                case 1:
                    initFunction = initScene1;
                    break;
                case 2:
                    initFunction = initScene2;
                    break;
                case 3:
                    initFunction = initScene3;
                    break;
                case 4:
                    initFunction = initScene4;
                    break;
            }
            scenes[index] = initFunction();
        }

        currentSceneIndex = index;
        currentScene = scenes[index].scene;

        scenes[index].scene.children.forEach((child) => {
            currentScene.add(child);
        });
    }

    // 버튼 이벤트 핸들러
    document.getElementById('buttonScene0').addEventListener('click', () => switchScene(0));
    document.getElementById('buttonScene1').addEventListener('click', () => switchScene(1));
    document.getElementById('buttonScene2').addEventListener('click', () => switchScene(2));
    document.getElementById('buttonScene3').addEventListener('click', () => switchScene(3));
    document.getElementById('buttonScene4').addEventListener('click', () => switchScene(4));

    function onWindowResize() {
        const width = divContainer.clientWidth;
        const height = divContainer.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        stats.update();

        if (currentScene) {
            renderer.render(currentScene, camera);
        }
    }

    animate();
}

window.initThreeJS = initThreeJS;
