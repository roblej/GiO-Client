import * as THREE from 'three';
import Stats from 'stats.js';
import { GLTFLoader } from '../jsm/loaders/GLTFLoader.js';
import { Octree } from '../jsm/math/Octree.js';
import { Capsule } from '../jsm/math/Capsule.js';
import { OrbitControls } from '../jsm/controls/OrbitControls.js';
import { onMouseMove } from './event.js';
import { FBXLoader } from '../jsm/loaders/FBXLoader.js';

export var game_name = '';

export function initThreeJS() {
    console.log('initThreeJS called');
    
    class App {
        constructor() {
            console.log('App constructor called');
            const divContainer = document.querySelector('#webgl-container');
            if (!divContainer) {
                console.error('webgl-container not found');
                return;
            }
            this._divContainer = divContainer;

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            divContainer.appendChild(renderer.domElement);
            this._renderer = renderer;
            this._canvas = renderer.domElement;

            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.VSMShadowMap;

            this._mixers = [];
            const scene = new THREE.Scene();
            this._scene = scene;

            const loader = new THREE.TextureLoader();
            this._scene.background = loader.load('./data/sky_images.jpeg');

            this._setupOctree();
            this._setupCamera();
            this._setupLight();
            this._setupModel();
            this._setupControls();

            const listener = new THREE.AudioListener();
            this._camera.add(listener);
            const sound = new THREE.Audio(listener);
            const audioLoader = new THREE.AudioLoader();
            let initialVolume = 0.3;

            document.getElementById('loginModal').addEventListener('click', function () {
                if (listener.context.state === 'suspended') {
                    listener.context.resume();
                }
                if (!sound.isPlaying) {
                    audioLoader.load('./data/bgm.mp3', function (buffer) {
                        sound.setBuffer(buffer);
                        sound.setLoop(true);
                        sound.setVolume(initialVolume);
                        sound.play();
                    });
                }
            });

            const volumeSlider = document.getElementById('volumeSlider');
            volumeSlider.addEventListener('input', function () {
                const volume = this.value / 100;
                initialVolume = volume;
                if (sound.isPlaying) {
                    sound.setVolume(volume);
                }
            });

            this._raycaster = new THREE.Raycaster();
            this._mouse = new THREE.Vector2();
            this._highlighted = null;
            this._originalColor = new THREE.Color();
            this._positionLabel = document.getElementById('positionLabel');
            this._divContainer.addEventListener('mousemove', (event) => onMouseMove(event, this));
            this._divContainer.addEventListener('click', this._onMouseClick.bind(this));

            window.onresize = this.resize.bind(this);
            this.resize();

            requestAnimationFrame(this.render.bind(this));
        }

        _setupOctree() {
            // Octree 설정
            this._worldOctree = new Octree();
        }

        _setupCamera() {
            const camera = new THREE.PerspectiveCamera(
                60,
                window.innerWidth / window.innerHeight,
                1,
                20000
            );
            camera.position.set(0, 100, 400);
            this._camera = camera;
        }

        _setupLight() {
            const ambientLight = new THREE.AmbientLight(0xffffff, 2);
            this._scene.add(ambientLight);

            const shadowLight = new THREE.DirectionalLight(0xffffff, 2);
            shadowLight.position.set(-1000, 1200, -2350);
            shadowLight.target.position.set(50, 0, -1000);
            const directionalLightHelper = new THREE.DirectionalLightHelper(shadowLight, 10);
            // this._scene.add(directionalLightHelper);
            
            this._scene.add(shadowLight);
            this._scene.add(shadowLight.target);

            shadowLight.castShadow = true;
            shadowLight.shadow.mapSize.width = 1024;
            shadowLight.shadow.mapSize.height = 1024;
            shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 5000;
            shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -5000;
            shadowLight.shadow.camera.near = 100;
            shadowLight.shadow.camera.far = 5000;
            shadowLight.shadow.radius = 2;
            const shadowCameraHelper = new THREE.CameraHelper(shadowLight.shadow.camera);
            // this._scene.add(shadowCameraHelper);
        }

        _setupControls() {
            this._controls = new OrbitControls(this._camera, this._divContainer);
            this._controls.target.set(0, 100, 0);
            this._controls.enablePan = false;
            this._controls.enableDamping = true;

            this._controls.minDistance = 300;
            this._controls.maxDistance = 1000;
            this._controls.minPolarAngle = Math.PI / 4;
            this._controls.maxPolarAngle = 80 * (Math.PI / 180);

            const stats = new Stats();
            this._divContainer.appendChild(stats.dom);
            this._fps = stats;

            this._pressKeys = {};

            document.addEventListener("keydown", (event) => {
                this._pressKeys[event.key.toLowerCase()] = true;
                this._processAnimation();
            });

            document.addEventListener("keyup", (event) => {
                this._pressKeys[event.key.toLowerCase()] = false;
                this._processAnimation();
            });
        }

        _setupModel() {
            const planeGeometry = new THREE.PlaneGeometry(20000, 20000);
            const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x0A630A });
            const NpcMaterial = new THREE.MeshPhongMaterial({ color: 0x878787 });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.name = "plane";
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = 0;
            this._scene.add(plane);
            plane.receiveShadow = true;

            this._worldOctree.fromGraphNode(plane);

            new GLTFLoader().load("./data/schooln.glb", (gltf) => {
                const map = gltf.scene;
                this._scene.add(map);
                map.scale.set(500, 500, 500);
                map.position.set(0, 1, -2100);
        
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
        
                this._worldOctree.fromGraphNode(map);
            });

            // 추가 모델 로딩 및 설정 코드...

            // 예시: 특정 위치에 박스 모델 추가
            const boxG = new THREE.BoxGeometry(50, 50, 50);
            const GameA = new THREE.Mesh(boxG, NpcMaterial);
            GameA.receiveShadow = true;
            GameA.castShadow = true;
            GameA.position.set(76, 0, -2300);
            GameA.name = "GameA";
            this._scene.add(GameA);
            this._worldOctree.fromGraphNode(GameA);
        }

        // 추가 메서드들 (_processAnimation, _updatePositionLabel, _onMouseClick, update, render, resize 등)

        render(time) {
            this._renderer.render(this._scene, this._camera);
            this.update(time);
            this._updatePositionLabel();
            requestAnimationFrame(this.render.bind(this));
        }

        update(time) {
            // 업데이트 로직...
        }

        resize() {
            const width = this._divContainer.clientWidth;
            const height = this._divContainer.clientHeight;

            this._camera.aspect = width / height;
            this._camera.updateProjectionMatrix();

            this._renderer.setSize(width, height);
        }
    }

    window.onload = function () {
        new App();
    };
}

// 글로벌 스코프에 initThreeJS 함수 노출
window.initThreeJS = initThreeJS;
