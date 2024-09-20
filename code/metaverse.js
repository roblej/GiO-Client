import * as THREE from 'three';
import Stats from "stats.js";
import { GLTFLoader } from "../jsm/loaders/GLTFLoader.js";
import { DRACOLoader} from "../jsm/loaders/DRACOLoader.js";
import { Octree } from "../jsm/math/Octree.js";
import { Capsule } from "../jsm/math/Capsule.js";
import { OrbitControls } from "../jsm/controls/OrbitControls.js";
import { onMouseMove } from './event.js';
import { FBXLoader } from '../jsm/loaders/FBXLoader.js';
import { getSticker } from './event.js';
// import {stickerNumber} from './event.js';
import {updateSticker} from './event.js'
import { globalId } from './login.js';
import { RGBELoader } from '../jsm/loaders/RGBELoader.js';
// THREE.GLTFLoader
export var game_name = "";

export function initThreeJS(){
    console.log("function complete")
    const loadingPage = document.getElementById('loadingPage');
    loadingPage.style.display = 'flex';
    
    class App {
        constructor() {
            console.log("construct complete")
            const divContainer = document.querySelector("#webgl-container");
            this._divContainer = divContainer;
            const renderer = new THREE.WebGLRenderer({ antialias:true});
            renderer.setPixelRatio(window.devicePixelRatio);
            divContainer.appendChild(renderer.domElement);
            this._renderer = renderer;
            this._canvas = renderer.domElement; // canvas를 클래스 변수로 저장
            renderer.physicallyCorrectLights = true
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.VSMShadowMap;
            this._hasCollidedWithTeleport = false; // 플래그 변수 초기화
            this._mixers = []; // 클래스의 생성자 또는 초기화 부분에 추가
        

            const loader = new THREE.TextureLoader();
            
            //this._scene.background = new THREE.Color(0x87CEEB); // 하늘색으로 설정
            
            // 추가된 코드
            this._originalCamera = null;
            this._npcCamera = null;
            this._isNpcCameraActive = false;
            this._scenes = [];
            this._currentSceneIndex = 0;
            this._model = null; // 플레이어 모델을 저장할 변수

            const listener = new THREE.AudioListener();
            this._listener = listener
            const sound = new THREE.Audio(listener);
            this._sound = sound
        
        // 오디오 로더 생성
            const audioLoader = new THREE.AudioLoader();
            this._audioLoader = audioLoader
        
        // 초기 볼륨 설정
            let initialVolume = 0.3;
            this._initialVolume = initialVolume
        


        
        // 볼륨 노브 컨트롤
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            initialVolume = volume; // 전역 변수로 볼륨 저장
            if (sound.isPlaying) {
                sound.setVolume(volume); // 사운드가 재생 중이면 즉시 적용
            }
        });
                
            this._setupScenes();
            this._setupCamera();
            this._setupLight();
            this._setupControls();
            this._setupEventListeners();
            this._setupOctree();

            this._loadPlayerModel(); // 플레이어 모델 로드
            this._switchScene(0);
            this._animate();
        
            this._camera.add(listener)
            this._raycaster = new THREE.Raycaster();
            this._mouse = new THREE.Vector2();
            this._highlighted = null; // 마지막으로 강조 표시된 객체
            this._originalColor = new THREE.Color(); // 원래 색상을 저장할 변수
            this._positionLabel = document.getElementById("positionLabel");  // HTML에서 레이블 요소 참조
            // this._divContainer.addEventListener('mousemove', this._onMouseMove.bind(this));
            this._divContainer.addEventListener('mousemove', (event) => onMouseMove(event, this));
                
                // 마우스 클릭 이벤트 리스너 추가
            this._divContainer.addEventListener('click', this._onMouseClick.bind(this));
        
            window.onresize = this.resize.bind(this);
            this.resize();
        
            requestAnimationFrame(this.render.bind(this));
        }
        
            _setupScenes() {
            // 5개의 빈 씬을 생성하여 배열에 추가
            for (let i = 0; i < 5; i++) {
                const scene = new THREE.Scene();
                this._scenes.push(scene);
            
            }
            this._scene = this._scenes[this._currentSceneIndex];
            }
        
            _updatePositionLabel() {
                if (this._model) {  // 모델이 로드된 경우에만 실행
                    const { x, y, z } = this._model.position;
                    this._positionLabel.innerHTML = `Model Position - X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;
                }
            }
            _setupOctree(){
                this._worldOctree = new Octree();
                // this._worldOctree = new Octree({
                //     undeferred: false, // 비동기 작업 비활성화
                //     depthMax: 10, // 최대 깊이 제한 (필요에 따라 조정)
                //     objectsThreshold: 8, // 노드당 객체 수 (필요에 따라 조정)
                //     overlapPct: 0.15 // 겹침 비율 (필요에 따라 조정)
                // });
            }
        
        _setupControls() {
                this._camera.position.set(0,120, 300)
                this._controls = new OrbitControls(this._camera,this._divContainer);
                this._controls.target.set(0, 120, 0);
                this._controls.enablePan = false;
                this._controls.enableDamping = true;
        
                this._controls.minDistance = 250;  // 카메라가 대상에 가장 가까울 수 있는 거리
                this._controls.maxDistance = 500;  // 카메라가 대상에서 가장 멀어질 수 있는 거리
        
                // this._controls.minPolarAngle = Math.PI / 4;   // 카메라가 아래로 45도 이상 내려가지 못하게 설정
                // this._controls.maxPolarAngle = Math.PI / 2;   // 카메라가 수평선 이상으로 올라가지 못하게 설정
                this._controls.minPolarAngle = Math.PI / 4;;  // 카메라가 수직에서 아래로 최소 75도 위치에서 멈춤 (15도 위)
                this._controls.maxPolarAngle = 80 * (Math.PI / 180);  // 카메라가 수직에서 아래로 최대 45도 위치에서 멈춤
                
        
        
                const stats = new Stats();
            // this._divContainer.appendChild(stats.dom);
            //fps업데이트
                this._fps = stats;
        
                this._pressKeys = {};
        
                document.addEventListener("keydown", (event) => {
                    this._pressKeys[event.key.toLowerCase()]= true;
                    this._processAnimation();
                });
        
                document.addEventListener("keyup", (event) => {
                    this._pressKeys[event.key.toLowerCase()]= false;
                    this._processAnimation();
                });
            }
            // 추가한 코드
            _setupEventListeners() {
                window.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape' || event.key === 'x') {
                        this._switchToOriginalCamera();
                    }
                });
                document.getElementById('buttonScene0').addEventListener('click', () => this._switchScene(0));
                document.getElementById('buttonScene1').addEventListener('click', () => this._switchScene(1));
                document.getElementById('buttonScene2').addEventListener('click', () => this._switchScene(2));
                document.getElementById('buttonScene3').addEventListener('click', () => this._switchScene(3));
                document.getElementById('buttonScene4').addEventListener('click', () => this._switchScene(4));
                document.getElementById('buttonNo').addEventListener('click',()=> document.getElementById('BtnMaps').style.display = 'none')
            }
            _onKeyDown(event) {
                console.log('Key down event:', event.key); // 디버그 로그
                if (event.key === 'Escape' || event.key === 'x') {
                    this._switchToOriginalCamera();
                }
            }
            _switchToOriginalCamera() {
                if (this._isNpcCameraActive) {
                    console.log("Switching to original camera"); // 디버그 로그 추가
            
                    this._camera = this._originalCamera;
                    this._controls.object = this._originalCamera;
                    this._isNpcCameraActive = false;
                }
            }
            _focusOnNPC(npc) {

                console.log("Focusing on NPC:", npc); // 디버그 로그 추가

                // 기존 카메라 저장
                const previousCamera = this._camera; // 기존 카메라를 저장합니다

                // NPC의 위치를 가져옵니다
                const npcPosition = new THREE.Vector3();
                if (npc && npc instanceof THREE.Object3D) {
                    npc.getWorldPosition(npcPosition);
                } else {
                    console.error("NPC is not an instance of THREE.Object3D or is undefined. Cannot get world position.");
                    return;
                }
                
                console.log("NPC Position:", npcPosition); // 디버그 로그 추가
                
                // 플레이어의 위치를 가져옵니다
                const modelPosition = new THREE.Vector3();
                if (this._model && this._model instanceof THREE.Object3D) {
                    this._model.getWorldPosition(modelPosition);
                } else {
                    console.error("Player is not an instance of THREE.Object3D or is undefined. Cannot get world position.");
                    return;
                }
                
                // 새로운 카메라를 생성합니다
                const newCamera = new THREE.PerspectiveCamera(
                    60,
                    window.innerWidth / window.innerHeight,
                    1,
                    20000
                );
                
                // NPC의 위치에서 y값 120을 높인 위치에 카메라를 배치합니다
                const cameraHeight = 130;
                const distance = 200; // 카메라와 NPC 사이의 거리
                
                // 카메라의 위치를 NPC의 위치에서 거리를 두고, y값을 cameraHeight로 설정합니다
                const direction = new THREE.Vector3();
                direction.subVectors(npcPosition, modelPosition).normalize(); // NPC를 바라보는 방향
                newCamera.position.copy(npcPosition).sub(direction.multiplyScalar(distance));
                newCamera.position.y = cameraHeight;
                
                // 카메라가 NPC를 바라보도록 설정합니다
                newCamera.lookAt(npcPosition.x, npcPosition.y+100, npcPosition.z);
                
                // 새로운 카메라를 사용하도록 설정합니다
                this._camera = newCamera;
                
                // 카메라와 타겟이 제대로 설정되었는지 디버그 로그 추가
                console.log("New camera position:", this._camera.position);
                console.log("Camera looking at:", npcPosition);
                
                console.log("Switched to NPC camera"); // 디버그 로그 추가
                // 카메라 전환이 완료된 후에 대화창을 띄움
                // setTimeout(() => {
                //     this._showNpcDialog(npc.userData.type);
                // }, 000); // 0.1초 지연 후 대화창 띄우기 (필요에 따라 조정 가능)
                this._showNpcDialog(npc.userData.type);

                this._onDialogClosed = () => {
                    this._camera = previousCamera; // 이전 카메라로 복원
                    this._controls.object = this._camera; // OrbitControls의 객체를 이전 카메라로 설정
                    this._controls.update(); // 업데이트 호출
                    console.log("Returned to previous camera.");
                };
            }
            
        
            _animate() {
                requestAnimationFrame(this._animate.bind(this));
                this._controls.update();
                this._renderer.render(this._scene, this._camera);
            }
            // 위까지가 추가한 코드

            _processAnimation(){
                const previousAnimationAction = this._currentAnimationAction;
        
                if(this._pressKeys["w"] || this._pressKeys["a"] || this._pressKeys["s"]
                || this._pressKeys["d"]) {
                    if(this._pressKeys["shift"] ){
                        this._currentAnimationAction = this._animationMap["run"];
                        // this._speed = 350;
                        this._maxSpeed = 700;
                        this._acceleration = 16;
                    } else{
                        this._currentAnimationAction = this._animationMap["walk"];
                        // this._speed = 80;
                        this._maxSpeed = 240;
                        this._acceleration = 9;
        
                    }
                }else{
                    this._currentAnimationAction = this._animationMap["idle"];
                    this._speed = 0;
                    this._maxSpeed = 0;
                    this._acceleration = 0;
                }
        
                if(previousAnimationAction !== this._currentAnimationAction){
                    previousAnimationAction.fadeOut(0.5);
                    this._currentAnimationAction.reset().fadeIn(0.5).play(); 
                }
            }
        _loadSceneModels(scene, index) {
                loadingPage.style.display = 'flex';
                const npcs = [];
                this._npcs = npcs
                const loader = new GLTFLoader();
                const planeGeometry = new THREE.PlaneGeometry(20000,20000);
                const planeMaterial = new THREE.MeshPhongMaterial({color: 0x808080,transparent: true, opacity: 0 });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
                plane.name = "plane";
                plane.rotation.x = -Math.PI/2;
            plane.position.y = 0;
                this._scene.add(plane);
                const rgbeLoader = new RGBELoader();
            rgbeLoader.load('./data/sky_.hdr', (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    this._scene.background = texture;  // 배경으로 HDR 설정
                    // this._scene.environment = texture; // 반사 환경 설정 (옵션)
                });
                
                plane.receiveShadow = true;
                this._worldOctree.fromGraphNode(plane);

            if (index === 0) { // 학교의 경우
                    
                    loader.load('./data/map/school.glb', (gltf) => { // 학교
                        const map = gltf.scene;
                        this._scene.add(map);
                        this.map = map;
                        map.scale.set(100, 100, 100);
                        // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                        // map.position.set(506, 0, -1810);
                        map.position.set(-1150, 0, -5);
                        // map.position.y = -40;
                        map.rotation.y = Math.PI / 4;

                        // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                        map.traverse((child) => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });

                        this._worldOctree.fromGraphNode(map);
                        loadingPage.style.display = 'none'; // 로딩 페이지 숨김
                    }, undefined, function (error) {
                        console.error(error);
                    });
                    loader.load("./data//school/rude_idle.glb", (gltf) => { // 몸통박치기!!
                        const npc = gltf.scene;
                        this._scene.add(npc);
                    
            
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'friend_crash';
                            }
                        });
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            // console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(-3265, 8, 512);
                        npc.scale.set(50, 50, 50);
                        const box = (new THREE.Box3).setFromObject(npc);
                        // npc.position.y = (box.max.y - box.min.y) /2;
                        const height = box.max.y - box.min.y;
                        const diameter = box.max.z - box.min.z
                    
                        npc._capsule = new Capsule(
                            new THREE.Vector3(0, diameter / 2, 0),
                            new THREE.Vector3(0, height - diameter / 2, 0),
                            diameter / 2
                        );
                        npc.rotation.y = Math.PI/2;
                        npcs.push(npc);
                        this._npc = npc;
                    });
                    loader.load("./data//school/schoolgirl_sit.glb", (gltf) => { // 다쳐서 넘어진 친구
                        const npc = gltf.scene;
                        this._scene.add(npc);
                
        
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'friend_hurt';
                            }
                        });
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['sit']) {
                            const idleAction = animationsMap['sit'];
                            idleAction.play();
                        }
                        npc.position.set(-2315, 15 , -2199);
                        npc.scale.set(50, 50, 50);
                        // npc.rotation.z = Math.PI / 2
                        // npc.rotation.x = Math.PI / 2
                        const box = (new THREE.Box3).setFromObject(npc);
                        // npc.position.y = (box.max.y - box.min.y) /2;
                        const height = box.max.y - box.min.y;
                        const diameter = box.max.z - box.min.z
                
                        npc._capsule = new Capsule(
                            new THREE.Vector3(0, diameter / 2, 0),
                            new THREE.Vector3(0, height - diameter / 2, 0),
                            diameter / 2
                        );
                        // npc.rotation.y = Math.PI;
                        // npcs.push(npc);
                        this._npc = npc;
                    });
                    loader.load("./data/school/teacher_idle.glb", (gltf) => { // 선생님
                        const npc = gltf.scene;
                        this._scene.add(npc);
                
        
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'teacher';
                            }
                        });
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            // console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(-152, 12, -1056);
                        npc.scale.set(50, 50, 50);
                        const box = (new THREE.Box3).setFromObject(npc);
                        // npc.position.y = (box.max.y - box.min.y) /2;
                        const height = box.max.y - box.min.y;
                        const diameter = box.max.z - box.min.z
                
                        npc._capsule = new Capsule(
                            new THREE.Vector3(0, diameter / 2, 0),
                            new THREE.Vector3(0, height - diameter / 2, 0),
                            diameter / 2
                        );
                        // npc.rotation.y = Math.PI;
                        npcs.push(npc);
                        this._npc = npc;
                    });
                    loader.load("./data/school/principal_idle.glb", (gltf) => { //교장선생님
                        const npc = gltf.scene;
                        this._scene.add(npc);
            
        
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'rector';
                            }
                        });
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(-4760, 4, -1739);
                        // npc.rotation.y = Math.PI /2;
                        // npc.scale.set(70,70,70);
                        npc.scale.set(50, 50, 50);
                        const box = (new THREE.Box3).setFromObject(npc);
                        // npc.position.y = (box.max.y - box.min.y) /2;
                        const height = box.max.y - box.min.y;
                        const diameter = box.max.z - box.min.z
            
                        npc._capsule = new Capsule(
                            new THREE.Vector3(0, diameter / 2, 0),
                            new THREE.Vector3(0, height - diameter / 2, 0),
                            diameter / 2
                        );
                        npc.rotation.y = Math.PI/4;
                        npcs.push(npc);
                        this._npc = npc;
                    });
                    loader.load("./data/school/ballgamenpc_idle.glb", (gltf) => { //공놀이하는 친구
                        const npc = gltf.scene;
                        this._scene.add(npc);
            
        
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'game_friend';
                            }
                        });
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            // console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(-6302, 1, -330);
                        npc.scale.set(50, 50, 50);
                        const box = (new THREE.Box3).setFromObject(npc);
                        // npc.position.y = (box.max.y - box.min.y) /2;
                        const height = box.max.y - box.min.y;
                        const diameter = box.max.z - box.min.z
            
                        npc._capsule = new Capsule(
                            new THREE.Vector3(0, diameter / 2, 0),
                            new THREE.Vector3(0, height - diameter / 2, 0),
                            diameter / 2
                        );
                        npc.rotation.y = Math.PI / 2;
                        npcs.push(npc);
                        this._npc = npc;
                    });          
        } else if (index === 1) { // 마을회관의 경우
                loader.load('./data//map/_townB.glb', (gltf) => { // 마을회관
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);

                map.position.set(0, 0, -0);
                // map.position.y = -40;
                map.rotation.y = Math.PI *5 / 8;

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
                });
                // loader.load("./data/school/principal_idle.glb", (gltf) => { // 할아버지
                //         const npc = gltf.scene;
                //         this._scene.add(npc);
                
        
                //         npc.traverse(child => {
                //             if (child instanceof THREE.Mesh) {
                //                 child.castShadow = true;
                //                 child.receiveShadow = true;
                //                 child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                //             }
                //             if (child.isMesh) {
                //                 child.userData.type = 'grandfather';
                //             }
                //         });
                //         // 애니메이션 믹서 설정
                //         const mixer = new THREE.AnimationMixer(npc);
                //         this._mixers.push(mixer);
                //         const animationsMap = {};
                //         gltf.animations.forEach((clip) => {
                //             // console.log(clip.name);
                //             animationsMap[clip.name] = mixer.clipAction(clip);
                //         });
                //         npc.userData.animationsMap = animationsMap;
                //         npc.userData.mixer = mixer;
                //         // 'idle' 애니메이션 재생
                //         if (animationsMap['idle']) {
                //             const idleAction = animationsMap['idle'];
                //             idleAction.play();
                //         }
                //         npc.position.set(32, 40, -650);
                //         npc.scale.set(50, 50, 50);
                //         const box = (new THREE.Box3).setFromObject(npc);
                //         // npc.position.y = (box.max.y - box.min.y) /2;
                //         const height = box.max.y - box.min.y;
                //         const diameter = box.max.z - box.min.z
                
                //         npc._capsule = new Capsule(
                //             new THREE.Vector3(0, diameter / 2, 0),
                //             new THREE.Vector3(0, height - diameter / 2, 0),
                //             diameter / 2
                //         );
                //         // npc.rotation.y = Math.PI;
                //         npcs.push(npc);
                //         this._npc = npc;
                // });
                // loader.load("./data/school/teacher_idle.glb", (gltf) => { //부녀회장
                //         const npc = gltf.scene;
                //         this._scene.add(npc);
                
        
                //         npc.traverse(child => {
                //             if (child instanceof THREE.Mesh) {
                //                 child.castShadow = true;
                //                 child.receiveShadow = true;
                //                 child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                //             }
                //             if (child.isMesh) {
                //                 child.userData.type = '부녀회장';
                //             }
                //         });
                //         // 애니메이션 믹서 설정
                //         const mixer = new THREE.AnimationMixer(npc);
                //         this._mixers.push(mixer);
                //         const animationsMap = {};
                //         gltf.animations.forEach((clip) => {
                //             // console.log(clip.name);
                //             animationsMap[clip.name] = mixer.clipAction(clip);
                //         });
                //         npc.userData.animationsMap = animationsMap;
                //         npc.userData.mixer = mixer;
                //         // 'idle' 애니메이션 재생
                //         if (animationsMap['idle']) {
                //             const idleAction = animationsMap['idle'];
                //             idleAction.play();
                //         }
                //         npc.position.set(216, 0, -517);
                //         npc.scale.set(50, 50, 50);
                //         const box = (new THREE.Box3).setFromObject(npc);
                //         // npc.position.y = (box.max.y - box.min.y) /2;
                //         const height = box.max.y - box.min.y;
                //         const diameter = box.max.z - box.min.z
                
                //         npc._capsule = new Capsule(
                //             new THREE.Vector3(0, diameter / 2, 0),
                //             new THREE.Vector3(0, height - diameter / 2, 0),
                //             diameter / 2
                //         );
                //         npc.rotation.y = Math.PI;
                //         npcs.push(npc);
                //         this._npc = npc;
                // });
                // loader.load("./data/school/teacher_idle.glb", (gltf) => { //할머니
                //         const npc = gltf.scene;
                //         this._scene.add(npc);
                
        
                //         npc.traverse(child => {
                //             if (child instanceof THREE.Mesh) {
                //                 child.castShadow = true;
                //                 child.receiveShadow = true;
                //                 child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                //             }
                //             if (child.isMesh) {
                //                 child.userData.type = '할머니';
                //             }
                //         });
                //         // 애니메이션 믹서 설정
                //         const mixer = new THREE.AnimationMixer(npc);
                //         this._mixers.push(mixer);
                //         const animationsMap = {};
                //         gltf.animations.forEach((clip) => {
                //             // console.log(clip.name);
                //             animationsMap[clip.name] = mixer.clipAction(clip);
                //         });
                //         npc.userData.animationsMap = animationsMap;
                //         npc.userData.mixer = mixer;
                //         // 'idle' 애니메이션 재생
                //         if (animationsMap['idle']) {
                //             const idleAction = animationsMap['idle'];
                //             idleAction.play();
                //         }
                //         // npc.position.set(-871, 0, -578);
                //         npc.scale.set(50, 50, 50);
                //         const box = (new THREE.Box3).setFromObject(npc);
                //         // npc.position.y = (box.max.y - box.min.y) /2;
                //         const height = box.max.y - box.min.y;
                //         const diameter = box.max.z - box.min.z
                
                //         npc._capsule = new Capsule(
                //             new THREE.Vector3(0, diameter / 2, 0),
                //             new THREE.Vector3(0, height - diameter / 2, 0),
                //             diameter / 2
                //         );
                //         // npc.rotation.y = Math.PI;
                //         npcs.push(npc);
                //         this._npc = npc;
                // });
                // loader.load("./data/gPlayer.glb", (gltf) => { //종이접기하는 손녀
                //         const npc = gltf.scene;
                //         this._scene.add(npc);
                
        
                //         npc.traverse(child => {
                //             if (child instanceof THREE.Mesh) {
                //                 child.castShadow = true;
                //                 child.receiveShadow = true;
                //                 child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                //             }
                //             if (child.isMesh) {
                //                 child.userData.type = 'grandmother_child';
                //             }
                //         });
                //         // 애니메이션 믹서 설정
                //         const mixer = new THREE.AnimationMixer(npc);
                //         this._mixers.push(mixer);
                //         const animationsMap = {};
                //         gltf.animations.forEach((clip) => {
                //             // console.log(clip.name);
                //             animationsMap[clip.name] = mixer.clipAction(clip);
                //         });
                //         npc.userData.animationsMap = animationsMap;
                //         npc.userData.mixer = mixer;
                //         // 'idle' 애니메이션 재생
                //         if (animationsMap['idle']) {
                //             const idleAction = animationsMap['idle'];
                //             idleAction.play();
                //         }
                //         npc.position.set(-625, 0, -350);
                //         npc.scale.set(50, 50, 50);
                //         const box = (new THREE.Box3).setFromObject(npc);
                //         // npc.position.y = (box.max.y - box.min.y) /2;
                //         const height = box.max.y - box.min.y;
                //         const diameter = box.max.z - box.min.z
                
                //         npc._capsule = new Capsule(
                //             new THREE.Vector3(0, diameter / 2, 0),
                //             new THREE.Vector3(0, height - diameter / 2, 0),
                //             diameter / 2
                //         );
                //         // npc.rotation.y = Math.PI;
                //         npcs.push(npc);
                //         this._npc = npc;
                //     });
        } else if (index === 2) { // 도서관의 경우
            loader.load('./data/map/library_.glb', (gltf) => { //도서관
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);
                // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                // map.position.set(-1111, 0, -2561);
                // map.position.y = -40;
                map.rotation.y = Math.PI / 4;

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
                loader.load("./data/school/teacher_idle.glb", (gltf) => { //할머니
                        const npc = gltf.scene;
                        this._scene.add(npc);
                
        
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = '할머니';
                            }
                        });
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            // console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(544, 0, -3768);
                        npc.scale.set(50, 50, 50);
                        const box = (new THREE.Box3).setFromObject(npc);
                        // npc.position.y = (box.max.y - box.min.y) /2;
                        const height = box.max.y - box.min.y;
                        const diameter = box.max.z - box.min.z
                
                        npc._capsule = new Capsule(
                            new THREE.Vector3(0, diameter / 2, 0),
                            new THREE.Vector3(0, height - diameter / 2, 0),
                            diameter / 2
                        );
                        // npc.rotation.y = Math.PI;
                        npcs.push(npc);
                        this._npc = npc;
                });
        } else if (index === 3) {
            loader.load('./data/map/mart.glb', (gltf) => {
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);
                // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                // map.position.set(-1111, 0, -2561);
                // map.position.y = -40;
                map.rotation.y = Math.PI / 4;

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
        } else if (index === 4) {
            loader.load('./data/map/park.glb', (gltf) => {
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);
                // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                // map.position.set(-1111, 0, -2561);
                // map.position.y = -40;
                map.rotation.y = Math.PI / 4;

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
        }
    }

        _loadPlayerModel() {
        // 플레이어 모델 로드
            const loader = new GLTFLoader();


        loader.load('./data/gPlayer.glb', (gltf) => {
            const model = gltf.scene;
            model.traverse(child => {
                                if (child instanceof THREE.Mesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });
            
                    
                const animationClips = gltf.animations;
                const mixer = new THREE.AnimationMixer(model);
                this._mixers.push(mixer);
                const animationsMap = {};
                animationClips.forEach(clip => {
                    const name = clip.name;
                    animationsMap[name] = mixer.clipAction(clip);
                });
                
                this._mixer = mixer;
                this._animationMap = animationsMap;
                this._currentAnimationAction = this._animationMap["idle"];
                this._currentAnimationAction.play();
                
                const box = new THREE.Box3().setFromObject(model);
                const height = box.max.y - box.min.y;
                const diameter = box.max.z - box.min.z;
                
                model._capsule = new Capsule(
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, height, 0),
                    (diameter/2)*3
                );
                
                model.scale.set(50, 50, 50);
                model.position.set(-0.5,10,-9)
                model.rotation.y = Math.PI;
                    const axisHelper = new THREE.AxesHelper(1000);
                    // this._scene.add(axisHelper)
                    const boxHelper = new THREE.BoxHelper(model);
                    // this._scene.add(boxHelper);
                    this._boxHelper = boxHelper;
                    this._model = model;
        
                    this._scene.add(this._model);
        });
        
            loader.load("./data/maru_anim_noneT.glb",(gltf) =>{
            const support = gltf.scene;
            this._scene.add(support);
            
        
            support.traverse(child =>{
                if(child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.isMesh) {
                    child.userData.type = 'maru';
                }
            });
            // 애니메이션 믹서 설정
            const mixer = new THREE.AnimationMixer(support);
            this._mixers.push(mixer);
            const animationsMap = {};
            gltf.animations.forEach((clip) => {
                console.log(clip.name)
                animationsMap[clip.name] = mixer.clipAction(clip);
            });
            support.userData.animationsMap = animationsMap;
            support.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['Run']) {
                const idleAction = animationsMap['Run'];
                idleAction.play();
            }
            // npc.position.set(1000,0,-230);
            support.scale.set(50,50,50);
            support.position.set(50,0,0)
            // const box = (new THREE.Box3).setFromObject(support);
            // npc.position.y = (box.max.y - box.min.y) /2;
            // const height = box.max.y - box.min.y;
            // const diameter = box.max.z - box.min.z
            
            // npc._capsule = new Capsule(
            //     new THREE.Vector3(0, diameter/2, 0),
            //     new THREE.Vector3(0, height - diameter/2, 0),
            //     diameter/2
            // );
            support.rotation.y = Math.PI;
            this._support = support;
            this._worldOctree.fromGraphNode(support);
        });
        }

        _switchScene(index) {
            
            if (this._listener.context.state === 'suspended') {
                this._listener.context.resume();
            }

            // sound가 이미 재생 중인지 확인
            if (!this._sound.isPlaying) {
                this._audioLoader.load('./data/Playtime_LOOP.WAV', (buffer) => {
                this._sound.setBuffer(buffer);
                this._sound.setLoop(true);
                this._sound.setVolume(this._initialVolume); // 초기 볼륨 적용
                this._sound.play();
        });
            }
            // loadingPage.style.display = 'block'; // 로딩 페이지 숨김
            if (index >= 0 && index < this._scenes.length) {
                // 이전 씬에서 플레이어 모델 제거
                if (this._model) {
                    this._scene.remove(this._model,this._support);
                    
                }

            // Octree를 초기화
            this._setupOctree();

            // 씬 전환
            this._currentSceneIndex = index;
            this._scene = this._scenes[index];
            console.log(`Scene ${index + 1}로 전환됨`);

            // 처음으로 해당 씬에 접근할 때만 모델 로드
            if (!this._scene.modelsLoaded) {
                this._loadSceneModels(this._scene, index);
                this._scene.modelsLoaded = true;
            }
            // this._loadSceneModels(this._scene, index);
            // this._scene.modelsLoaded = true;
            
            // 새로운 씬에 플레이어 모델 추가
            if (this._model) {
                let startPosition;
                switch (index) {
                    case 0:
                        startPosition = new THREE.Vector3(-1214, 4, 197); // 첫 번째 씬 위치
                        this._setupOctree();
                        break;
                    case 1:
                        startPosition = new THREE.Vector3(100, 0, 100); // 두 번째 씬 위치
                        console.log("case1 전환")
                        this._setupOctree();
                        break;
                    case 2:
                        startPosition = new THREE.Vector3(-50, 10, -50); // 세 번째 씬 위치
                        break;
                    default:
                        startPosition = new THREE.Vector3(0, 10, 0); // 기본 위치
                        break;
                }

                // 플레이어 위치 초기화
                this._model.position.copy(startPosition);

                // 추가적인 상태 확인을 위한 콘솔 로그
            console.log("플레이어 위치 설정:", this._model.position);

            // 물리 엔진 상태 초기화가 필요한 경우 여기서 추가
            if (this._model._capsule) {
                this._model._capsule.start.copy(startPosition);
                this._model._capsule.end.copy(startPosition).y += this._model._capsule.radius * 2;
                console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                }
                
                this._scene.add(this._model,this._support);
                
                }
                document.getElementById("BtnMaps").style.display = "none";
    }
        }        
        _onMouseClick(event) {

                console.log('Mouse click event'); // 디버그 로그

                // 마우스 위치를 정규화된 장치 좌표로 변환
                this._mouse.x = ( event.clientX / this._divContainer.clientWidth ) * 2 - 1;
                this._mouse.y = - ( event.clientY / this._divContainer.clientHeight ) * 2 + 1;
                const maxDistance = 50000; // 예를 들어 50 유닛
                // Raycaster 업데이트
                this._raycaster.setFromCamera(this._mouse, this._camera);
                // this._raycaster.ray.origin.copy(this._model.position); // 플레이어 위치로 광선 시작점 설정
                // this._raycaster.near = 0;
                // this._raycaster.far = maxDistance;
            
                // 클릭된 객체 확인
                const intersects = this._raycaster.intersectObjects(this._scene.children, true);
                if (intersects.length > 0) {
                    for (let i = 0; i < intersects.length; i++) {
                        const selectedObject = intersects[0].object; // 첫 번째 교차된 객체만 사용

                        console.log('Clicked object:', selectedObject); // 클릭된 객체 정보 로그
                        if (selectedObject.name === 'teleport') {
                            console.log("teleport");
                        }

            
                        if (selectedObject.userData && selectedObject.userData.isNPC) {
                            console.log('NPC clicked, focusing on NPC'); // NPC 클릭 여부 확인하는 로그
                            this._focusOnNPC(selectedObject);
                            // this._showNpcDialog(selectedObject);
                            
                            break; // 첫 번째 NPC 객체만 처리하고 루프 종료
                        }
                    }
                }
        }
        
        _showNpcDialog(npcType) {
            console.log(`Showing dialog for NPC type: ${npcType}`); // 디버그 로그 추가'

            var npc_name = document.getElementsByClassName("npc_name");
            var casher = document.getElementById("thiscasher");
            var span = document.getElementsByClassName("close")[1];
            var dialogText = document.querySelector("#thiscasher .Speech1 p");
            var clicktext = document.getElementsByClassName("Speech1")
            var option1 = document.getElementById("select1");
            var option2 = document.getElementById("select2");
            var option3 = document.getElementById("select3");
            var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
            var button = document.querySelector("#buttonGroup button")
            var recordButton = document.getElementById('recordButton')
            var count = 0;
            
            // 이벤트 리스너를 설정하는 함수
            function setClickEvent() {
                for (var i = 0; i < clicktext.length; i++) {
                    clicktext[i].onclick = function () {
                        console.log(count)
                        if (count == 0) {
                            buttonGroup.style.display = "flex"; // 버튼 그룹 표시
                            count++;
                            // if (npcType != 'game_friend' && npcType != '할머니' && document.getElementsByClassName('GameBtn').length === 0){
                            if (npcType = 'game_friend' || npcType == '할머니' || document.getElementsByClassName('GameBtn').length === 0) {
                                    
                                } else recordButton.onclick();
                        // }

                            // 클릭 이벤트 비활성화
                            // this.onclick = null; // 현재 클릭된 요소의 onclick 이벤트 비활성화
                        } else if (count == 1) {
                            buttonGroup.style.display = "none";
                            count++;

                            // 다시 클릭 이벤트 활성화
                            // setClickEvent(); // 이벤트 리스너를 재설정
                        } else {
                            casher.style.display = "none";
                        }
                    };
                }
            }

        // 처음에 클릭 이벤트를 설정
            setClickEvent();

            document.body.onkeydown = function (event) {
                if (event.code === "Space") { // 스페이스바 눌렀을 때
                    // clicktext.onclick(); // clicktext의 onclick 이벤트 호출
                    buttonGroup.style.display = "flex"; // 버튼 그룹 표시

                }
            };

            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function () {
                casher.style.display = "none";
                count = 0;
                resetModal();
            };

            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function (event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    count = 0;
                    resetModal();
                }
            };

            for (var i = 0; i < npc_name.length; i++) {
                npc_name[i].innerHTML = npcType;
            }
            speechText.onclick = function () {
                // speechText.style.display = "none";
                buttonGroup.style.display = "block";
            }

            if (npcType === 'casher') {
                
                casher.style.display = "block";
        
                function resetModal() {
                    speechText.style.display = "block";
                    buttonGroup.style.display = "none";
                }
        
                resetModal();
        
                span.onclick = function () {
                    casher.style.display = "none";
                    resetModal();
                }
        
        
                document.getElementById("select1").onclick = function () {
                    console.log("선택지 1 선택됨");
                    casher.style.display = "none";
                    resetModal();
                }
        
                document.getElementById("select2").onclick = function () {
                    console.log("선택지 2 선택됨");
                    casher.style.display = "none";
                    resetModal();
                }
        
                document.getElementById("select3").onclick = function () {
                    console.log("선택지 3 선택됨");
                    casher.style.display = "none";
                    resetModal();
                }
        
                window.onclick = function (event) {
                    if (event.target == casher) {
                        casher.style.display = "none";
                        resetModal();
                    }
                }
            } else if (npcType === 'teacher') {

        
                dialogText.innerHTML = "안녕? 새로 온 학생이니?";
        
                function resetModal() {
                    option1.innerHTML = "네, 맞아요. 안녕하세요?";
                    option2.innerHTML = "(무시하고 갈 길을 간다.)";
                    option3.innerHTML = "누구세요?";
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                }

        
                resetModal();
        
                casher.style.display = "block";
        
                dialogText.onclick = function () {
                    this.style.display = "none";
                    buttonGroup.style.display = "block";
                };
        
                span.onclick = function () {
                    casher.style.display = "none";
                    resetModal();
                };
        

                option1.onclick = function () {
                    console.log("첫 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "안녕? 나는 선생님이란다. 학교에 온걸 환영해!";
                    dialogText.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                        this._onDialogClosed();
                    }.bind(this);
                };
        
                option2.onclick = function () {
                    console.log("두 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "어머..낯을가리는 아이인가?";
                    dialogText.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                        this._onDialogClosed();
                    }.bind(this);
                };
        
                option3.onclick = function () {
                    console.log("세 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "나는 선생님이란다.";
                    dialogText.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                        this._onDialogClosed();
                    }.bind(this);
                };
        
                window.onclick = function (event) {
                    if (event.target == casher) {
                        casher.style.display = "none";
                        resetModal();
                    }
                }
            } else if (npcType == 'game_friend') {
                game_name = "GameB"
                var modal = document.getElementById("myModal");
                var span = document.getElementsByClassName("close")[0];
                modal.style.display = "block";
                var gameAButton = document.getElementById("Game");
                gameAButton.setAttribute('data-path', 'BallMiniGame/index.html'); // data-path 속성 설정
    
                // 닫기 버튼 클릭 시 모달 닫기
                span.onclick = function () {
                    modal.style.display = "none";
                }
    
                // 선택지 1 클릭 시 동작
                document.getElementById("option1").onclick = function () {
                    console.log("선택지 1 선택됨");
                    modal.style.display = "none";
                }
    
                // 선택지 2 클릭 시 동작
                document.getElementById("option2").onclick = function () {
                    console.log("선택지 2 선택됨");
                    modal.style.display = "none";
                }
    
                // 모달 창 바깥 영역 클릭 시 모달 닫기
                window.onclick = function (event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                    }
                }
    
                // break; // 첫 번째 교차 객체만 처리하고 루프 종료
            } else if (npcType == 'friend_crash') {
    
                // 대화 내용 업데이트
                dialogText.innerHTML = "운동장을 걷다가 어깨를 부딪쳤다. 사과를 안하고 지나갔다.";
    
                // 각 선택지 업데이트
                function resetModal() {
                    option1.innerHTML = "야! 너 왜 부딪혔는데 사과 안해?";
                    option2.innerHTML = "(기분 나쁜데... 그래도 이번엔 그냥 지나가자.)";
                    option3.innerHTML = "(쫓아가서 어깨를 다시 부딪힌다.)";
                    dialogText.style.display = "block";  // 텍스트를 보이게 함
                    buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                }
    
                // 초기 상태로 모달 재설정
                resetModal();
    
                casher.style.display = "block";
    
                option1.onclick = function () {
                    console.log("첫 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "어? 아...미안";
                };
    
                option2.onclick = function () {
                    console.log("두 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";
                };
    
                option3.onclick = function () {
                    console.log("세 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "아야! 너 뭐야?";
                };

            } else if (npcType == 'rector') {
    
                // 대화 내용 업데이트
                dialogText.innerHTML = "교장선생님이다.";
    
                // 각 선택지 업데이트
                function resetModal() {
                    option1.innerHTML = "교장선생님은 왜 머리가 없으세요?";
                    option2.innerHTML = "안녕하세요!";
                    option3.innerHTML = "(무시하고 지나간다)";
                    dialogText.style.display = "block";  // 텍스트를 보이게 함
                    buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                }
    
                // 초기 상태로 모달 재설정
                resetModal();
    
                casher.style.display = "block";
    
                option1.onclick = function () {
                    console.log("첫 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "머리가 없는게 아니다. 내가 나아갈 뿐";

                };
    
                option2.onclick = function () {
                    console.log("두 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "안녕, 오늘도 좋은 하루 보내렴";
                    clicktext.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    };
                };
    
                option3.onclick = function () {
                    console.log("세 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";
                    clicktext.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    };
                };

            } else if (npcType == 'npc3') {
    
                // 대화 내용 업데이트
                dialogText.innerHTML = "안녕? 나는 npc3야.";
    
                // 각 선택지 업데이트
                function resetModal() {
                    option1.innerHTML = "안녕하세요";
                    option2.innerHTML = "와 AI다!?";
                    option3.innerHTML = "집에가고싶어요";
                    dialogText.style.display = "block";  // 텍스트를 보이게 함
                    buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                }
    
                // 초기 상태로 모달 재설정
                resetModal();
    
                casher.style.display = "block";
    
                // 각 선택지 클릭 시 동작
                option1.onclick = function () {
                    console.log("첫 번째 선택지 선택됨");
                    casher.style.display = "none";
                    resetModal();
                };
    
                option2.onclick = function () {
                    console.log("두 번째 선택지 선택됨");
                    casher.style.display = "none";
                    resetModal();
                };
    
                option3.onclick = function () {
                    console.log("세 번째 선택지 선택됨");
                    casher.style.display = "none";
                    resetModal();
                };
    
            } else if (npcType == 'friend_hurt') {
    
                // 대화 내용 업데이트
                dialogText.innerHTML = "넘어져서 주져 앉아있다. 무릎에 상처가 났다..";
    
                // 각 선택지 업데이트
                function resetModal() {
                    dialogText.innerHTML = "넘어져서 주져 앉아있다. 무릎에 상처가 났다..";
                    option1.innerHTML = "어, 피가 난다!";
                    option2.innerHTML = "괜찮아? 아프겠다. 양호실까지 부축해줄까?";
                    option3.innerHTML = "(무시하고 지나간다.)";
                    dialogText.style.display = "block";  // 텍스트를 보이게 함
                    buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                }
    
                // 초기 상태로 모달 재설정
                resetModal();
    
                casher.style.display = "block";
    
                // 각 선택지 클릭 시 동작
                option1.onclick = function () {
                    console.log("첫 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "뭐야? 구경났어?";
                };
    
                option2.onclick = function () {
                    console.log("두 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "괜찮아. 혼자 양호실에 갈게. 걱정해줘서 고마워.";
                };
    
                option3.onclick = function () {
                    console.log("세 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = ".....";
                };

            } else if (npcType == 'grandfather') {
    
                // 대화 내용 업데이트
                dialogText.innerHTML = "(귀가 잘 안들리는 할아버지이시다.)";
    
                // 각 선택지 업데이트
                function resetModal() {
                    option1.innerHTML = "안녕하세요.";
                    option2.innerHTML = "";
                    option3.innerHTML = "";
                    option2.style.display = 'none';
                    option3.style.display = 'none';
                    dialogText.style.display = "block";  // 텍스트를 보이게 함
                    buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                }
    
                // 초기 상태로 모달 재설정
                resetModal();
    
                casher.style.display = "block";
                var scene1 = 0
                // 각 선택지 클릭 시 동작
                option1.onclick = function () {
                    if (scene1 == 0) {
                        console.log("첫 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "....응? 뭐라고?";
                        resetModal2();
                        scene1++;
                    } else {
                        console.log("첫 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "어 그래.. 안녕하구나";
                    }
                };

                function resetModal2() {
                    option1.innerHTML = "(큰목소리로) 안녕하세요!!.";
                    option2.innerHTML = "(같은 목소리로) 안녕하세요.";
                    option3.innerHTML = "(큰목소리로) 안녕이라고!";
                    option2.style.display = 'block';
                    option3.style.display = 'block';
                    dialogText.style.display = "block";  // 텍스트를 보이게 함
                    buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                    count = 0;
                }
                option2.onclick = function () {
                    console.log("두 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "잘 안들린단다 얘야";
                };
    
                option3.onclick = function () {
                    console.log("세 번째 선택지 선택됨");
                    dialogText.style.display = "block";
                    buttonGroup.style.display = "none";
                    dialogText.innerHTML = "어린노무자식이 싸가지없게!";
                };
            } else if (npcType === "할머니") {
                game_name = "GameA"
                var modal = document.getElementById("myModal");
                var span = document.getElementsByClassName("close")[0];
                modal.style.display = "block";
                var gameAButton = document.getElementById("Game");
                gameAButton.setAttribute('data-path', 'Library_12/index.html'); // data-path 속성 설정
    
                // 닫기 버튼 클릭 시 모달 닫기
                span.onclick = function () {
                    modal.style.display = "none";
                }
    
                // 선택지 1 클릭 시 동작
                document.getElementById("option1").onclick = function () {
                    console.log("선택지 1 선택됨");
                    modal.style.display = "none";
                }
    
                // 선택지 2 클릭 시 동작
                document.getElementById("option2").onclick = function () {
                    console.log("선택지 2 선택됨");
                    modal.style.display = "none";
                }
    
                // 모달 창 바깥 영역 클릭 시 모달 닫기
                window.onclick = function (event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                    }
                }
    
                // break; // 첫 번째 교차 객체만 처리하고 루프 종료
            }
    
            if (npcType === "tp") {
                // 캐릭터의 새 위치 설정
                this._model.position.x = 2328;
                this._model.position.y = 10;
                this._model.position.z = 247;
    
                // 캐릭터의 현재 y 위치를 유지하면서 캡슐 위치 업데이트
                const heightOffset = (this._model._capsule.end.y - this._model._capsule.start.y) / 2;
                this._model._capsule.start.set(this._model.position.x, this._model.position.y, this._model.position.z);
                this._model._capsule.end.set(this._model.position.x, this._model.position.y + heightOffset * 2, this._model.position.z);
            }
        }
            // 플레이어 캐릭터의 y축 아래로 Raycast를 발사하여 teleport 오브젝트와의 충돌을 감지하는 함수

            _setupCamera(){
                const camera = new THREE.PerspectiveCamera(
                    60,
                    window.innerWidth / window.innerHeight,
                    1,
                    20000
                );
                camera.position.set(0, 100, 400);
                this._camera = camera;
                this._originalCamera = camera; // 추가된 코드: 원래 카메라 저장
            }
        
            _addPointLight(x, y, z, helperColor) {
                const color = 0xffffff;
                const intensity = 900000;
            
                const pointLight = new THREE.PointLight(color, intensity, 2000);
                pointLight.position.set(x, y, z);
            
                this._scene.add(pointLight);
            
                const pointLightHelper = new THREE.PointLightHelper(pointLight, 10, helperColor);
                this._scene.add(pointLightHelper);
            }
        
        _setupLight() {
            const ambientLight = new THREE.AmbientLight(0xffffff, 2);

            // 모든 씬에 대해 반복문을 사용하여 조명을 추가
            this._scenes.forEach((scene) => {
                scene.add(ambientLight.clone());
            });

            const shadowLight = new THREE.DirectionalLight(0xffffff, 2);
            shadowLight.position.set(-1000, 1200, -2350);
            shadowLight.target.position.set(50, 0, -1000);
            shadowLight.castShadow = true;
            shadowLight.shadow.mapSize.width = 1024;
            shadowLight.shadow.mapSize.height = 1024;
            shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 5000;
            shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -5000;
            shadowLight.shadow.camera.near = 100;
            shadowLight.shadow.camera.far = 5000;
            shadowLight.shadow.radius = 2;

            // 모든 씬에 대해 반복문을 사용하여 방향성 조명을 추가
            this._scenes.forEach((scene) => {
                scene.add(shadowLight.clone());
            });
        }
            
            _previousDirectionOffset = 0;
        
            _directionOffset(){
                const pressedKeys = this._pressKeys;
                let directionoffset = 0
                if(pressedKeys['w']){
                    if(pressedKeys['a']){
                        directionoffset = Math.PI / 4
                    }else if (pressedKeys['d']){
                        directionoffset = - Math.PI / 4
                    }
                } else if (pressedKeys['s']){
                    if(pressedKeys['a']){
                        directionoffset = Math.PI / 4 + Math.PI /2
                    }else if (pressedKeys['d']){
                        directionoffset = - Math.PI / 4 - Math.PI /2
                    } else {
                        directionoffset = Math.PI
                    }
            } else if (pressedKeys['a']){
                directionoffset = Math.PI /2
            } else if (pressedKeys['d']){
                directionoffset = - Math.PI /2
            } else {
                directionoffset = this._previousDirectionOffset;
            }
            this._previousDirectionOffset = directionoffset;
        
                return directionoffset;
        }
            
        
            _speed = 0;
            _maxSpeed = 0;
            _acceleration = 0;
            _bOnTheGround = true;
            _fallingAcceleration = 0;
            _fallingSpeed = 0;
        
        update(time) {
            time *= 0.001;
            if (!this._previousTime) this._previousTime = time;

            this._controls.update();
            
            if (this._boxHelper) {
                this._boxHelper.update();
            }

            this._fps.update();

            if (this._mixer) {
                const deltaTime = time - this._previousTime;
                this._mixers.forEach(mixer => mixer.update(deltaTime));

                // 안전 장치 추가: 필요한 객체들이 있는지 확인
                if (!this._worldOctree || !this._model || !this._model._capsule) {
                    console.error('필요한 객체가 초기화되지 않았습니다.');
                    return;
                }

                // Octree 캡슐 교차 확인
                const result1 = this._worldOctree.capsuleIntersect(this._model._capsule);
                if (result1) {
                    this._model._capsule.translate(result1.normal.multiplyScalar(result1.depth));
                    this._bOnTheGround = true;
                } else {
                    this._bOnTheGround = false;
                }
        // 플레이어 y축 아래로 Raycast 쏘기
                const playerPosition = this._model.position.clone();
            const raycaster = new THREE.Raycaster();
            const downDirection = new THREE.Vector3(0, -1, 0); // y축 아래 방향
            raycaster.set(playerPosition, downDirection);

            const intersects = raycaster.intersectObjects(this._scene.children, true);
            let collidedWithTeleport = false;

            for (let i = 0; i < intersects.length; i++) {
                const intersectedObject = intersects[i].object;
                if (intersectedObject.name === 'teleport') {
                    collidedWithTeleport = true;
                    break; // 'teleport' 객체를 찾았으므로 반복 종료
                }
            }
                // 충돌 상태에 따른 콘솔 로그 처리
                if (collidedWithTeleport && !this._hasCollidedWithTeleport) {
                    console.log('Teleport 오브젝트가 플레이어 아래에 감지되었습니다.');
                    document.getElementById("BtnMaps").style.display = "flex";
                    this._hasCollidedWithTeleport = true; // 충돌 상태를 true로 설정
                } else if (!collidedWithTeleport) {
                    this._hasCollidedWithTeleport = false; // 충돌 상태를 false로 재설정
                }

                // 플레이어 회전 처리
                const angleCameraDirectionAxisY = Math.atan2(
                    (this._camera.position.x - this._model.position.x),
                    (this._camera.position.z - this._model.position.z)
                ) + Math.PI;

                const rotateQuarternion = new THREE.Quaternion();
                rotateQuarternion.setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    angleCameraDirectionAxisY + this._directionOffset()
                );

                this._model.quaternion.rotateTowards(rotateQuarternion, THREE.MathUtils.degToRad(5));

                // 플레이어 이동 방향 처리
                const walkDirection = new THREE.Vector3();
                this._camera.getWorldDirection(walkDirection);

                walkDirection.y = this._bOnTheGround ? 0 : -1;
                walkDirection.normalize();

                walkDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this._directionOffset());

                if (this._speed < this._maxSpeed) this._speed += this._acceleration;
                else this._speed -= this._acceleration * 2;

                if (!this._bOnTheGround) {
                    this._fallingAcceleration += 1;
                    this._fallingSpeed += Math.pow(this._fallingAcceleration, 2);
                } else {
                    this._fallingAcceleration = 0;
                    this._fallingSpeed = 0;
                }

                const velocity = new THREE.Vector3(
                    walkDirection.x * this._speed,
                    walkDirection.y * this._fallingSpeed,
                    walkDirection.z * this._speed,
                );

                const deltaPosition = velocity.clone().multiplyScalar(deltaTime);

                const newPosition = this._model._capsule.end.clone().add(deltaPosition); // 캡슐 끝 부분의 위치를 기준으로 새로운 위치 계산
                if (newPosition.y < 0) {
                    deltaPosition.y = 0 - this._model._capsule.end.y; // y 좌표를 0으로 맞추기 위한 deltaPosition 조정
                    this._bOnTheGround = true; // 지면에 닿았다고 설정
                }
                
                this._model._capsule.translate(deltaPosition);

                const result = this._worldOctree.capsuleIntersect(this._model._capsule);
                if (result) {
                    this._model._capsule.translate(result.normal.multiplyScalar(result.depth));
                    this._bOnTheGround = true;
                } else {
                    this._bOnTheGround = false;
                }

                // 카메라와 모델의 위치 조정
                const previousPosition = this._model.position.clone();
                const capsuleHeight = this._model._capsule.end.y - this._model._capsule.start.y + this._model._capsule.radius * 2;
                this._model.position.set(
                    this._model._capsule.start.x,
                    this._model._capsule.start.y - this._model._capsule.radius + capsuleHeight / 2,
                    this._model._capsule.start.z
                );

                this._camera.position.x -= previousPosition.x - this._model.position.x;
                this._camera.position.z -= previousPosition.z - this._model.position.z;

                this._controls.target.set(
                    this._model.position.x,
                    this._model.position.y + 80,
                    this._model.position.z,
                );

                if (this._support) {
                    this._support.lookAt(this._model.position);
                    const distance = this._support.position.distanceTo(this._model.position);
                    if (distance > 150) {
                        const step = 3.5;
                        const direction = new THREE.Vector3().subVectors(this._model.position, this._support.position).normalize();
                        this._support.position.addScaledVector(direction, step);
                    }
                }

                // NPC와의 상호작용
                const minDistance = 200; // NPC들이 바라볼 최소 거리 설정
                this._npcs.forEach((npc) => {
                    const distance = npc.position.distanceTo(this._model.position);
                    if (distance < minDistance) {
                        // 목표 방향 설정
                        const targetPosition = this._model.position.clone();
                        targetPosition.y = npc.position.y;  // Y축 회전만 고려 (필요에 따라 조정 가능)
                        
                        // NPC의 현재 회전 상태 저장
                        const currentQuaternion = npc.quaternion.clone();

                        // NPC를 목표 위치를 바라보게 하고 그 회전을 저장
                        npc.lookAt(targetPosition);
                        const targetQuaternion = npc.quaternion.clone();
                        
                        // 원래 회전으로 되돌림
                        npc.quaternion.copy(currentQuaternion);

                        // 선형 보간을 사용하여 부드럽게 회전
                        const slerpFactor = 0.1;  // 회전 속도를 조절하는 값 (0~1 사이 값, 값이 작을수록 천천히 회전)
                        npc.quaternion.slerp(targetQuaternion, slerpFactor);

                        // Z축과 X축 회전을 고정하여 뒤로 눕는 것을 방지
                        npc.rotation.z = 0;
                        npc.rotation.x = 0;
                    }
                });

                // 플레이어와 NPC 간의 사운드 이펙트 또는 추가 이벤트 처리
                // 예: if (distance < 특정 값) { 사운드 재생 코드 추가 }

                // const vector = new THREE.Vector3();
                // this._support.getWorldPosition(vector);
                // vector.project(this._camera);

                // const x = (vector.x * .5 + .5) * this._canvas.clientWidth;
                // const y = (vector.y * -.5 + .5) * this._canvas.clientHeight;

                // const speechBubble = document.getElementById('speechBubble');
                // speechBubble.style.transform = `translate(-50%, -600%) translate(${x}px,${y}px)`;
                // speechBubble.style.display = 'block';
                speechBubble.style.display = 'none';
            }
            this._previousTime = time;
        }

        
        
            render(time) {
                this._renderer.render(this._scene, this._camera);
                this.update(time);
                this._updatePositionLabel();  // 좌표 업데이트 함수 호출
                requestAnimationFrame(this.render.bind(this));
            }
        
            resize() {
                const width = this._divContainer.clientWidth
                const height = this._divContainer.clientHeight
        
                this._camera.aspect = width / height;
                this._camera.updateProjectionMatrix();
        
                this._renderer.setSize(width, height);
            }
        
        
        }
        var modal = document.getElementById("pageModal");
        var btn = document.getElementById("openModal");
        btn.onclick = function(){
            modal.style.display = "block";
        }
        var span = document.getElementsByClassName("close")[0];
        span.onclick = function(){
            modal.style.display = "none";
        }
        
        function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";  // 모든 탭 컨텐츠를 숨깁니다.
            }
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");  // 모든 탭 링크의 'active' 클래스를 제거합니다.
            }
            document.getElementById(tabName).style.display = "block";  // 클릭된 탭의 컨텐츠를 보여줍니다.
            evt.currentTarget.className += " active";  // 클릭된 탭에 'active' 클래스를 추가합니다.
          }
          
          // 페이지 로딩 완료 후 첫 번째 탭을 기본적으로 열기
          document.addEventListener("DOMContentLoaded", function() {
            document.getElementsByClassName("tablinks")[0].click();  // 첫 번째 탭을 자동으로 클릭합니다.
          });
    new App();
}

window.initThreeJS = initThreeJS;   