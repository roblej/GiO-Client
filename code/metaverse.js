import * as THREE from 'three';
import Stats from "stats.js";
import { GLTFLoader } from "../jsm/loaders/GLTFLoader.js";
import { DRACOLoader} from "../jsm/loaders/DRACOLoader.js";
import { Octree } from "../jsm/math/Octree.js";
import { Capsule } from "../jsm/math/Capsule.js";
import { OrbitControls } from "../jsm/controls/OrbitControls.js";
import { onMouseMove, getTalkTutorial, setTalkTutorial, getSTTutorial, getDTTutorial, setDTTutorial, getFnTutorial, setFnTutorial, getTpTutorial } from './event.js';
import { sendMessageToClova } from './record.js';
import { getSticker } from './event.js';
// import {stickerNumber} from './event.js';
import {updateSticker} from './event.js'
import { globalId } from './login.js';
import { RGBELoader } from '../jsm/loaders/RGBELoader.js';
import { gender } from './login.js';
import { log_map_tutorial } from './event.js';
import { talkBtnPromise, getTalkBtn } from './record.js';
import { welcomeAudio } from './event.js';
// import { openModal } from './mypage.js';
// THREE.GLTFLoader
export var game_name = "";
import { audioElement } from './event.js';

export function initThreeJS() {

    console.log("function complete")
    const loadingPage = document.getElementById('loadingPage');
    const tutorialPage = document.getElementById('tutorial')
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
            this._isRunning = true;  // 최초 로딩 시 run 상태로 시작
            this._shiftPressed = false;  // Shift 키의 눌림 상태 관리
            this._isTutorialShown = false;  // 튜토리얼이 이미 표시되었는지 추적하는 플래그
            this._isTpTutirialShown = false; //맵이동 튜토리얼이 이미 표시되었는지 추적하는 플래그
            this._isTaklTutorialShown = false; //최초 선생님 가까이 갔을때 추적하는 플래그

            const loader = new THREE.TextureLoader();
            
            //this._scene.background = new THREE.Color(0x87CEEB); // 하늘색으로 설정
            
            // 추가된 코드
            this._originalCamera = null;
            this._npcCamera = null;
            this._isNpcCameraActive = false;
            this._scenes = [];
            this._currentSceneIndex = 0;
            this._model = null; // 플레이어 모델을 저장할 변수
            this.originalPosition = new THREE.Vector3(); // 원래 위치 저장을 위한 속성

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
            for (let i = 0; i < 6; i++) {
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
                console.log('Setup Octree')
            }
        
        _setupControls() {
                this._camera.position.set(0,120, 300)
                this._controls = new OrbitControls(this._camera,this._divContainer);
                this._controls.target.set(0, 120, 0);
                this._controls.enablePan = false;
                this._controls.enableDamping = true;
        
                this._controls.minDistance = 500;  // 카메라가 대상에 가장 가까울 수 있는 거리
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
                document.getElementById('buttonScene0').addEventListener('click', () => {
                    this._switchScene(0);
                    document.querySelector('.tori_help').style.display = 'none';
                    document.getElementById("shadow").style.display = 'none';
                });
                document.getElementById('buttonScene1').addEventListener('click', () => this._switchScene(1));
                document.getElementById('buttonScene2').addEventListener('click', () => this._switchScene(2));
                document.getElementById('buttonScene3').addEventListener('click', () => this._switchScene(3));
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
                let distance = 200; // 카메라와 NPC 사이의 거리
                let cameraHeight = 130;
                
                if (npc.userData.type === 'teacher') {
                    distance = 200;
                    cameraHeight = 130;
                } else if (npc.userData.type === 'friend_hurt') {
                    distance = 300;
                    cameraHeight = 110;
                } else if (npc.userData.type === 'book_friend') {
                    distance = 200;
                    cameraHeight = 110;
                } else if (npc.userData.type === 'grandmother_child') {
                    distance = 200;
                    cameraHeight = 110;
                } else if (npc.userData.type === 'fountain') {
                    distance = 1000;
                    cameraHeight = 250;
                } else if (npc.userData.type === 'warning') {
                    distance = 500;
                    cameraHeight = 250;
                } else if (npc.userData.type === 'park_game') {
                    distance = 180;
                    cameraHeight = 130;
                } else if (npc.userData.type === 'grandfather') {
                    distance = 300;
                    cameraHeight = 110
                } 


                // 카메라의 위치를 NPC의 위치에서 거리를 두고, y값을 cameraHeight로 설정합니다
                const direction = new THREE.Vector3();
                direction.subVectors(npcPosition, modelPosition).normalize(); // NPC를 바라보는 방향
                newCamera.position.copy(npcPosition).sub(direction.multiplyScalar(distance));
                newCamera.position.y = cameraHeight;
                
                // 카메라가 NPC를 바라보도록 설정합니다
                newCamera.lookAt(npcPosition.x, npcPosition.y+100, npcPosition.z);
                
                // 새로운 카메라를 사용하도록 설정합니다
                this._camera = newCamera;
                
                // 카메라와 NPC 사이의 거리 계산
                const distanceToNPC = newCamera.position.distanceTo(npcPosition);
                console.log("Distance to NPC:", distanceToNPC); // 거리 출력

                // 거리 조건에 따라 모델 가시성 설정
                if (distanceToNPC < 200) {
                    this._model.visible = false; // 가시성을 끕니다
                    console.log("Model visibility set to false."); // 디버그 로그 추가
                } else {
                    this._model.visible = true; // 가시성을 켭니다
                    console.log("Model visibility set to true."); // 디버그 로그 추가
                }
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
                    console.log("Dialog closed, returning to previous camera."); // 디버그 로그 추가
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

_processAnimation() {
    const previousAnimationAction = this._currentAnimationAction;

    // Shift 키가 눌렸고, 이전에 떼진 상태에서만 전환
    if (this._pressKeys["shift"] && !this._shiftPressed) {
        this._isRunning = !this._isRunning;  // run <-> walk 상태 전환
        this._shiftPressed = true;  // Shift가 눌렸음을 기록
    } else if (!this._pressKeys["shift"] && this._shiftPressed) {
        this._shiftPressed = false;  // Shift 키를 떼었음을 기록
    }

    // W, A, S, D 중 하나라도 눌렀는지 확인
    if (this._pressKeys["w"] || this._pressKeys["a"] || this._pressKeys["s"] || this._pressKeys["d"]) {
        if (this._isRunning) {
            // 현재 run 상태
            this._currentAnimationAction = this._animationMap["run"];
            this._maxSpeed = 700;
            this._acceleration = 16;
            // console.log("Running...");
        } else {
            // 현재 walk 상태
            this._currentAnimationAction = this._animationMap["walk"];
            this._maxSpeed = 240;
            this._acceleration = 9;
            // console.log("Walking...");
        }
    } else {
        // 움직임이 없을 때 idle 애니메이션으로 설정
        this._currentAnimationAction = this._animationMap["idle"];
        this._speed = 0;
        this._maxSpeed = 0;
        this._acceleration = 0;
        // console.log("Idle...");
    }

    // 애니메이션 전환 처리
    if (previousAnimationAction !== this._currentAnimationAction) {
        previousAnimationAction.fadeOut(0.5);  // 이전 애니메이션 부드럽게 종료
        this._currentAnimationAction.reset().fadeIn(0.5).play();  // 새로운 애니메이션 시작
    }
}
        _loadSceneModels(scene, index) {
                loadingPage.style.display = 'flex';
            const npcs = [];
            this._worldOctree = new Octree();
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
            this._setupLight()
        // index에 따른 HDR 텍스처 설정
            let hdrPath;
            if (index === 0) { // 학교의 경우
                hdrPath = './data/sky_edit3.hdr';
            } else if (index === 1) { // 마을회관 외부의 경우
                hdrPath = './data/sky_edit3.hdr';
            } else if (index === 2) { // 도서관 외부의 경우
                hdrPath = './data/sky_edit3.hdr';
            } else if (index === 3) { // 공원의 경우
                hdrPath = './data/sky_edit3.hdr';
            } else if (index === 4) { // 마을회관 내부의 경우
                hdrPath = './data/inside_.hdr';
            } else if (index === 5) { // 도서관 내부의 경우
                hdrPath = './data/inside_.hdr';
            }

            // 선택된 HDR 로드
            rgbeLoader.load(hdrPath, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this._scene.background = texture;  // 배경으로 HDR 설정
                console.log(`HDR 텍스처 (${hdrPath})가 로드되었습니다.`);
            }, undefined, (error) => {
                console.error(`HDR 텍스처 로드 실패 (${hdrPath}):`, error);
            });
                
                plane.receiveShadow = true;
                this._worldOctree.fromGraphNode(plane);

            if (index === 0) { // 학교의 경우       
                    loader.load('./data/map/School/SchoolMap_wNav.glb', (gltf) => { // 학교
                        const map = gltf.scene;
                        this._scene.add(map);
                        this.map = map;
                        map.scale.set(100, 100, 100);
                        // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                        // map.position.set(506, 0, -1810);
                        map.position.set(-0, 0, -0);
                        // map.position.y = -40;
                        // map.rotation.y = Math.PI / 4;

                        // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                        map.traverse((child) => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                            if (child.isMesh && child.name === 'NavMesh') {  // 특정 이름의 Mesh를 찾음
                                // 투명도 설정
                                child.visible = false;  // NavMesh를 보이지 않게 함
                            }
                        });

                        this._worldOctree.fromGraphNode(map);
                        new Promise((resolve) => {
                        loadingPage.style.display = 'none'; // 로딩 페이지 숨김
                        resolve();
                        }).then(() => {
                        // 여기에 비동기적으로 실행할 코드를 작성합니다.
                            audioElement.src = './data/audio/1.mp3';  // 처음 음성 파일 설정
                            audioElement.play();  // 초기 음성 파일 재생
                        });
                        if (log_map_tutorial == 'true') {
                            tutorialPage.style.display = ' block';
                        }
                        if (log_map_tutorial == 'false' && getTalkTutorial() === 'true') {
                            document.querySelector('.left').style.display = 'block';
                            document.querySelector('.left p').innerHTML = '학교에 도착했어!<br>교문 앞에 계신 선생님께 가보자!'


                            const audioElement = document.createElement('audio');
                            audioElement.src = './data/audio/7.mp3';  // 7.mp3 파일 경로
                            audioElement.play();  // 7.mp3 파일 재생

                            document.querySelector('.left .next_btn').onclick = function() {
                                document.querySelector('.left').style.display = 'none';
                                audioElement.pause();  // 7.mp3 음성 멈춤
                                audioElement.currentTime = 0;  // 음성을 처음부터 다시 재생할 수 있도록 시간 초기화
                            };

                            
                    }
                        
                    }, undefined, function (error) {
                        console.error(error);
                    });
                    loader.load("./data/map/School/Character/rude_Anim.glb", (gltf) => { // 몸통박치기!!
                        const npc = gltf.scene;
                        this._scene.add(npc);
                    
            
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'friend_crash';
                                child.userData.anim = animationsMap
                                child.userData.name = '지나가는 친구'
                            }
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(647, 0, -2917);
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
                    loader.load("./data/map/School/Character/schoolgirl_Anim.glb", (gltf) => { // 다쳐서 넘어진 친구
                        const npc = gltf.scene;
                        this._scene.add(npc);
                
        
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'friend_hurt';
                                child.userData.anim = animationsMap
                                child.userData.name = '주저 앉아있는 친구'
                            }
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['sit']) {
                            const idleAction = animationsMap['sit'];
                            idleAction.play();
                        }
                        npc.position.set(225, 0 , -1722);
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
                    loader.load("./data/map/School/Character/teacher_Anim.glb", (gltf) => { // 선생님
                        const npc = gltf.scene;
                        this._scene.add(npc);
                
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
        
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            // console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'teacher';
                                child.userData.anim = animationsMap
                                child.userData.name = '선생님'
                            }
                        });
                        // 애니메이션 믹서 설정
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        npc.userData.name = 'teacher'
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(684, 0 , -511);
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
                    loader.load("./data/map/School/Character/principal_Anim.glb", (gltf) => { //교장선생님
                        const npc = gltf.scene;
                        this._scene.add(npc);
            
                        // 애니메이션 믹서 설정
                        const mixer = new THREE.AnimationMixer(npc);
                        this._mixers.push(mixer);
                        const animationsMap = {};
                        gltf.animations.forEach((clip) => {
                            console.log(clip.name);
                            animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        npc.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                            }
                            if (child.isMesh) {
                                child.userData.type = 'rector';
                                child.userData.anim = animationsMap
                                child.userData.name = '교장선생님'
                            }
                        });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생

                        if (animationsMap['Idle']) {
                            const idleAction = animationsMap['Idle'];

                            idleAction.play();
                        }
                        npc.position.set(-706, 0, -3827);
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
                    loader.load("./data/map/School/Character/ballgamenpc_Anim.glb", (gltf) => { //공놀이하는 친구
                        const npc = gltf.scene;
                        this._scene.add(npc);
            
        
                         // 애니메이션 믹서 설정
                         const mixer = new THREE.AnimationMixer(npc);
                         this._mixers.push(mixer);
                         const animationsMap = {};
                         gltf.animations.forEach((clip) => {
                             console.log(clip.name);
                             animationsMap[clip.name] = mixer.clipAction(clip);
                         });
                         npc.traverse(child => {
                             if (child instanceof THREE.Mesh) {
                                 child.castShadow = true;
                                 child.receiveShadow = true;
                                 child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                             }
                             if (child.isMesh) {
                                 child.userData.type = 'game_friend';
                                 child.userData.anim = animationsMap
                                 child.userData.name = '공놀이를 하던 친구'
                             }
                         });
                        npc.userData.animationsMap = animationsMap;
                        npc.userData.mixer = mixer;
                        // 'idle' 애니메이션 재생
                        if (animationsMap['idle']) {
                            const idleAction = animationsMap['idle'];
                            idleAction.play();
                        }
                        npc.position.set(-1326, 0, -2499);
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
            } else if (index === 1) { // 마을회관 외부의 경우
                loader.load('./data/map/Town_building/townbOut_wNav.glb', (gltf) => { // 마을회관
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);

                map.position.set(0, 0, 0);
                // map.position.y = -40;
                

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    if (child.isMesh && child.name === 'NavMesh') {  // 특정 이름의 Mesh를 찾음
                        // 투명도 설정
                        child.visible = false;  // NavMesh를 보이지 않게 함
                    }

                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
                });
        } else if (index === 2) { // 도서관 외부의 경우
            loader.load('./data/map/Library/LibraryOut_wNav.glb', (gltf) => { //도서관
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);
                // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                // map.position.set(-1111, 0, -2561);
                // map.position.y = -40;
                // map.rotation.y = Math.PI / 4;

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    if (child.isMesh && child.name === 'NavMesh') {  // 특정 이름의 Mesh를 찾음
                        // 투명도 설정
                        child.visible = false;  // NavMesh를 보이지 않게 함
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
        } else if (index === 3) { // 공원의 경우
            loader.load('./data/map/park/park_wNav.glb', (gltf) => {
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
                    if (child.isMesh && child.name === 'NavMesh') {  // 특정 이름의 Mesh를 찾음
                        // 투명도 설정
                        child.visible = false;  // NavMesh를 보이지 않게 함
                    }

                    if(child.name === "Fountain_1") {
                        child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                        child.userData.type = 'fountain';
                      child.userData.name = '분수대';
                    } else if(child.name === "Warning"){
                        child.userData.type = 'warning';
                        child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                      child.userData.name = '경고표지판'

                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
            loader.load("./data/map/Park/Character/park_female_Anim.glb", (gltf) => { // 물건을 떨어뜨린 사람
                const npc = gltf.scene;
                this._scene.add(npc);
        

                // 애니메이션 믹서 설정
                const mixer = new THREE.AnimationMixer(npc);
                this._mixers.push(mixer);
                const animationsMap = {};
                gltf.animations.forEach((clip) => {
                    console.log(clip.name);
                    animationsMap[clip.name] = mixer.clipAction(clip);
                });
                npc.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                    }
                    if (child.isMesh) {
                        child.userData.type = 'fall_item';
                        child.userData.anim = animationsMap
                        child.userData.name = '물건을 떨어뜨린 사람'
                    }
                });
                npc.userData.animationsMap = animationsMap;
                npc.userData.mixer = mixer;
                // 'idle' 애니메이션 재생
                if (animationsMap['idle']) {
                    const idleAction = animationsMap['idle'];
                    idleAction.play();
                }
                npc.position.set(6399, 0, -2702);
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
            loader.load("./data/map/Park/Character/park_man_Anim.glb", (gltf) => { // 산책하는 아저씨
            const npc = gltf.scene;
            this._scene.add(npc);
    

            // 애니메이션 믹서 설정
            const mixer = new THREE.AnimationMixer(npc);
            this._mixers.push(mixer);
            const animationsMap = {};
            gltf.animations.forEach((clip) => {
                console.log(clip.name);
                animationsMap[clip.name] = mixer.clipAction(clip);
            });
            npc.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                }
                if (child.isMesh) {
                    child.userData.type = 'fall_item_man';
                    child.userData.anim = animationsMap
                    child.userData.name = '산책중인 아저씨'
                }
            });
            npc.userData.animationsMap = animationsMap;
            npc.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['idle']) {
                const idleAction = animationsMap['idle'];
                idleAction.play();
            }
            npc.position.set(6084, 0, -7052);
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
            loader.load("./data/map/park/Character/park_gameNPC_idle.glb", (gltf) => { // 캐리커쳐 학생
        const npc = gltf.scene;
        this._scene.add(npc);


        // 애니메이션 믹서 설정
        const mixer = new THREE.AnimationMixer(npc);
        this._mixers.push(mixer);
        const animationsMap = {};
        gltf.animations.forEach((clip) => {
            console.log(clip.name);
            animationsMap[clip.name] = mixer.clipAction(clip);
        });
        npc.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
            }
            if (child.isMesh) {
                child.userData.type = 'park_game';
                child.userData.anim = animationsMap
                child.userData.name = '그림그리는 아이'
            }
        });
        npc.userData.animationsMap = animationsMap;
        npc.userData.mixer = mixer;
        // 'idle' 애니메이션 재생
        if (animationsMap['idle']) {
            const idleAction = animationsMap['idle'];
            idleAction.play();
        }
        npc.position.set(4731, 0, -1062);
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

        } else if (index === 4) { // 마을회관 내부의 경우
            loader.load('./data/map/Town_building/townBIn_wNav.glb', (gltf) => {
                const map = gltf.scene;
                this._scene.add(map);
                this.map = map;
                map.scale.set(100, 100, 100);
                // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전

                // map.position.set(-1111, 0, -2561);
                // map.position.y = -40;
                map.rotation.y = Math.PI;

                // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
                map.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    if (child.isMesh && child.name === 'NavMesh') {  // 특정 이름의 Mesh를 찾음
                        // 투명도 설정
                        child.visible = false;  // NavMesh를 보이지 않게 함
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
            loader.load("./data/map/Town_building/Character/town_grandpa_Anim.glb", (gltf) => { // 할아버지
                const npc = gltf.scene;
                this._scene.add(npc);
        

                // 애니메이션 믹서 설정
                const mixer = new THREE.AnimationMixer(npc);
                this._mixers.push(mixer);
                const animationsMap = {};
                gltf.animations.forEach((clip) => {
                    console.log(clip.name);
                    animationsMap[clip.name] = mixer.clipAction(clip);
                });
                npc.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                    }
                    if (child.isMesh) {
                        child.userData.type = 'grandfather';
                        child.userData.anim = animationsMap
                        child.userData.name = '할아버지'
                    }
                });
                npc.userData.animationsMap = animationsMap;
                npc.userData.mixer = mixer;
                // 'idle' 애니메이션 재생
                if (animationsMap['sit']) {
                    const idleAction = animationsMap['sit'];
                    idleAction.play();
                }
                npc.position.set(-909, 7.5, 10);
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
                npc.rotation.y = Math.PI * 2.5;
                npcs.push(npc);
                this._npc = npc;
            });
            loader.load("./data/map/Town_building/Character/town_lady_Anim.glb", (gltf) => { //부녀회장
                    const npc = gltf.scene;
                    this._scene.add(npc);
            

                    // 애니메이션 믹서 설정
                    const mixer = new THREE.AnimationMixer(npc);
                    this._mixers.push(mixer);
                    const animationsMap = {};
                    gltf.animations.forEach((clip) => {
                        console.log(clip.name);
                        animationsMap[clip.name] = mixer.clipAction(clip);
                    });
                    npc.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                        }
                        if (child.isMesh) {
                            child.userData.type = '부녀회장';
                            child.userData.anim = animationsMap
                            child.userData.name = '부녀회장'
                        }
                    });
                    npc.userData.animationsMap = animationsMap;
                    npc.userData.mixer = mixer;
                    // 'idle' 애니메이션 재생
                    if (animationsMap['idle']) {
                        const idleAction = animationsMap['idle'];
                        idleAction.play();
                    }
                    npc.position.set(-943, 0, 688);
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
                    npc.rotation.y = Math.PI;
                    npcs.push(npc);
                    this._npc = npc;
            });
            loader.load("./data/map/Town_building/Character/town_grandma_Anim.glb", (gltf) => { //할머니
                    const npc = gltf.scene;
                    this._scene.add(npc);
            

                    // 애니메이션 믹서 설정
                    const mixer = new THREE.AnimationMixer(npc);
                    this._mixers.push(mixer);
                    const animationsMap = {};
                    gltf.animations.forEach((clip) => {
                        console.log(clip.name);
                        animationsMap[clip.name] = mixer.clipAction(clip);
                    });
                    npc.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                        }
                        if (child.isMesh) {
                            child.userData.type = '할머니';
                            child.userData.anim = animationsMap
                            child.userData.name = '할머니'
                        }
                    });
                    npc.userData.animationsMap = animationsMap;
                    npc.userData.mixer = mixer;
                    // 'idle' 애니메이션 재생
                    if (animationsMap['idle']) {
                        const idleAction = animationsMap['idle'];
                        idleAction.play();
                    }
                    npc.position.set(-607, 0, 989);
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
            loader.load("./data/map/Town_building/Character/town_granddaughter_Anim.glb", (gltf) => { //종이접기하는 손녀
                    const npc = gltf.scene;
                    this._scene.add(npc);
            

                    // 애니메이션 믹서 설정
                    const mixer = new THREE.AnimationMixer(npc);
                    this._mixers.push(mixer);
                    const animationsMap = {};
                    gltf.animations.forEach((clip) => {
                        console.log(clip.name);
                        animationsMap[clip.name] = mixer.clipAction(clip);
                    });
                    npc.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                        }
                        if (child.isMesh) {
                            child.userData.type = 'grandmother_child';
                            child.userData.anim = animationsMap
                            child.userData.name = '할머니의 손녀'
                        }
                    });
                    npc.userData.animationsMap = animationsMap;
                    npc.userData.mixer = mixer;
                    // 'idle' 애니메이션 재생
                    if (animationsMap['idle']) {
                        const idleAction = animationsMap['idle'];
                        idleAction.play();
                    }
                    npc.position.set(-431, 20, 678);
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
            loader.load("./data/map/Town_building/Character/town_chief_idle.glb", (gltf) => { //이장
                const npc = gltf.scene;
                this._scene.add(npc);
        

                // 애니메이션 믹서 설정
                const mixer = new THREE.AnimationMixer(npc);
                this._mixers.push(mixer);
                const animationsMap = {};
                gltf.animations.forEach((clip) => {
                    console.log(clip.name);
                    animationsMap[clip.name] = mixer.clipAction(clip);
                });
                npc.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                    }
                    if (child.isMesh) {
                        child.userData.type = 'town_chief';
                        child.userData.anim = animationsMap
                        child.userData.name = '이장'
                    }
                });
                npc.userData.animationsMap = animationsMap;
                npc.userData.mixer = mixer;
                // 'idle' 애니메이션 재생
                if (animationsMap['idle']) {
                    const idleAction = animationsMap['idle'];
                    idleAction.play();
                }
                npc.position.set(-905, 0, 1095);
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
        } else if (index === 5) { // 도서관 내부의 경우
            loader.load('./data/map/Library/LibraryIn_wNav.glb', (gltf) => {
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
                    if (child.isMesh && child.name === 'NavMesh') {  // 특정 이름의 Mesh를 찾음
                        // 투명도 설정
                        child.visible = false;  // NavMesh를 보이지 않게 함
                    }
                });

                this._worldOctree.fromGraphNode(map);
                loadingPage.style.display = 'none'; // 로딩 페이지 숨김
            }, undefined, function(error) {
                console.error(error);
            });
                loader.load("./data/map/Library/Character/sboy_anim.glb", (gltf) => { // 책을 꺼내는 아이
            const npc = gltf.scene;
            this._scene.add(npc);
    

            // 애니메이션 믹서 설정
            const mixer = new THREE.AnimationMixer(npc);
            this._mixers.push(mixer);
            const animationsMap = {};
            gltf.animations.forEach((clip) => {
                console.log(clip.name);
                animationsMap[clip.name] = mixer.clipAction(clip);
            });
            npc.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                }
                if (child.isMesh) {
                    child.userData.type = 'book_friend';
                    child.userData.anim = animationsMap
                    child.userData.name = '책을 꺼내는 어린이'
                }
            });
            npc.userData.animationsMap = animationsMap;
            npc.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['idle']) {
                const idleAction = animationsMap['idle'];
                idleAction.play();
            }
            npc.position.set(-356, 0, 776);
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
            loader.load("./data/map/Library/Character/library_teen_anim.glb", (gltf) => { // 책을 찾는 아이(컴퓨터 쓰는애)
            const npc = gltf.scene;
            this._scene.add(npc);
    

           // 애니메이션 믹서 설정
           const mixer = new THREE.AnimationMixer(npc);
           this._mixers.push(mixer);
           const animationsMap = {};
           gltf.animations.forEach((clip) => {
               console.log(clip.name);
               animationsMap[clip.name] = mixer.clipAction(clip);
           });
           npc.traverse(child => {
               if (child instanceof THREE.Mesh) {
                   child.castShadow = true;
                   child.receiveShadow = true;
                   child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
               }
               if (child.isMesh) {
                   child.userData.type = 'library_searching';
                   child.userData.anim = animationsMap
                   child.userData.name = '독서검색대를 이용하는 사람'
               }
           });
            npc.userData.animationsMap = animationsMap;
            npc.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['idle']) {
                const idleAction = animationsMap['idle'];
                idleAction.play();
            }
            npc.position.set(427, 0, 605);
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
            npc.rotation.y = Math.PI * 1.2;
            // npcs.push(npc);
            this._npc = npc;
            });
            loader.load("./data/map/Library/Character/Library_student_anim.glb", (gltf) => { // 안경을 떨어트린 학생
            const npc = gltf.scene;
            this._scene.add(npc);
    

            // 애니메이션 믹서 설정
            const mixer = new THREE.AnimationMixer(npc);
            this._mixers.push(mixer);
            const animationsMap = {};
            gltf.animations.forEach((clip) => {
                console.log(clip.name);
                animationsMap[clip.name] = mixer.clipAction(clip);
            });
            npc.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                }
                if (child.isMesh) {
                    child.userData.type = 'glass';
                    child.userData.anim = animationsMap
                    child.userData.name = '안경을 떨어뜨린 학생'
                }
            });
            npc.userData.animationsMap = animationsMap;
            npc.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['idle']) {
                const idleAction = animationsMap['idle'];
                idleAction.play();
            }
            npc.position.set(223, 0, 1079);
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
            loader.load("./data/map/Library/Character/library_readG_anim.glb", (gltf) => { // 앉아서 책 읽는 학생
            const npc = gltf.scene;
            this._scene.add(npc);
    

            // 애니메이션 믹서 설정
            const mixer = new THREE.AnimationMixer(npc);
            this._mixers.push(mixer);
            const animationsMap = {};
            gltf.animations.forEach((clip) => {
                console.log(clip.name);
                animationsMap[clip.name] = mixer.clipAction(clip);
            });
            npc.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
                }
                if (child.isMesh) {
                    child.userData.type = 'read';
                    child.userData.anim = animationsMap
                    child.userData.name = '책 읽는 사람'
                }
            });
            npc.userData.animationsMap = animationsMap;
            npc.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['Sit']) {
                const idleAction = animationsMap['Sit'];
                idleAction.play();  
            }
            npc.position.set(380, 48, 1669);
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
            npc.rotation.y = Math.PI * 1.4;
            // npcs.push(npc);
            this._npc = npc;
            });
            loader.load("./data/map/Library/Character/library_gameNPC_idle.glb", (gltf) => { // 도서관 게임 NPC
            const npc = gltf.scene;
            this._scene.add(npc);
    

           // 애니메이션 믹서 설정
           const mixer = new THREE.AnimationMixer(npc);
           this._mixers.push(mixer);
           const animationsMap = {};
           gltf.animations.forEach((clip) => {
               console.log(clip.name);
               animationsMap[clip.name] = mixer.clipAction(clip);
           });
           npc.traverse(child => {
               if (child instanceof THREE.Mesh) {
                   child.castShadow = true;
                   child.receiveShadow = true;
                   child.userData.isNPC = true; // 추가한 코드 NPC 속성 추가
               }
               if (child.isMesh) {
                   child.userData.type = 'library_game';
                   child.userData.anim = animationsMap
                   child.userData.name = '사서'
               }
           });
            npc.userData.animationsMap = animationsMap;
            npc.userData.mixer = mixer;
            // 'idle' 애니메이션 재생
            if (animationsMap['idle']) {
                const idleAction = animationsMap['idle'];
                idleAction.play();
            }
            npc.position.set(898, 0, 569);
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
        }
    }

        _loadPlayerModel() {
        // 플레이어 모델 로드
            const loader = new GLTFLoader();

        const modelPath = gender === 'male' ? './data/bPlayer.glb' : './data/gPlayer.glb';
        loader.load(modelPath, (gltf) => {
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
                    // this._boxHelper = boxHelper;
                    this._model = model;
        
                    this._scene.add(this._model);
        });
        
            loader.load("./data/tori.glb",(gltf) =>{
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
            if (animationsMap['idle']) {
                const idleAction = animationsMap['idle'];
                idleAction.play();
            }
            // npc.position.set(1000,0,-230);
            support.scale.set(50,50,50);
            support.position.set(200,50,0)
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
    audioElement.pause();  // 6.mp3 음성 멈춤
    audioElement.currentTime = 0;  // 음성을 처음부터 다시 재생할 수 있도록 시간 초기화
    // 오디오 상태 체크 및 재생 로직
    if (this._listener.context.state === 'suspended') {
        this._listener.context.resume();
    }

    // 소리가 이미 재생 중이라면 중단하고 새로 불러오기
    if (this._sound.isPlaying) {
        this._sound.stop();
    }

    // 새 소리를 불러오고 재생
    this._audioLoader.load('./data/Gio_bgm.mp3', (buffer) => {
        this._sound.setBuffer(buffer);
        this._sound.setLoop(true);
        this._sound.setVolume(this._initialVolume); // 초기 볼륨 적용
        // this._sound.play();
    });

    // 씬이 배열 범위 내에 있는지 확인
    if (index < 0 || index >= this._scenes.length) {
        console.error('잘못된 씬 인덱스입니다.');
        return;
    }
    // 씬 전환 로직
    if (this._model) {
        this._scene.remove(this._model, this._support); // 이전 씬에서 플레이어 모델 제거
    }
    
    // 기존 씬을 삭제하고 새로운 씬을 생성
    if (this._scenes[index]) {
        this._clearScene(this._scenes[index]); // 기존 씬 내 객체 삭제
        this._scenes[index] = new THREE.Scene(); // 새로운 씬 생성
    }


    // 새로운 씬으로 전환
    this._currentSceneIndex = index;
    console.log('현재 씬은 ' + this._currentSceneIndex);
    this._scene = this._scenes[index];

    // 씬 모델 로드 (최초 접근 시)
    if (!this._scene.modelsLoaded) {
        this._loadSceneModels(this._scene, index);
        this._scene.modelsLoaded = true;
    }

    // 플레이어 모델을 새로운 씬에 추가 및 초기 위치 설정
    if (this._model) {
        let startPosition;
        switch (index) {
            case 0:
                startPosition = new THREE.Vector3(95, 15, 31); // 첫 번째 씬 위치
                break;
            case 1:
                startPosition = new THREE.Vector3(100, 0, 100); // 두 번째 씬 위치
                break;
            case 2:
                startPosition = new THREE.Vector3(-50, 10, -50); // 세 번째 씬 위치
                break;
            default:
                startPosition = new THREE.Vector3(0, 10, 0); // 기본 위치
                break;
        }

        // 플레이어 위치 및 캡슐 초기화
        this._model.position.copy(startPosition);
        console.log("플레이어 새 위치: ", this._model.position);

        if (this._model._capsule) {
            this._model._capsule.start.copy(startPosition);
            this._model._capsule.end.copy(startPosition).y += this._model._capsule.radius * 2;
            console.log("캡슐 초기화 상태: ", this._model._capsule.start, this._model._capsule.end);
        }
        this._scene.add(this._model, this._support); // 새로운 씬에 플레이어 추가
        // this._worldOctree.fromGraphNode(this.map); // 새로운 씬에 맞게 Octree 재설정
        console.log("Octree가 새 씬에 맞게 다시 설정되었습니다.");
    }

    // NPC 상태 초기화
    this._npcs.forEach(npc => {
        npc.quaternion.set(0, 0, 0, 1);  // 회전 상태 초기화
    });

    // UI 업데이트
  document.getElementById("BtnMaps").style.display = "none";



}

// 씬 내 모든 객체를 삭제하고 메모리 해제하는 함수
_clearScene(scene) {
    // 씬 내 모든 객체 삭제
    while (scene.children.length > 0) {
        const object = scene.children[0];
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        scene.remove(object);  // 씬에서 객체 제거
    }

    // Octree 데이터도 삭제
    if (this._worldOctree) {
        this._worldOctree = null;  // Octree 초기화
        console.log("Octree가 초기화되었습니다.");
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

                function teleportPlayer(teleportPosition) {
                    // 현재 플레이어의 위치 저장
                    this.originalPosition.copy(this._model.position); // 클래스 속성에 저장
                    
                    // 플레이어를 특정 위치로 순간 이동
                    this._model.position.copy(teleportPosition);
                        
                    console.log("Player teleported to:", teleportPosition);
                
                    // 물리 엔진 상태 초기화가 필요한 경우
                    if (this._model._capsule) {
                        this._model._capsule.start.copy(teleportPosition);
                        this._model._capsule.end.copy(teleportPosition).y += this._model._capsule.radius * 2;
                        console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                    }
                }
            
                // 클릭된 객체 확인
                const intersects = this._raycaster.intersectObjects(this._scene.children, true);
                if (intersects.length > 0) {
                    for (let i = 0; i < intersects.length; i++) {
                        const selectedObject = intersects[0].object; // 첫 번째 교차된 객체만 사용
                        
                        console.log('Clicked object:', selectedObject); // 클릭된 객체 정보 로그
                        if (selectedObject.name === 'teleport') {
                            console.log("teleport");
                        } else if (selectedObject.userData.type === 'teacher') {
                        teleportPlayer.call(this, new THREE.Vector3(676, 4.07, -117));
                        } else if (selectedObject.userData.type === 'friend_crash') {
                        teleportPlayer.call(this, new THREE.Vector3(451, 4.07, -2760));
                        } else if (selectedObject.userData.type === 'rector') {
                        teleportPlayer.call(this, new THREE.Vector3(-846, 4.07, -3546));
                        } else if (selectedObject.userData.type === 'friend_hurt') {
                        teleportPlayer.call(this, new THREE.Vector3(257.06, 8.30, -1315.85));
                        } else if (selectedObject.userData.type === 'game_friend') {
                        teleportPlayer.call(this, new THREE.Vector3(-1138, 4.07, -2236));
                        } else if (selectedObject.userData.type === 'book_friend') {
                        teleportPlayer.call(this, new THREE.Vector3(-260, 6.99, 507.71));
                        } else if (selectedObject.userData.type === 'library_searching') {
                        teleportPlayer.call(this, new THREE.Vector3(613, 6.99, 328.37));
                        } else if (selectedObject.userData.type === 'glass') {
                        teleportPlayer.call(this, new THREE.Vector3(455, 6.99, 758.80));
                        } else if (selectedObject.userData.type === 'read') {
                        teleportPlayer.call(this, new THREE.Vector3(397.25, 6.99, 1368.71));
                        } else if (selectedObject.userData.type === '부녀회장') {
                        teleportPlayer.call(this, new THREE.Vector3(-676, 6.99, 459));
                        } else if (selectedObject.userData.type === 'grandmother_child') {
                        teleportPlayer.call(this, new THREE.Vector3(-446.25, 6.99, 349));
                        } else if (selectedObject.userData.type === '할머니') {
                        teleportPlayer.call(this, new THREE.Vector3(-611, 6.99, 642));
                        } else if (selectedObject.userData.type === 'fountain') {
                        teleportPlayer.call(this, new THREE.Vector3(3357, 6.99, 153.46));
                        } else if (selectedObject.userData.type === 'warning') {
                        teleportPlayer.call(this, new THREE.Vector3(3303, 6.99, -4114));
                        } else if (selectedObject.userData.type === 'park_game') {
                        teleportPlayer.call(this, new THREE.Vector3(4782, 6.99, -826));
                        } else if (selectedObject.userData.type === 'fall_item') {
                        teleportPlayer.call(this, new THREE.Vector3(6773, 6.99, -2626));
                        } else if (selectedObject.userData.type === 'fall_item_man') {
                        teleportPlayer.call(this, new THREE.Vector3(5993, 6.99, -7393));
                        } else if (selectedObject.userData.type === 'library_game') {
                        teleportPlayer.call(this, new THREE.Vector3(602, 7.25, 435.57));
                        } else if (selectedObject.userData.type === 'grandfather') {
                        teleportPlayer.call(this, new THREE.Vector3(-388.20, 8.15, -1.67));
                        } else if (selectedObject.userData.type === 'town_chief') {
                        teleportPlayer.call(this, new THREE.Vector3(-811.95, 8.15, 818.43));
                        
                    }
                        


                        // if (selectedObject.userData.animationsMap) {
                        //     const animationsMap = selectedObject.userData.animationsMap;
                        //     console.log('Found animationsMap:', animationsMap);
                        // } else if (selectedObject.parent && selectedObject.parent.userData.animationsMap) {
                        //     const animationsMap = selectedObject.parent.userData.animationsMap;
                        //     console.log('Found animationsMap in parent:', animationsMap);
                        // } else {
                        //     console.log('animationsMap is undefined for this object');
                        // }

                        if (selectedObject.userData && selectedObject.userData.isNPC) {
                            console.log('NPC clicked, focusing on NPC'); // NPC 클릭 여부 확인하는 로그
                            console.log(selectedObject)
                            const animationsMap = selectedObject.userData.anim;
                            this._currentNPCAnimations = animationsMap;
                            const name = selectedObject.userData.name;
                            this._name = name;
                            this._focusOnNPC(selectedObject);
                            // this._showNpcDialog(selectedObject);
                            // const embarrassed01Action = animationsMap['embarrassed01'];
                            // const embarrassed02Action = animationsMap['embarrassed02'];

                            // if (embarrassed01Action && embarrassed02Action) {
                            //     embarrassed01Action
                            //             .reset()   // 상태 초기화
                            //             .setEffectiveWeight(1) // 동작할 가중치 설정
                            //             .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            //             .play();   // 재생 시작

                            //         embarrassed02Action
                            //             .reset()
                            //             .setEffectiveWeight(1)
                            //             .setLoop(THREE.LoopOnce, 1)
                            //             .play();
                            // console.log("Playing embarrassed01 and embarrassed02 animations simultaneously.");
                            // } else {
                            // console.error("One or both embarrassed animations not found in the animationsMap.");
                            // }
                            
                            break; // 첫 번째 NPC 객체만 처리하고 루프 종료
                        }else if(selectedObject.userData.type === 'warning'||selectedObject.userData.type === 'fountain'){
                            this._showNpcDialog(selectedObject.userData.type);
                        }
                    }
                }
        }
        
        _showNpcDialog(npcType) {
            console.log(`Showing dialog for NPC type: ${npcType}`); // 디버그 로그 추가'

            var npc_name = document.getElementsByClassName("npc_name");
            var casher = document.getElementById("thiscasher");
            var span = document.getElementsByClassName("close")[1];
            var span0 = document.getElementsByClassName("close")[0];
            var dialogText = document.querySelector("#thiscasher .Speech1 p");
            var clicktext = document.getElementsByClassName("Speech1")
            var option1 = document.getElementById("select1");
            var option2 = document.getElementById("select2");
            var option3 = document.getElementById("select3");
            var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
            var button = document.querySelector("#buttonGroup button")
            var recordButton = document.getElementById('recordButton')
            var tori_help = document.querySelector('.tori_help')
            var tori_next = document.querySelector('.tori_help .next_btn')
            var tori_help_p = document.querySelector('.tori_help p')
            var choose_answer
            
            var message = `대화 상대가 ${npcType.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent},${option2.textContent},${option3.textContent}가 있다.그리고 아이가 고른 선택지는 ${choose_answer}이다.`
            var count = 0;


            // _currentNPCAnimations를 사용
            if (this._currentNPCAnimations) {
                console.log("Animations available:", this._currentNPCAnimations);
            } else {
                console.error("No animations available for this NPC.");
            }

            function resetplayerposition() {
                this._model.position.copy(this.originalPosition);
                            
                console.log("Player teleported to:", this.originalPosition);

                // 물리 엔진 상태 초기화가 필요한 경우 여기서 추가
                if (this._model._capsule) {
                    this._model._capsule.start.copy(this.originalPosition);
                    this._model._capsule.end.copy(this.originalPosition).y += this._model._capsule.radius * 2;
                    console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                }
            }


            function listKoreanVoices() {
                if ('speechSynthesis' in window) {
                    // const voices = window.speechSynthesis.getVoices();
            
                    // 한국어 음성만 필터링
                    const koreanVoices = voices.filter(voice => voice.lang === 'ko-KR');
            
                    // 한국어 음성 목록 출력
                    // koreanVoices.forEach((voice, index) => {
                    //     console.log(`${index + 1}. 이름: ${voice.name}, 언어: ${voice.lang}, 기본 목소리: ${voice.default}`);
                    // });
            
                    if (koreanVoices.length === 0) {
                        console.log('한국어 음성을 찾을 수 없습니다.');
                    }
                } else {
                    console.log('TTS 기능이 지원되지 않는 브라우저입니다.');
                }
            }
            
            // 페이지 로드 후 음성 목록을 다시 가져오기 (음성 로딩이 비동기적으로 이루어질 수 있음)
            window.speechSynthesis.onvoiceschanged = function () {
                listKoreanVoices();
            };
            function testKoreanVoices() {
                if ('speechSynthesis' in window) {
                    // const voices = window.speechSynthesis.getVoices();
            
                    // 한국어 음성만 필터링
                    // const koreanVoices = voices.filter(voice => voice.lang === 'ko-KR');
            
                    if (koreanVoices.length === 0) {
                        console.log('한국어 음성을 찾을 수 없습니다.');
                        return;
                    }
            
                    // 각 음성을 "안녕하세요"로 테스트
                    // koreanVoices.forEach((voice, index) => {
                    //     const utterance = new SpeechSynthesisUtterance("안녕하세요");
                    //     utterance.voice = voice;  // 각 음성을 할당
                    //     console.log(`${index + 1}. 이름: ${voice.name}, 언어: ${voice.lang}`);
            
                    //     // 음성 출력
                    //     window.speechSynthesis.speak(utterance);
                    // });
                } else {
                    console.log('TTS 기능이 지원되지 않는 브라우저입니다.');
                }
            }
            
            // 페이지 로드 후 음성 목록을 다시 가져오기 (음성 로딩이 비동기적으로 이루어질 수 있음)
            window.speechSynthesis.onvoiceschanged = function () {
                testKoreanVoices();
            };
            
            
            function speak(text) {
                if ('speechSynthesis' in window) {
                    // const utterance = new SpeechSynthesisUtterance(text);
                    // window.speechSynthesis.speak(utterance);
                } else {
                    console.log('TTS 기능이 지원되지 않는 브라우저입니다.');
                }
            }

            // 이벤트 리스너를 설정하는 함수
            function setClickEvent() {
                for (var i = 0; i < clicktext.length; i++) {
                    clicktext[i].onclick = function () {
                        // console.log(count)
                        // if (document.getElementById('buttonGroup').style.display = 'flex') {
                        //     document.getElementById('next').style.display = 'none'
                        // } else if(document.getElementById('buttonGroup').style.display = 'none') {
                        //     document.getElementById('next').style.display = 'block'
                        // }
                        if (count == 0) {
                            buttonGroup.style.display = "flex"; // 버튼 그룹 표시
                            count++;
                            // if (npcType != 'game_friend' && npcType != '할머니' && document.getElementsByClassName('GameBtn').length === 0){
                            // if (npcType = 'game_friend' || npcType == '할머니' || document.getElementsByClassName('GameBtn').length === 0) {
                                    
                            //     } else recordButton.onclick();
                            // }

                            // 클릭 이벤트 비활성화
                            // this.onclick = null; // 현재 클릭된 요소의 onclick 이벤트 비활성화
                        } else if (count == 1) {
                            // buttonGroup.style.display = "none";
                            count++;

                            // 다시 클릭 이벤트 활성화
                            // setClickEvent(); // 이벤트 리스너를 재설정
                        } else {
                            // casher.style.display = "none";
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
                // resetModal();
                document.querySelectorAll('.choose button').forEach(function (button) {
                    button.classList.remove('active');
                })
                this._onDialogClosed();
            }.bind(this);
            span0.onclick = function () {
                casher.style.display = "none";
                count = 0;
                // resetModal();
                document.querySelectorAll('.choose button').forEach(function (button) {
                    button.classList.remove('active');
                })
                this._onDialogClosed();
            }.bind(this);

            // 모달 창 바깥 영역 클릭 시 모달 닫기
            // window.onclick = function (event) {
            //     if (event.target == casher) {
            //         casher.style.display = "none";
            //         count = 0;
            //         resetModal();
            //         this._onDialogClosed();
            //     }
            // }.bind(this);

            for (var i = 0; i < npc_name.length; i++) {
                npc_name[i].innerHTML = this._name;
            }
            speechText.onclick = function () {
                ;
                buttonGroup.style.display = "flex";
                // document.getElementById('next').style.display = 'none'
            }
            dialogText.onclick = function () {
                buttonGroup.style.display = "flex";
                // document.getElementById('next').style.display = 'none'
            };

            if (npcType === 'teacher') {
                // speak(dialogText.innerHTML);
                // listKoreanVoices();
                // testKoreanVoices();

                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "안녕? 새로 온 학생이니?";
                    option1.innerHTML = "네, 맞아요. 안녕하세요?";
                    option2.innerHTML = "(무시하고 갈 길을 간다.)";
                    option3.innerHTML = "누구세요?";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";
                if (getTalkTutorial() === 'true') {
                    document.querySelector('.left').style.display = 'none'
                    document.querySelector('.tori_help').style.display = 'block'
                    document.querySelector('.tori_help p').innerHTML = '선생님께서 너에게 인사를 하셨어!<br>어떤 반응을 하면 좋을까?'
                    // 오디오 요소 생성
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/10.mp3';  // 10.mp3 파일 경로
                    audioElement.play();  // 10.mp3 파일 재생

                    document.querySelector('.tori_help .next_btn').onclick = function () {
                        document.querySelector('.tori_help').style.display = 'none';
                        audioElement.pause();  // 10.mp3 음성 멈춤
                        audioElement.currentTime = 0;  // 음성을 처음부터 다시 재생할 수 있도록 시간 초기화
                        dialogText.onclick();
                    }

                }
                option1.onclick = function () {
                    if (getTalkTutorial() === 'true') {
                        document.querySelector('.tori_help').style.display = 'block'
                        document.querySelector('.tori_help p').innerHTML = '잘했어!<br>이제 네가 선택한 말을<br>따라 해볼까?'
                        // 오디오 요소 생성
                        const audioElement = document.createElement('audio');
                        audioElement.src = './data/audio/12.mp3';  // 12.mp3 파일 경로
                        audioElement.play();  // 12.mp3 파일 재생

                        document.querySelector('.tori_help .next_btn').onclick = function () {
                            document.querySelector('.tori_help').style.display = 'none';
                            audioElement.pause();  // 12.mp3 음성 멈춤
                            audioElement.currentTime = 0;  // 음성을 처음부터 다시 재생할 수 있도록 시간 초기화
                            recordButton.onclick()
                        }
                    } else recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option1.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "그래, 난 이학교의 선생님이야. 앞으로 잘 지내보자";
                            console.log(score);

                            if (getTalkTutorial() === 'true') {
                                document.querySelector('.tori_help').style.display = 'block'
                                document.querySelector('.tori_help p').innerHTML = '정말 잘했어!<br>이렇게 다른 사람들과도 대화할 수 있어!<br>다른 사람들과도 대화를 해보자!<br>분명 다들 너와 대화해보고 싶을거야~'
                                // 오디오 요소 생성
                                const audioElement = document.createElement('audio');
                                audioElement.src = './data/audio/13.mp3';  // 13.mp3 파일 경로
                                audioElement.play();  // 13.mp3 파일 재생
                                document.querySelector('.tori_help .next_btn').onclick = function () {
                                    document.querySelector('.tori_help').style.display = 'none';
                                    audioElement.pause();  // 13.mp3 음성 멈춤
                                    audioElement.currentTime = 0;  // 음성을 처음부터 다시 재생할 수 있도록 시간 초기화
                                    setTalkTutorial('false')
                                }
                            }


                            // const idleAction = this._currentNPCAnimations['idle'];
                            const idleanAction = this._currentNPCAnimations['idle_rightAnswer'];
                            
                            if (idleanAction) {
                                // idleAction
                                // .reset()   // 상태 초기화
                                // .setEffectiveWeight(1) // 동작할 가중치 설정
                                // .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                // .play();   // 재생 시작
                                
                                idleanAction
                                    .reset()
                                    .setEffectiveWeight(1)
                                    .setLoop(THREE.LoopOnce, 1)
                                    .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }


                            document.getElementById('next').onclick = function () {
                                console.log('this:', this); // this가 무엇을 가리키는지 확인
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option1.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                
                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    const oh1Action = this._currentNPCAnimations['oh1'];
                    const oh2Action = this._currentNPCAnimations['oh2'];
                            
                    if (oh1Action && oh2Action) {
                        oh1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                                
                        oh2Action
                            .reset()
                            .setEffectiveWeight(1)
                            .setLoop(THREE.LoopOnce, 1)
                            .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }

                    tori_help.style.display = 'block'

                    if (getTalkTutorial() === 'true') {
                        tori_help_p.innerHTML = "음... 방금 네 행동은<br>선생님께 실례되는 행동이야.<br>선생님과 제대로 마주보고, 인사드려야 해.<br>다시 해볼까?"
                        // 10.mp3 중지, 11.mp3 재생
                        audioElement.pause();
                        audioElement.currentTime = 0;

                        const audioElement = document.createElement('audio');
                        audioElement.src = './data/audio/11.mp3';  // 11.mp3 파일 경로
                        audioElement.play();

                    }else {
                      tori_help_p.innerHTML = "상대방이 인사 했을 때는 너도 인사를 해야해. <br>다른 사람을 대하는 기본적인 예의야. <br><br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도1.mp3';  // 학습지도1.mp3 파일 경로
                    audioElement.play();  // 학습지도1.mp3 파일 재생
                }


                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
        
                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "나는 3학년 2반 선생님이란다..";
                    //여기부터 애니메이션 예시
                    const oh1Action = this._currentNPCAnimations['oh1'];
                    const oh2Action = this._currentNPCAnimations['oh2'];
                    
                    if (oh1Action && oh2Action) {
                        oh1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        oh2Action
                            .reset()
                            .setEffectiveWeight(1)
                            .setLoop(THREE.LoopOnce, 1)
                            .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                        tori_help.style.display = 'block'
                        if (getTalkTutorial() === 'true') {
                        tori_help_p.innerHTML = "음... 방금 네 행동은<br>선생님께 실례되는 행동이야.<br>선생님과 제대로 마주보고, 인사드려야 해.<br>다시 해볼까?"
                        // 10.mp3 중지, 11.mp3 재생
                        audioElement.pause();
                        audioElement.currentTime = 0;
                        const audioElement = document.createElement('audio');
                        audioElement.src = './data/audio/11.mp3';  // 11.mp3 파일 경로
                        audioElement.play();
                    } else {
                        tori_help.style.display = 'block'
                        tori_help_p.innerHTML = " 다른 사람이 인사를 건넸을 때는<br>먼저 인사를 하고, 그 후에 궁금한 점을 <br>물어보는 것이 자연스럽고 예의바른 <br>대화 방식이야. 다시 해보자."
                        const audioElement = document.createElement('audio');
                        audioElement.src = './data/audio/학습지도2.mp3';  // 학습지도2.mp3 파일 경로
                        audioElement.play();  // 학습지도2.mp3 파일 재생
                    }
                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

            } else if (npcType == 'game_friend') {
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "공 놀이하던 친구가 공을 떨어뜨렸다. 주워서 던져 달라고 부른다";
                    option1.innerHTML = "너가 알아서 주워";
                    option2.innerHTML = "그래! 자 잘 받아!";
                    option3.innerHTML = "(그냥 가자)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "뭐? 말이 좀 심하지 않아?";
                    const ugh1Action = this._currentNPCAnimations['ugh1'];
                    const ugh2Action = this._currentNPCAnimations['ugh2'];
                    
                    if (ugh1Action && ugh2Action) {
                        ugh1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        ugh2Action
                            .reset()
                            .setEffectiveWeight(1)
                            .setLoop(THREE.LoopOnce, 1)
                            .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "네 앞에 떨어진 공인데, 주워 줘도 좋을 것 같아.<br>친구와 친해 질 수도 있는 기회 일지도 몰라!<br>한번 다시 해볼까?."
                    
                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                    }.bind(this);
                }.bind(this);
                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "오 공 던지는 솜씨가 제법인걸?";
                            console.log(score);
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                                if (getSTTutorial() === 'true') {
                                    document.getElementById('getsticker').style.display = 'block'
                                    document.querySelector('#getsticker #get').onclick = function () {
                                        document.querySelector('.left').style.display = 'block';
                                        document.querySelector('.left p').innerHTML = '이게 뭐지? 스티커를 얻었어!<br>무슨 스티커일까? 확인해보자!'
                                        // 14.mp3 파일 재생
                                        const audioElement14 = document.createElement('audio');
                                        audioElement14.src = './data/audio/14.mp3';  // 14.mp3 파일 경로
                                        audioElement14.play();  // 14.mp3 재생
                                        document.querySelector('.left .next_btn').onclick = function () {
                                            document.querySelector('.left p').innerHTML = '오른쪽 위에 생긴<br>버튼을 눌러볼래?'
                                            document.getElementById('mypagebtn').style.display = 'block'
                                            document.getElementById('shadow_mp').style.display = 'flex'

                                            // 14.mp3 재생을 멈추고 15.mp3 재생
                                            audioElement14.pause();  // 14.mp3 재생 중지
                                            audioElement14.currentTime = 0;  // 처음으로 되돌림
                                            
                                            // 15.mp3 파일 재생
                                            const audioElement15 = document.createElement('audio');
                                            audioElement15.src = './data/audio/15.mp3';  // 15.mp3 파일 경로
                                            audioElement15.play();  // 15.mp3 재생
                                            // document.getElementById('mypagebtn').style.display = 'block'
                                            // document.querySelector('.tori_help .next_btn').onclick = function () {
                                            //     document.querySelector('.tori_help').style.display = 'none';
                                            // }
                                        }
                                    }
                                    
                                }
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                
        
                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "저기! 내 말 안들렸어?";
                    //여기부터 애니메이션 예시
                    const ugh1Action = this._currentNPCAnimations['ugh1'];
                    const ugh2Action = this._currentNPCAnimations['ugh2'];
                    
                    if (ugh1Action && ugh2Action) {
                        ugh1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        ugh2Action
                            .reset()
                            .setEffectiveWeight(1)
                            .setLoop(THREE.LoopOnce, 1)
                            .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = " 저 친구가 너를 부르고 있어.<br>그냥 가지말고 다시 가보자!"

                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                    }.bind(this);
                }.bind(this);

            } else if (npcType == 'friend_crash') {
    
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "운동장을 걷다가 어깨를 부딪쳤다. 사과를 안하고 지나갔다.";
                    option1.innerHTML = "야! 너 왜 부딪혔는데 사과 안해?";
                    option2.innerHTML = " (기분 나쁜데... 그래도 이번엔 그냥 지나가자.)";
                    option3.innerHTML = "(쫓아가서 어깨를 다시 부딪힌다.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";


                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "몰라! 난 바쁘다고!";

                    //여기부터 애니메이션 예시
                    const shoutAction = this._currentNPCAnimations['shout'];
                    // const idleAction = this._currentNPCAnimations['idle'];///
                    
                    if (shoutAction) {
                        shoutAction
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        // idleAction
                        // .reset()
                        // .setEffectiveWeight(1)
                        // .setLoop(THREE.LoopOnce, 1)
                        // .play();
                        // console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "가끔은 멋지게 상황을 넘기면 편할 때도 많아.<br> 물론 사과를 받으면 좋겠지만, 크게 다치거나<br>하지 않았으니까 그럴 수도 있지 하고<br>넘기는 것도 필요해. 다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도5.mp3';  // 학습지도5.mp3 파일 경로
                    audioElement.play();  // 학습지도5.mp3 파일 재생

                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
        
                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "...";
                            tori_help.style.display = 'block'
                            tori_help_p.innerHTML = "어어? 쟤는 먼저 와서 부딪혀 놓고..<br>그나저나 사과 안하는 쟤는 나빴지만,<br>멋지게 참아주었잖아? 대단한걸? <br><br>"
                            const audioElement = document.createElement('audio');
                            audioElement.src = './data/audio/학습지도6.mp3'; //  학습지도6.mp3 파일 경로
                            audioElement.play(); //  학습지도6.mp3 재생

                            console.log(score);


                            document.getElementById('next_btn').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                                audioElement.pause();
                                audioElement.currentTime = 0;
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "야! 뭐하는 거야!";

                    //여기부터 애니메이션 예시
                    const shoutAction = this._currentNPCAnimations['shout'];
                    // const idleAction = this._currentNPCAnimations['idle'];
                    
                    if (shoutAction) {
                        shoutAction
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        // idleAction
                        // .reset()
                        // .setEffectiveWeight(1)
                        // .setLoop(THREE.LoopOnce, 1)
                        // .play();
                        // console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지


                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "가끔은 멋지게 상황을 넘기면 편할 때도 많아.<br> 물론 사과를 받으면 좋겠지만, 크게 다치거나<br>하지 않았으니까 그럴 수도 있지 하고<br>넘기는 것도 필요해. 다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도5.mp3';  // 학습지도5.mp3 파일 경로
                    audioElement.play();  // 학습지도5.mp3 파일 재생

                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

            } else if (npcType == 'rector') {
    
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "안녕. 어서오렴";
                    option1.innerHTML = "교장선생님은 왜 머리가 없으세요?";
                    option2.innerHTML = "안녕하세요!";
                    option3.innerHTML = "(무시하고 쳐다본다.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";


                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "뭐..?";

                    //여기부터 애니메이션 예시
                    const sup1Action = this._currentNPCAnimations['Surprised01'];
                    const sup2Action = this._currentNPCAnimations['Surprised02'];///
                    
                    if (sup1Action && sup2Action) {
                        sup1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        sup2Action
                            .reset()
                            .setEffectiveWeight(1)
                            .setLoop(THREE.LoopOnce, 1)
                            .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "사람의 외모에 대해 이야기하는 것은 <br>상대방의 기분을 상하게 할 수 있어. <br><br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도3.mp3';  // 학습지도3.mp3 파일 경로
                    audioElement.play();  // 학습지도3.mp3 파일 재생

                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
        
                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "그래, 좋은 하루 보내렴.";
    
                            console.log(score);

                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "허허...";

                    //여기부터 애니메이션 예시
                    const em1Action = this._currentNPCAnimations['embarrassed01'];
                    const em2Action = this._currentNPCAnimations['embarrassed02'];
                    
                    if (em1Action && em2Action) {
                        em1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        em2Action
                            .reset()
                            .setEffectiveWeight(1)
                            .setLoop(THREE.LoopOnce, 1)
                            .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지


                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "상대방이 인사 했을 때는 너도 인사를 해야해. <br>다른 사람을 대하는 기본적인 예의야.<br><br>다시 해보자."
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도4.mp3';  // 학습지도4.mp3 파일 경로
                    audioElement.play();  // 학습지도4.mp3 파일 재생


                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

            } else if (npcType == 'friend_hurt') {
                
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "넘어져서 주져 앉아있다.무릎에 상처가 났다.";
                    option1.innerHTML = "어 피가 난다!";
                    option2.innerHTML = "괜찮아? 아프겠다. 양호실까지 부축해줄까?";
                    option3.innerHTML = "(무시하고 지나간다.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";
                
                
                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "그렇게 말하다니, 내 상처는 구경거리가 아니야!";

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "아파하는 사람에게 그렇게 말하면<br> 자신을 구경거리로 생각하는것 처럼 보여서<br> 기분 나쁠 수 있어. <br>더 적합한 대처를 다시 생각해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도7.mp3';  // 학습지도7.mp3 파일 경로
                    audioElement.play();  // 학습지도7.mp3 파일 재생

                    
                    const sadAction = this._currentNPCAnimations['sad'];
                    // const R2Action = this._currentNPCAnimations['rightA2'];

                    if (sadAction) {
                        sadAction
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        // R2Action
                        // .reset()
                        // .setEffectiveWeight(1)
                        // .setLoop(THREE.LoopOnce, 1)
                        // .play();
                        // console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "괜찮아. 혼자 양호실에 갈게. 걱정해줘서 고마워.";
                            console.log(score);

                            const R1Action = this._currentNPCAnimations['rightA1'];
                            const R2Action = this._currentNPCAnimations['rightA2'];

                            if (R1Action && R2Action) {
                                R1Action
                                    .reset()   // 상태 초기화
                                    .setEffectiveWeight(1) // 동작할 가중치 설정
                                    .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                    .play();   // 재생 시작
                                
                                R2Action
                                    .reset()
                                    .setEffectiveWeight(1)
                                    .setLoop(THREE.LoopOnce, 1)
                                    .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }

                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                

        
                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "아야....";
                    //여기부터 애니메이션 예시
                    
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "다친 친구를 바로 앞에서 마주쳤는데, <br>그냥 지나가기보다는<br>다른 행동을 하는 것이 좋을 것 같아. <br><br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도8.mp3';  // 학습지도8.mp3 파일 경로
                    audioElement.play();  // 학습지도8.mp3 파일 재생
                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
            } else if (npcType == 'grandfather') {
    
                let score = 100;

                function resetModal() {
                    dialogText.innerHTML = "(귀가 잘 안들리는 할아버지이시다.)";  // 초기 대화 내용
                    option1.innerHTML = "안녕하세요.";  // 첫 번째 선택지
                    option2.style.display = 'none';  // 두 번째 선택지는 숨김
                    option3.style.display = 'none';  // 세 번째 선택지도 숨김
                    dialogText.style.display = "block";  // 대화창을 보이게 설정
                    document.getElementById('next').style.display = 'block';  // 'next' 버튼 보이기
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    });
                    buttonGroup.style.display = "none";  // 버튼 그룹은 초기엔 숨김
                }

                resetModal();
                casher.style.display = "block";

                let scene1 = 0;

                option1.onclick = function () {
                    if (scene1 === 0) {
                        document.querySelectorAll('.choose button').forEach(function (button) {
                            button.classList.remove('active');
                        });
                        // 첫 번째 대화 내용과 선택지 변화
                        dialogText.innerHTML = "....응? 뭐라고?";  // 할아버지의 응답
                        option1.innerHTML = "(큰목소리로) 안녕하세요!!";
                        option2.innerHTML = "아 할아버지 귀가 안들리시나봐.";
                        option3.innerHTML = "(큰목소리로) 안녕이라고!";
                        option2.style.display = 'block';  // 두 번째 선택지 보이기
                        option3.style.display = 'block';  // 세 번째 선택지 보이기
                        scene1++;  // scene 상태 증가
                    } else {
                        // 두 번째 대화 내용
                        recordButton.onclick()
                        talkBtnPromise.then(() => {
                            let choose_answer = option1.textContent;
                            // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                            console.log(choose_answer);
                            console.log(getTalkBtn());

                            if (getTalkBtn() === choose_answer) {
                                buttonGroup.style.display = "none";
                                dialogText.innerHTML = "어 그래~ 안녕~";
                                console.log(score);
                            
                                document.getElementById('next').onclick = function () {
                                    casher.style.display = "none";
                                    buttonGroup.style.display = "none";
                                    resetModal();
                                    this._onDialogClosed();
                                    resetplayerposition.call(this);
                                }.bind(this);
                            } else {
                                option1.onclick();
                                // 선택이 맞지 않으면 다시 실행
                            }
                        });
                    }
                }.bind(this);

                function resetModal2() {
                    option1.innerHTML = "안녕하세요!!";  // 첫 번째 선택지
                    option2.innerHTML = "아 할아버지 귀가 안들리시나봐.";
                    option3.innerHTML = "(큰목소리로) 안녕이라고!";
                    option2.style.display = 'block';  // 두 번째 선택지 보이기
                    option3.style.display = 'block';  // 세 번째 선택지 보이기
                    dialogText.style.display = "block";  // 대화창을 보이게 설정
                    document.getElementById('next').style.display = 'block';  // 'next' 버튼 보이기
                    document.querySelectorAll('.choose button').forEach(function (button) {
                        button.classList.remove('active');
                    });
                    // buttonGroup.style.display = "none";  // 버튼 그룹은 초기엔 숨김
                    count = 0;
                }

                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "으응? 뭐라고?";
                    //여기부터 애니메이션 예시
                    const wrrrrongg1Action = this._currentNPCAnimations['wrongA1'];
                    const wrrrrongg2Action = this._currentNPCAnimations['wrongB'];
        
                    if (wrrrrongg1Action && wrrrrongg2Action) {
                        wrrrrongg1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        wrrrrongg2Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "귀가 안좋으시다고 그런식으로 말하면<br>예의에 어긋나는 말이야.<br><br>다시 해보자."
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도15.mp3';  // 학습지도15.mp3 파일 경로
                    audioElement.play();  // 학습지도15.mp3 파일 재생
                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal2();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "아이쿠 녀석, 그래 안녕~";
                    //여기부터 애니메이션 예시

                    const wrrrrongg1Action = this._currentNPCAnimations['wrongA1'];
                    const wrrrrongg3Action = this._currentNPCAnimations['wrongA2'];

                    if (wrrrrongg1Action && wrrrrongg3Action) {
                        wrrrrongg1Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        
                        wrrrrongg3Action
                            .reset()   // 상태 초기화
                            .setEffectiveWeight(1) // 동작할 가중치 설정
                            .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                            .play();   // 재생 시작
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "어르신분들께 예의를 갖추어야 해. <br>소리를 잘 못 들으신다고 타박하듯이 <br>이야기하면 상대방이 곤란해할 수 있어. <br><br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도16.mp3';  // 학습지도16.mp3 파일 경로
                    audioElement.play();  // 학습지도16.mp3 파일 재생
                    tori_next.onclick = function () {
                        tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal2();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
            } else if (npcType === "town_chief") {
                game_name = "House";
                var modal = document.getElementById("myModal");
                var span = document.getElementsByClassName("close")[0];
                modal.style.display = "block";
                var gameAButton = document.getElementById("Game");
                gameAButton.setAttribute('data-path', 'House_fin/index.html'); // data-path 속성 설정
                var close = document.getElementById('closeGameModal')

                function resetModal() {
                    document.querySelector('#myModal .Speech1 p').innerHTML = '마을 사람들과의 추억이 담긴 사진들인데 한번 볼래?';
                    document.querySelector('#myModal .Speech1 #Game').innerHTML = '네, 한번 보고싶어요!';
                    document.querySelector('#myModal .Speech1 #GameNo').innerHTML = '나중에 보러 올게요.';
                }
                resetModal();
                function resetModalGame() {
                    document.querySelectorAll('.GameBtn').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                // 닫기 버튼 클릭 시 모달 닫기
                close.onclick = function () {
                    modal.style.display = "none";
                    resetModalGame();
                    if (getDTTutorial() === 'true') {
                        document.querySelector('.left').style.display = 'block'
                        document.querySelector('.left p').innerHTML = '멋진 플레이였어!<br>방금 너의 활약을 마이페이지에서<br>다시 해볼 수 있어!'
                        
                        // 26.mp3 재생
                        const audioElement16 = document.createElement('audio');
                        audioElement16.src = './data/audio/26.mp3';  // 26.mp3 파일 경로
                        audioElement16.play();

                        const originalOnClick = document.querySelector('#mypagebtn').onclick;
                        document.querySelector('#mypagebtn').onclick = function () {
                            if (originalOnClick) originalOnClick(); // 기존의 기능을 수행
                            document.querySelector('.left').style.display = 'none'
                            setTimeout(() => {
                                document.querySelector('.left').style.display = 'block'
                                document.getElementById('shadow_mp').style.display = 'flex'
                                document.querySelector('.left p').innerHTML = '데이터를 눌러 확인해보자!'
                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/225.png')";
                                
                                // 26.mp3 중지, 27.mp3 재생
                                audioElement.pause();
                                audioElement.currentTime = 0;

                                // 27.mp3 재생
                                const audioElement = document.createElement('audio');
                                audioElement.src = './data/audio/27.mp3';  // 27.mp3 파일 경로
                                audioElement.play();

                                const originalOnClick2 = document.querySelector('#data').onclick;
                                document.querySelector('#data').onclick = function () {
                                    if (originalOnClick2) originalOnClick2(); // 기존의 기능을 수행
                                    document.querySelector('.left').style.display = 'none'
                                    document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";
                                    setTimeout(() => {
                                        document.querySelector('.tori_help').style.display = 'block'
                                        document.querySelector('.tori_help p').innerHTML = '데이터는 활동 데이터와<br>대화 데이터 둘로 나뉘어!'
                                        
                                        // 27.mp3 중지, 28.mp3 재생
                                        audioElement.pause();
                                        audioElement.currentTime = 0;

                                        // 28.mp3 재생
                                        const audioElement = document.createElement('audio');
                                        audioElement.src = './data/audio/28.mp3';  // 28.mp3 파일 경로
                                        audioElement.play();

                                        document.querySelector('.tori_help .next_btn').onclick = function () {
                                            document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/229.png')";
                                            document.querySelector('.tori_help p').innerHTML = '방금 획득한 활동 점수는<br>활동데이터에서 볼 수 있고,'
                                            
                                            // 28.mp3 중지, 29.mp3 재생
                                            audioElement.pause();
                                            audioElement.currentTime = 0;

                                            // 29.mp3 재생
                                            const audioElement = document.createElement('audio');
                                            audioElement.src = './data/audio/29.mp3';  // 29.mp3 파일 경로
                                            audioElement.play();
                                            
                                            document.querySelector('.tori_help .next_btn').onclick = function () {
                                                document.querySelector('.left').style.display = 'block'
                                                document.querySelector('.tori_help').style.display = 'none'
                                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/227.png')";
                                                document.querySelector('.left p').innerHTML = '사람들과 나눈 대화는<br>대화 데이터에서 확인할 수 있어!'

                                                // 29.mp3 중지, 30.mp3 재생
                                                audioElement.pause();
                                                audioElement.currentTime = 0;

                                                // 30.mp3 재생
                                                const audioElement = document.createElement('audio');
                                                audioElement.src = './data/audio/30.mp3';  // 30.mp3 파일 경로
                                                audioElement.play();
                                                document.querySelector('.left .next_btn').onclick = function () {
                                                    document.querySelector('.left p').innerHTML = '보고 싶은 데이터를<br>한번 클릭해봐!'

                                                    // 30.mp3 중지, 31.mp3 재생
                                                    audioElement16.pause();
                                                    audioElement16.currentTime = 0;

                                                    // 31.mp3 재생
                                                    const audioElement = document.createElement('audio');
                                                    audioElement.src = './data/audio/31.mp3';  // 3.mp3 파일 경로
                                                    audioElement.play();
                                                    document.querySelector('.left .next_btn').onclick = function () {
                                                        document.querySelector('.left').style.display = 'none'
                                                        document.getElementById('shadow_mp').style.display = 'none'
                                                        document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";

                                                        setDTTutorial('false');
                                                    }
                                                }
                                            }
                                        }
                                    }, 500);
                                }
                }, 500); // 0.1초 지연 후 대화창 띄우기 (필요에 따라 
                        }
                    }
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // "좋아!" 버튼 클릭 시 동작
                gameAButton.onclick = function () {
                    console.log("게임 선택됨");
                    modal.style.display = "none";
                    resetModalGame();
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // "다음에 하자" 버튼 클릭 시 모달 닫기
                document.getElementById("GameNo").onclick = function () {
                    console.log('close')
                    modal.style.display = "none";
                    resetModalGame();
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // 선택지 1 클릭 시 동작
                document.getElementById("option1").onclick = function () {
                    console.log("선택지 1 선택됨");
                    modal.style.display = "none";
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // 모달 창 바깥 영역 클릭 시 모달 닫기
                window.onclick = function (event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                        this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                        // resetplayerposition.call(this);
                    }
                }.bind(this);
        } else if (npcType === "library_game") {
                game_name = "Library";
                var modal = document.getElementById("myModal");
                var span = document.getElementsByClassName("close")[0];
                modal.style.display = "block";
                var gameAButton = document.getElementById("Game");
                gameAButton.setAttribute('data-path', 'Library_fin/index.html'); // data-path 속성 설정
                var close = document.getElementById('closeGameModal')

                function resetModal() {
                    document.querySelector('#myModal .Speech1 p').innerHTML = '사람들의 독서 후기를 정리하고 있는데, 도와주지 않을래?';
                    document.querySelector('#myModal .Speech1 #Game').innerHTML = '네, 도와드릴게요!';
                    document.querySelector('#myModal .Speech1 #GameNo').innerHTML = '다음에 도와드릴게요.';
                }
                resetModal();
                function resetModalGame() {
                    document.querySelectorAll('.GameBtn').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                // 닫기 버튼 클릭 시 모달 닫기
                close.onclick = function () {
                    modal.style.display = "none";
                    resetModalGame();
                    if (getDTTutorial() === 'true') {
                        document.querySelector('.left').style.display = 'block'
                        document.querySelector('.left p').innerHTML = '멋진 플레이였어!<br>방금 너의 활약을 마이페이지에서<br>다시 해볼 수 있어!'
                        
                        // 26.mp3 재생
                        const audioElement16 = document.createElement('audio');
                        audioElement16.src = './data/audio/26.mp3';  // 26.mp3 파일 경로
                        audioElement16.play();

                        const originalOnClick = document.querySelector('#mypagebtn').onclick;
                        document.querySelector('#mypagebtn').onclick = function () {
                            if (originalOnClick) originalOnClick(); // 기존의 기능을 수행
                            document.querySelector('.left').style.display = 'none'
                            setTimeout(() => {
                                document.querySelector('.left').style.display = 'block'
                                document.getElementById('shadow_mp').style.display = 'flex'
                                document.querySelector('.left p').innerHTML = '데이터를 눌러 확인해보자!'
                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/225.png')";
                                
                                // 26.mp3 중지, 27.mp3 재생
                                audioElement.pause();
                                audioElement.currentTime = 0;

                                // 27.mp3 재생
                                const audioElement = document.createElement('audio');
                                audioElement.src = './data/audio/27.mp3';  // 27.mp3 파일 경로
                                audioElement.play();

                                const originalOnClick2 = document.querySelector('#data').onclick;
                                document.querySelector('#data').onclick = function () {
                                    if (originalOnClick2) originalOnClick2(); // 기존의 기능을 수행
                                    document.querySelector('.left').style.display = 'none'
                                    document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";
                                    setTimeout(() => {
                                        document.querySelector('.tori_help').style.display = 'block'
                                        document.querySelector('.tori_help p').innerHTML = '데이터는 활동 데이터와<br>대화 데이터 둘로 나뉘어!'
                                        
                                        // 27.mp3 중지, 28.mp3 재생
                                        audioElement.pause();
                                        audioElement.currentTime = 0;

                                        // 28.mp3 재생
                                        const audioElement = document.createElement('audio');
                                        audioElement.src = './data/audio/28.mp3';  // 28.mp3 파일 경로
                                        audioElement.play();

                                        document.querySelector('.tori_help .next_btn').onclick = function () {
                                            document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/229.png')";
                                            document.querySelector('.tori_help p').innerHTML = '방금 획득한 활동 점수는<br>활동데이터에서 볼 수 있고,'
                                            
                                            // 28.mp3 중지, 29.mp3 재생
                                            audioElement.pause();
                                            audioElement.currentTime = 0;

                                            // 29.mp3 재생
                                            const audioElement = document.createElement('audio');
                                            audioElement.src = './data/audio/29.mp3';  // 29.mp3 파일 경로
                                            audioElement.play();
                                            
                                            document.querySelector('.tori_help .next_btn').onclick = function () {
                                                document.querySelector('.left').style.display = 'block'
                                                document.querySelector('.tori_help').style.display = 'none'
                                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/227.png')";
                                                document.querySelector('.left p').innerHTML = '사람들과 나눈 대화는<br>대화 데이터에서 확인할 수 있어!'

                                                // 29.mp3 중지, 30.mp3 재생
                                                audioElement.pause();
                                                audioElement.currentTime = 0;

                                                // 30.mp3 재생
                                                const audioElement = document.createElement('audio');
                                                audioElement.src = './data/audio/30.mp3';  // 30.mp3 파일 경로
                                                audioElement.play();
                                                document.querySelector('.left .next_btn').onclick = function () {
                                                    document.querySelector('.left p').innerHTML = '보고 싶은 데이터를<br>한번 클릭해봐!'

                                                    // 30.mp3 중지, 31.mp3 재생
                                                    audioElement16.pause();
                                                    audioElement16.currentTime = 0;

                                                    // 31.mp3 재생
                                                    const audioElement = document.createElement('audio');
                                                    audioElement.src = './data/audio/31.mp3';  // 3.mp3 파일 경로
                                                    audioElement.play();
                                                    document.querySelector('.left .next_btn').onclick = function () {
                                                        document.querySelector('.left').style.display = 'none'
                                                        document.getElementById('shadow_mp').style.display = 'none'
                                                        document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";

                                                        setDTTutorial('false');
                                                    }
                                                }
                                            }
                                        }
                                    }, 500);
                                }
                }, 500); // 0.1초 지연 후 대화창 띄우기 (필요에 따라 
                        }
                    }
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // "좋아!" 버튼 클릭 시 동작
                gameAButton.onclick = function () {
                    console.log("게임 선택됨");
                    modal.style.display = "none";
                    resetModalGame();
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // "다음에 하자" 버튼 클릭 시 모달 닫기
                document.getElementById("GameNo").onclick = function () {
                    console.log('close')
                    modal.style.display = "none";
                    resetModalGame();
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // 선택지 1 클릭 시 동작
                document.getElementById("option1").onclick = function () {
                    console.log("선택지 1 선택됨");
                    modal.style.display = "none";
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // 모달 창 바깥 영역 클릭 시 모달 닫기
                window.onclick = function (event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                        this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                        // resetplayerposition.call(this);
                    }
                }.bind(this);
            } else if (npcType == 'book_friend') {
    
               let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "키가 작아서 책을 못 꺼내고 있다.";
                    option1.innerHTML = "저 책 꺼내려는거니? 도와줄까?";
                    option2.innerHTML = "너 키가 작네?";
                    option3.innerHTML = "(일단 갈길을 간다.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";   

                option1.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option1.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "와 정말 감사합니다!";
                            console.log(score);

                            const th1Action = this._currentNPCAnimations['thanks1'];
                            const th2Action = this._currentNPCAnimations['thanks2'];

                            if (th1Action && th2Action) {
                                th1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                th2Action
                                .reset()
                                .setEffectiveWeight(1)
                                .setLoop(THREE.LoopOnce, 1)
                                .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }

                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option1.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                
                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "너 키가 작네?";

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "상황에 따라 상대방에게 건넬 수 있는 말이<br>다르다는 것을 이해해야 해! <br>갑자기 남의 신체를 이야기하는 것은 <br>자연스럽지 못한 것 같아. <br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도10.mp3';  // 학습지도10.mp3 파일 경로
                    audioElement.play();  // 학습지도10.mp3 파일 재생
                    const ag1Action = this._currentNPCAnimations['angry1'];
                    const ag2Action = this._currentNPCAnimations['angry2'];

                    if (ag1Action && ag2Action) {
                        ag1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        ag2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
        
                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "아야....";
                    //여기부터 애니메이션 예시
                    
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "저 친구가 책을 꺼내기 힘들어하는 것 같아.<br>우리가 도울 수 있을 것 같지 않니?<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도11.mp3';  // 학습지도11.mp3 파일 경로
                    audioElement.play();  // 학습지도11.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
            } else if (npcType == 'read') {
    
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "재밌어 보이는 만화책을 읽고 있다. 한번 보고 싶다.";
                    option1.innerHTML = "책 빨리 반납해주세요. 저도 읽고 싶어요.";
                    option2.innerHTML = "그거 나 줬으면 좋겠다.";
                    option3.innerHTML = "(조용히 제목을 보고 책을 찾으러 가자.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";   

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "네? 아직 제가 읽고 있는 걸요? 그리고 이 책은 저쪽 책장에 가면 더 있어요...";
                    //여기부터 애니메이션 예시
                    const wg1Action = this._currentNPCAnimations['wrongA1'];
                    const wg2Action = this._currentNPCAnimations['wrongA2'];

                    if (wg1Action && wg2Action) {
                        wg1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        wg2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    //여기까지
                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "읽고 있는 책이 네 것도 아닌데 <br>그렇게 말하면 안돼.<br><br>더 좋은 방법을 생각해 보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도12.mp3';  // 학습지도12.mp3 파일 경로
                    audioElement.play();  // 학습지도12.mp3 파일 재생

                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "네? 아..이 책과 같은 책은 저쪽에 가면 찾을 수 있어요..";

                    const wg1Action = this._currentNPCAnimations['wrongA1'];
                    const wg2Action = this._currentNPCAnimations['wrongA2'];

                    if (wg1Action && wg2Action) {
                        wg1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        wg2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "읽고 있는 책이 네 것도 아닌데 <br>달라고 하면 안돼. <br><br>더 좋은 방법을 생각해 보자. <br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도12.mp3';  // 학습지도12.mp3 파일 경로
                    audioElement.play();  // 학습지도12.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option3.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option3.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "와 정말 감사합니다!";
                            console.log(score);

                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option3.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
            
        
                
            } else if (npcType == 'glass') {
                
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "안경과 필통을 떨어트려서 곤란해하는 학생이 있다.";
                    option1.innerHTML = "(피해서 갈 길을 간다.)";
                    option2.innerHTML = "안경 여기있어요.";
                    option3.innerHTML = "안경 여기 있어요. 다른 물건들도 도와 드릴게요.  ";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";   

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "감사합니다.";

                  
                    const rh1Action = this._currentNPCAnimations['rightA1'];
                    const rh2Action = this._currentNPCAnimations['rightA2'];

                    if (rh1Action && rh2Action) {
                        rh1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작

                        rh2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "안경을 주워준건 정말 좋은 행동이야. <br>하지만 안경뿐만 아니라 떨어진 다른 물건도 <br>같이 주워서 도와주는건 어떨까?<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도9.mp3';  // 학습지도9.mp3 파일 경로
                    audioElement.play();  // 학습지도9.mp3 파일 재생


                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option3.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option3.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "정말 감사합니다!";
                            console.log(score);

                            const rh1Action = this._currentNPCAnimations['rightA1'];
                            const rh2Action = this._currentNPCAnimations['rightA2'];
        
                            if (rh1Action && rh2Action) {
                                rh1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                rh2Action
                                .reset()
                                .setEffectiveWeight(1)
                                .setLoop(THREE.LoopOnce, 1)
                                .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        

                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option3.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

            } else if (npcType == 'library_searching') {
                
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "독서 검색대를 사용하려고 하는데 이미 이용하는 사람이 있다.";
                    option1.innerHTML = "(뒤에서 기다린다)";
                    option2.innerHTML = "빨리 하면 안될까요?";
                    option3.innerHTML = "내가 먼저 검색대 써도 될까요?";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  
                
                option1.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option1.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "아, 저는 이제 다 썼어요.";
                            console.log(score);

                            const rha1Action = this._currentNPCAnimations['rightA1'];
                            const rha2Action = this._currentNPCAnimations['rightA2'];
        
                            if (rha1Action && rha2Action) {
                                rha1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                rha2Action
                                .reset()
                                .setEffectiveWeight(1)
                                .setLoop(THREE.LoopOnce, 1)
                                .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option1.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "네? 잠시만요..허...";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    const wro1Action = this._currentNPCAnimations['wrongA1'];
                    const wro2Action = this._currentNPCAnimations['wrongA2'];

                    if (wro1Action && wro2Action) {
                        wro1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        wro2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "저 분이 먼저 와서 이용하고 있는 건데 <br>재촉하는 것은 상대방의 기분을 상하게 해. <br><br>다르게 행동해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도13.mp3';  // 학습지도13.mp3 파일 경로
                    audioElement.play();  // 학습지도13.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "예? 금방해요. 잠시만요.";

                    const wro1Action = this._currentNPCAnimations['wrongA1'];
                    const wro2Action = this._currentNPCAnimations['wrongA2'];

                    if (wro1Action && wro2Action) {
                        wro1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        wro2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "저 분이 먼저 와서 이용하고 있는 건데, <br>타당한 이유도 없이 먼저 쓰게 <br>해달라고 하면 안돼. <br><br>다르게 행동해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도14.mp3';  // 학습지도14.mp3 파일 경로
                    audioElement.play();  // 학습지도14.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                

            } else if (npcType == '부녀회장') {
    
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "근처 화분에 물을 주고 계신다. 물이 조금 튀었다.";
                    option1.innerHTML = "물 튀었잖아요, 사과하세요!";
                    option2.innerHTML = "괜찮아요, 많이 안튀었는걸요";
                    option3.innerHTML = "아 짜증나! 물 튀기잖아요!";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "어어.. 미안하구나. 물이 옷에 많이 묻었니?";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    const wron1Action = this._currentNPCAnimations['wrongA'];

                    if (wron1Action) {
                        wron1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "상대방도 실수를 저질러 당황했을 거야.<br>그렇기 때문에 우리는 상대방의 작은 실수는 <br>너그럽게 받아들일 줄도 알아야 해.<br><br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도17.mp3';  // 학습지도17.mp3 파일 경로
                    audioElement.play();  // 학습지도17.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "정말 미안하구나. 아줌마가 실수했어. 다음에는 조심하도록 하마.";
                            console.log(score);

                            const rhig1Action = this._currentNPCAnimations['rightA'];
        
                            if (rhig1Action) {
                                rhig1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

               

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "어어.. 미안하구나. 물이 옷에 많이 묻었니?";

                    const wron1Action = this._currentNPCAnimations['wrongA'];

                    if (wron1Action) {
                        wron1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "상대방의 작은 실수에 크게 화를 내면<br>상대방과의 사이가 멀어질 수 있어.<br>상대방의 작은 실수도 너그럽게<br> 받아들일 줄도 알아야 해. 다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도18.mp3';  // 학습지도18.mp3 파일 경로
                    audioElement.play();  // 학습지도18.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
                
               
            } else if (npcType == '할머니') {

                let score = 100;
                function resetModal() {
                    
                    dialogText.innerHTML = "아가야, 할아버지 저쪽에 계시니?";
                    option1.innerHTML = "응";
                    option2.innerHTML = "잘 모르겠어요.";
                    option3.innerHTML = "네, 저쪽방에 계세요!";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "으응, 그래서 어디 계시는데?";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    const wronn1Action = this._currentNPCAnimations['wrongA'];

                    if (wronn1Action) {
                        wronn1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "어른에게 대답할때는 존댓말을 써야지.<br><br>그리고 그 질문에는 <br>더 구체적으로 대답해보는게 어때?<br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도19.mp3';  // 학습지도19.mp3 파일 경로
                    audioElement.play();  // 학습지도19.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "그려? 한번 들어가봐야겠구나.";
                            console.log(score);

                            const righ1Action = this._currentNPCAnimations['rightA'];
        
                            if (righ1Action) {
                                righ1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

               

                option3.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option3.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "아이고, 그래? 한참을 찾았지 뭐니.";
                            console.log(score);

                            const righ1Action = this._currentNPCAnimations['rightA'];
        
                            if (righ1Action) {
                                righ1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option3.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)
                

            } else if (npcType == 'grandmother_child') {
    
                dialogText.innerHTML = "종이 접기를 하는 6살 할머니 손녀, 모양새가 예쁘지 않다.";
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "내가 접은 학 이쁘지?";
                    option1.innerHTML = "아니, 여기가 너무 구겨졌어.";
                    option2.innerHTML = "내가 더 잘 해. 줘 봐!";
                    option3.innerHTML = "잘 만들었다. 다음에 내 것도 접어줄래?";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "뭐? 그치만 열심히 접었는데..";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    const wronng1Action = this._currentNPCAnimations['wrongA'];

                    if (wronng1Action) {
                        wronng1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "다름 사람이 열심히 한 결과물에<br>잘못된 점을 먼저 짚는 것은<br>상대방을 기분 상하게 할 수 있어.<br><br>다르게 대답해보자.<br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도20.mp3';  // 학습지도20.mp3 파일 경로
                    audioElement.play();  // 학습지도20.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "앗, 내가 접은건데!";

                    const wronng1Action = this._currentNPCAnimations['wrongA'];

                    if (wronng1Action) {
                        wronng1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "다른 사람의 물건을 동의도 없이<br> 가져가도 안되고 네가 잘할 수 있다고 해서<br>부탁도 없이 나서는건 좋지 않아.<br><br>다시 해보자.<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도21.mp3';  // 학습지도21.mp3 파일 경로
                    audioElement.play();  // 학습지도21.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
                
                option3.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option3.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "좋아! 나중에 접어줄게.";
                            console.log(score);

                            const rhightt1Action = this._currentNPCAnimations['rightA'];
        
                            if (rhightt1Action) {
                                rhightt1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option3.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

               
            // 공원


            } else if(npcType == 'warning'){
                // dialogText.innerHTML = "종이 접기를 하는 6살 할머니 손녀, 모양새가 예쁘지 않다.";
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "오리가 사는 호숫가에 오리 먹이 판매 100원 표지판이 있다.";
                    option1.innerHTML = "(오리에게 100원을 준다.)";
                    option2.innerHTML = "(오리 먹이가 100원에 판매된다.)";
                    option3.innerHTML = "(주변의 잔디를 뜯어서 주자.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "오리는 100원을 먹을 수 없어!<br><br>다시 생각해보자.<br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도24.mp3';  // 학습지도24.mp3 파일 경로
                    audioElement.play();  // 학습지도24.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "...";
                            console.log(score);

                            tori_help.style.display = 'block'
                            tori_help_p.innerHTML = "우리 오리먹이를 사서 오리한테 줘볼까?"
                            const audioElement = document.createElement('audio');
                            audioElement.src = './data/audio/학습지도25.mp3';  // 학습지도25.mp3 파일 경로
                            audioElement.play();  // 학습지도25.mp3 파일 재생
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                                audioElement.pause();
                                audioElement.currentTime = 0;
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "공원의 잔디는 함부로 뜯으면 안돼!<br>식물을 훼손하는 짓은 좋은 행동이 아니야."
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도26.mp3';  // 학습지도26.mp3 파일 경로
                    audioElement.play();  // 학습지도26.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

            } else if(npcType == 'fountain'){
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "안내: 분수대 안에 동전을 던지지 마세요.";
                    option1.innerHTML = "분수대 안에 들어가서 물장구 치자.";
                    option2.innerHTML = "와, 분수대가 멋지고 시원하다.";
                    option3.innerHTML = "물수제비 해볼까? 돌을 던져보자.";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "이 분수대는 조경용이지<br>안에서 놀라고 만들어진 곳이 아니야. <br>공공 시설에서는 규칙을 지켜야해.<br> 다시 생각해보자.<br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도29.mp3';  // 학습지도29.mp3 파일 경로
                    audioElement.play();  // 학습지도29.mp3 파일 재생

                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "...";
                            console.log(score);

                            tori_help.style.display = 'block'
                            tori_help_p.innerHTML = "그러네! 가까이 있으니까<br>마음까지 시원해지는 느낌이야."
                            const audioElement = document.createElement('audio');
                            audioElement.src = './data/audio/학습지도30.mp3';  // 학습지도30.mp3 파일 경로
                            audioElement.play();  // 학습지도30.mp3 파일 재생
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                                audioElement.pause();
                                audioElement.currentTime = 0;
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "안돼!<br>여기 표지판에 동전을 던지지 말라고 했지만,<br>다른 물건도 던지면 안돼. <br><br>다르게 행동해보자."
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도31.mp3';  // 학습지도31.mp3 파일 경로
                    audioElement.play();  // 학습지도31.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

            } else if(npcType == 'fall_item'){
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "가방에서 지갑을 떨어트린 사람을 보았다.";
                    option1.innerHTML = "저기요. 지갑 떨어트리셨어요!";
                    option2.innerHTML = "아싸, 땡잡았다!";
                    option3.innerHTML = "(모른 체하고 지나가자.)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";  
                
                option1.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option1.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "어머, 내 정신 좀 봐. 알려줘서 고마워요~";
                            console.log(score);

                            const rhigig1Action = this._currentNPCAnimations['rightA1'];
                            const rhigig2Action = this._currentNPCAnimations['rightA2'];
        
                            if (rhigig1Action && rhigig2Action) {
                                rhigig1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                rhigig2Action
                                .reset()
                                .setEffectiveWeight(1)
                                .setLoop(THREE.LoopOnce, 1)
                                .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        
                            
                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option1.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

                option2.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = " 잠깐, 잠깐! 상대방이 떨어트린 물건을<br>멋대로 가져가는 것은 옳지 못한 행동이야! <br><br>자, 어떻게 해야할까?<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도22.mp3';  // 학습지도22.mp3 파일 경로
                    audioElement.play();  // 학습지도22.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "(모른 체하고 지나가자.)";

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "지갑이 떨어진 걸 보고도 모른 체하다니!<br>지갑을 잃어버려서 당황해 할 사람을 생각해봐.<br>속상해 할거야. <br><br>어떻게 해야할까?<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도23.mp3';  // 학습지도23.mp3 파일 경로
                    audioElement.play();  // 학습지도23.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);
            } else if(npcType == 'fall_item_man'){ // 물건 떨군 맨
                let score = 100;
                function resetModal() {
                    dialogText.innerHTML = "반려견과 산책중인 아저씨가 있다.";
                    option1.innerHTML = "(강아지에게 달려들기)";
                    option2.innerHTML = "안녕하세요. 강아지한테 인사해도 될까요?";
                    option3.innerHTML = "(강아지 쓰다듬기)";
                    dialogText.style.display = "block";
                    document.getElementById('next').style.display = 'block'
                    document.querySelectorAll('.choose button').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                resetModal();
                casher.style.display = "block";   

                option1.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "...";

                    // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                    const wrrrong1Action = this._currentNPCAnimations['wrongA1'];
                    const wrrrong2Action = this._currentNPCAnimations['wrongA2'];

                    if (wrrrong1Action && wrrrong2Action) {
                        wrrrong1Action
                        .reset()   // 상태 초기화
                        .setEffectiveWeight(1) // 동작할 가중치 설정
                        .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                        .play();   // 재생 시작
                        
                        wrrrong2Action
                        .reset()
                        .setEffectiveWeight(1)
                        .setLoop(THREE.LoopOnce, 1)
                        .play();
                        console.log("Playing animations simultaneously.");
                    } else {
                        console.error("One or both animations not found in the animationsMap.");
                    }

                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "강아지에게 갑자기 달려가면<br>놀란 강아지에게 물릴 수도 있어서 위험해. <br><br>다시 생각 해보자<br><br>"
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도27.mp3';  // 학습지도27.mp3 파일 경로
                    audioElement.play();  // 학습지도27.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

                option2.onclick = function () {
                    recordButton.onclick()
                    talkBtnPromise.then(() => {
                        let choose_answer = option2.textContent;
                        // let message = `대화 상대가 ${npc_name.textContent}이고 질문이 ${dialogText.textContent} 일때, 선택지는 ${option1.textContent}, ${option2.textContent}, ${option3.textContent}가 있다. 그리고 아이가 고른 선택지는 ${choose_answer}이다.`;

                        console.log(choose_answer);
                        console.log(getTalkBtn());

                        if (getTalkBtn() === choose_answer) {
                            buttonGroup.style.display = "none";
                            dialogText.innerHTML = "허허 그래, 일단 앉아서 천천히 손을 내밀어 보렴.";
                            console.log(score);

                            const rhiight1Action = this._currentNPCAnimations['rightA1'];
                            const rhiight2Action = this._currentNPCAnimations['rightA2'];
        
                            if (rhiight1Action && rhiight2Action) {
                                rhiight1Action
                                .reset()   // 상태 초기화
                                .setEffectiveWeight(1) // 동작할 가중치 설정
                                .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                                .play();   // 재생 시작
                                
                                rhiight2Action
                                .reset()
                                .setEffectiveWeight(1)
                                .setLoop(THREE.LoopOnce, 1)
                                .play();
                                console.log("Playing animations simultaneously.");
                            } else {
                                console.error("One or both animations not found in the animationsMap.");
                            }
                        

                            document.getElementById('next').onclick = function () {
                                casher.style.display = "none";
                                buttonGroup.style.display = "none";
                                resetModal();
                                this._onDialogClosed();
                                resetplayerposition.call(this);
                            }.bind(this);
                        } else {
                            option2.onclick();
                            // 선택이 맞지 않으면 다시 실행
                        }
                    });
                }.bind(this)

                option3.onclick = function () {
                    // dialogText.style.display = "block";
                    // buttonGroup.style.display = "none";
                    dialogText.innerHTML = "아이고, 손을 그렇게 뻗으면 강아지가 놀란단다.";

                  
                   // 일정 시간 후 talk_btn 값이 설정되었을 때 비교
                   const wrrrong1Action = this._currentNPCAnimations['wrongA1'];
                   const wrrrong2Action = this._currentNPCAnimations['wrongA2'];

                   if (wrrrong1Action && wrrrong2Action) {
                       wrrrong1Action
                       .reset()   // 상태 초기화
                       .setEffectiveWeight(1) // 동작할 가중치 설정
                       .setLoop(THREE.LoopOnce, 1) // 1번만 재생
                       .play();   // 재생 시작
                       
                       wrrrong2Action
                       .reset()
                       .setEffectiveWeight(1)
                       .setLoop(THREE.LoopOnce, 1)
                       .play();
                       console.log("Playing animations simultaneously.");
                   } else {
                       console.error("One or both animations not found in the animationsMap.");
                   }
                    tori_help.style.display = 'block'
                    tori_help_p.innerHTML = "갑자기 만지려고 하면 놀란 강아지에게<br>물릴 수도 있어서 위험해.<br><br>다시 생각 해보자."
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/학습지도28.mp3';  // 학습지도28.mp3 파일 경로
                    audioElement.play();  // 학습지도28.mp3 파일 재생
                    tori_next.onclick = function () {
                    tori_help.style.display = 'none'
                        score = score - 20;
                        resetModal();
                        audioElement.pause();
                        audioElement.currentTime = 0;
                    }.bind(this);
                }.bind(this);

            } else if (npcType == 'park_game') {
                game_name = "Park";
                var modal = document.getElementById("myModal");
                var span = document.getElementsByClassName("close")[0];
                modal.style.display = "block";
                var gameAButton = document.getElementById("Game");
                gameAButton.setAttribute('data-path', 'Library_fin/index.html'); // data-path 속성 설정
                var close = document.getElementById('closeGameModal')

                function resetModal() {
                    document.querySelector('#myModal .Speech1 p').innerHTML = '지금 사람들의 캐리커쳐를 그리는 중이야. 혹시 캐리커쳐 그리기를 도와줄 수 있니?';
                    document.querySelector('#myModal .Speech1 #Game').innerHTML = '좋아! 도와줄게!';
                    document.querySelector('#myModal .Speech1 #GameNo').innerHTML = '나중에 도와줄게.';
                }
                resetModal();
                function resetModalGame() {
                    document.querySelectorAll('.GameBtn').forEach(function(button) {
                        button.classList.remove('active');
                    })
                }
                // 닫기 버튼 클릭 시 모달 닫기
                close.onclick = function () {
                    modal.style.display = "none";
                    resetModalGame();
                    if (getDTTutorial() === 'true') {
                        document.querySelector('.left').style.display = 'block'
                        document.querySelector('.left p').innerHTML = '멋진 플레이였어!<br>방금 너의 활약을 마이페이지에서<br>다시 해볼 수 있어!'
                        
                        // 26.mp3 재생
                        const audioElement16 = document.createElement('audio');
                        audioElement16.src = './data/audio/26.mp3';  // 26.mp3 파일 경로
                        audioElement16.play();

                        const originalOnClick = document.querySelector('#mypagebtn').onclick;
                        document.querySelector('#mypagebtn').onclick = function () {
                            if (originalOnClick) originalOnClick(); // 기존의 기능을 수행
                            document.querySelector('.left').style.display = 'none'
                            setTimeout(() => {
                                document.querySelector('.left').style.display = 'block'
                                document.getElementById('shadow_mp').style.display = 'flex'
                                document.querySelector('.left p').innerHTML = '데이터를 눌러 확인해보자!'
                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/225.png')";
                                
                                // 26.mp3 중지, 27.mp3 재생
                                audioElement.pause();
                                audioElement.currentTime = 0;

                                // 27.mp3 재생
                                const audioElement = document.createElement('audio');
                                audioElement.src = './data/audio/27.mp3';  // 27.mp3 파일 경로
                                audioElement.play();

                                const originalOnClick2 = document.querySelector('#data').onclick;
                                document.querySelector('#data').onclick = function () {
                                    if (originalOnClick2) originalOnClick2(); // 기존의 기능을 수행
                                    document.querySelector('.left').style.display = 'none'
                                    document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";
                                    setTimeout(() => {
                                        document.querySelector('.tori_help').style.display = 'block'
                                        document.querySelector('.tori_help p').innerHTML = '데이터는 활동 데이터와<br>대화 데이터 둘로 나뉘어!'
                                        
                                        // 27.mp3 중지, 28.mp3 재생
                                        audioElement.pause();
                                        audioElement.currentTime = 0;

                                        // 28.mp3 재생
                                        const audioElement = document.createElement('audio');
                                        audioElement.src = './data/audio/28.mp3';  // 28.mp3 파일 경로
                                        audioElement.play();

                                        document.querySelector('.tori_help .next_btn').onclick = function () {
                                            document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/229.png')";
                                            document.querySelector('.tori_help p').innerHTML = '방금 획득한 활동 점수는<br>활동데이터에서 볼 수 있고,'
                                            
                                            // 28.mp3 중지, 29.mp3 재생
                                            audioElement.pause();
                                            audioElement.currentTime = 0;

                                            // 29.mp3 재생
                                            const audioElement = document.createElement('audio');
                                            audioElement.src = './data/audio/29.mp3';  // 29.mp3 파일 경로
                                            audioElement.play();
                                            
                                            document.querySelector('.tori_help .next_btn').onclick = function () {
                                                document.querySelector('.left').style.display = 'block'
                                                document.querySelector('.tori_help').style.display = 'none'
                                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/227.png')";
                                                document.querySelector('.left p').innerHTML = '사람들과 나눈 대화는<br>대화 데이터에서 확인할 수 있어!'

                                                // 29.mp3 중지, 30.mp3 재생
                                                audioElement.pause();
                                                audioElement.currentTime = 0;

                                                // 30.mp3 재생
                                                const audioElement = document.createElement('audio');
                                                audioElement.src = './data/audio/30.mp3';  // 30.mp3 파일 경로
                                                audioElement.play();
                                                document.querySelector('.left .next_btn').onclick = function () {
                                                    document.querySelector('.left p').innerHTML = '보고 싶은 데이터를<br>한번 클릭해봐!'

                                                    // 30.mp3 중지, 31.mp3 재생
                                                    audioElement16.pause();
                                                    audioElement16.currentTime = 0;

                                                    // 31.mp3 재생
                                                    const audioElement = document.createElement('audio');
                                                    audioElement.src = './data/audio/31.mp3';  // 3.mp3 파일 경로
                                                    audioElement.play();
                                                    document.querySelector('.left .next_btn').onclick = function () {
                                                        document.querySelector('.left').style.display = 'none'
                                                        document.getElementById('shadow_mp').style.display = 'none'
                                                        document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";

                                                        setDTTutorial('false');
                                                    }
                                                }
                                            }
                                        }
                                    }, 500);
                                }
                }, 500); // 0.1초 지연 후 대화창 띄우기 (필요에 따라 
                        }
                    }
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // "좋아!" 버튼 클릭 시 동작
                gameAButton.onclick = function () {
                    console.log("게임 선택됨");
                    modal.style.display = "none";
                    resetModalGame();
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // "다음에 하자" 버튼 클릭 시 모달 닫기
                document.getElementById("GameNo").onclick = function () {
                    console.log('close')
                    modal.style.display = "none";
                    resetModalGame();
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // 선택지 1 클릭 시 동작
                document.getElementById("option1").onclick = function () {
                    console.log("선택지 1 선택됨");
                    modal.style.display = "none";
                    this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                    // resetplayerposition.call(this);
                }.bind(this);
            
                // 모달 창 바깥 영역 클릭 시 모달 닫기
                window.onclick = function (event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                        this._onDialogClosed(); // 모달 닫기 후 카메라 복원
                        // resetplayerposition.call(this);
                    }
                }.bind(this);
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
        
            // _addPointLight(x, y, z, helperColor) {
            //     const color = 0x0038FF;
            //     const intensity = 10;
            
            //     const pointLight = new THREE.PointLight(color, intensity, 100);
            //     pointLight.position.set(-665.43, 100, -18.17);
            
            //     this._scene.add(pointLight);
            
            //     const pointLightHelper = new THREE.PointLightHelper(pointLight, 10, 0xff0000);
            //     this._scene.add(pointLightHelper);
            // }
        
        _setupLight() {
            const ambientLight = new THREE.AmbientLight(0xffffff, 2);

            // 모든 씬에 대해 반복문을 사용하여 조명을 추가
            this._scenes.forEach((scene) => {
                scene.add(ambientLight.clone());
            });

            const skyColor = 0xffffbb;  // 하늘색 (Sky)
            const groundColor = 0x080820;  // 땅 색 (Ground)
            const hemiLightIntensity = 1.5;
            const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, hemiLightIntensity);
            this._scenes.forEach((scene) => {
                scene.add(hemisphereLight.clone());
            });

            const shadowLight = new THREE.DirectionalLight(0xFFEFCF, 1.5);
            shadowLight.position.set(1400, 2000, -1000);
            shadowLight.target.position.set(0, 0, 0);
            shadowLight.castShadow = true;
            shadowLight.shadow.mapSize.width = 2048;
            shadowLight.shadow.mapSize.height = 2048;
            shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 5000;
            shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -5000;
            shadowLight.shadow.camera.near = 0.5;
            shadowLight.shadow.camera.far = 5000;

            shadowLight.shadow.bias = -0.0005;
            shadowLight.shadow.radius = 2;

            // 모든 씬에 대해 반복문을 사용하여 방향성 조명을 추가
            this._scenes.forEach((scene) => {
                scene.add(shadowLight.clone());
            });

            // this._addPointLight(-665.43, 50, -18.17, 0x0038FF);
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

    if (!this._isTpTutirialShown && getTalkTutorial() === 'false' && getTpTutorial() === 'true' && document.getElementById('pageModal').style.display == 'none') {
        document.querySelector('.left').style.display = 'none'
        document.querySelector('#getsticker').style.display = 'none'
        document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/shadow_bg.png')";
        document.getElementById('shadow_mp').style.display = 'none';
        setTimeout(() => {
            document.querySelector('.tori_help').style.display = 'block';
            document.querySelector('.tori_help p').innerHTML = '버스정류장으로 가서 버스를 타고<br>다른 곳으로 이동해볼까?';
            
            // 25_1.mp3 재생
            const audioElement16 = document.createElement('audio');
            audioElement16.src = './data/audio/25_1.mp3';  // 25_1.mp3 파일 경로
            audioElement16.play();
            this._isTpTutirialShown = true;  // 튜토리얼이 한 번 표시되면 플래그를 true로 설정
            document.querySelector('.tori_help .next_btn').onclick = function () {
                document.querySelector('.tori_help p').innerHTML = '가고 싶은 곳으로 이동해보자!';
                // 25_1.mp3 중지, 25_2.mp3 재생
                audioElement16.pause();
                audioElement16.currentTime = 0;

                // 25_2.mp3 재생
                const audioElement17 = document.createElement('audio');
                audioElement17.src = './data/audio/25_2.mp3';  // 25_2.mp3 파일 경로
                audioElement17.play();

                document.querySelector('.tori_help .next_btn').onclick = function () {
                document.querySelector('.tori_help').style.display = 'none';
            }
            }
        }, 500);
    }

    // 튜토리얼이 이미 표시되었는지 확인하여 중복 실행을 방지
    if (!this._isTutorialShown && getDTTutorial() === 'false' && getFnTutorial() === 'true' && document.getElementById('pageModal').style.display == 'none') {
        setTimeout(() => {
            document.querySelector('.left').style.display = 'block';
            document.querySelector('.left p').innerHTML = '어때? GiO세계가<br>맘에 들어?';

            // 31.mp3 중지, 32.mp3 재생
            audioElement.pause();
            audioElement.currentTime = 0;

            // 32.mp3 재생
            const audioElement = document.createElement('audio');
            audioElement.src = './data/audio/32.mp3';  // 32.mp3 파일 경로
            audioElement.play();
            
            this._isTutorialShown = true;  // 튜토리얼이 한 번 표시되면 플래그를 true로 설정

            document.querySelector('.left .next_btn').onclick = function () {
                document.querySelector('.left p').innerHTML = '앞으로 GiO에서<br>더 많은 사람들과 대화할 수<br>있을거야! 옆에서 도와줄게!';

                // 32.mp3 중지, 33.mp3 재생
                audioElement.pause();
                audioElement.currentTime = 0;

                // 33.mp3 재생
                const audioElement = document.createElement('audio');
                audioElement.src = './data/audio/33.mp3';  // 33.mp3 파일 경로
                audioElement.play();

                document.querySelector('.left .next_btn').onclick = function () {
                    document.querySelector('.left p').innerHTML = '자! GiO를<br>계속 즐겨볼까?';
                    // 33.mp3 중지, 34.mp3 재생
                    audioElement.pause();
                    audioElement.currentTime = 0;

                    // 34.mp3 재생
                    const audioElement = document.createElement('audio');
                    audioElement.src = './data/audio/34.mp3';  // 34.mp3 파일 경로
                    audioElement.play();

                    document.querySelector('.left .next_btn').onclick = function () {
                        document.querySelector('.left').style.display = 'none';
                        setFnTutorial('false');
                    };
                };
            };
        }, 500);
    }

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


        const downDirection = new THREE.Vector3(0, -1, 0); // 아래 방향
        const upDirection = new THREE.Vector3(0, 1, 0);   // 위 방향
        
        const raycasterDown = new THREE.Raycaster();
        const raycasterUp = new THREE.Raycaster();
        
        raycasterDown.near = 0;
        raycasterDown.far = 1000000; // 아래 방향 최대 감지 거리
        raycasterUp.near = 0;
        raycasterUp.far = 1000000;   // 위 방향 최대 감지 거리
        
        // Raycaster 설정
        raycasterDown.set(playerPosition, downDirection);
        raycasterUp.set(playerPosition, upDirection);
        const intersectsDown = raycasterDown.intersectObjects(this._scene.children, true);
        // 위쪽 충돌 검사
        const intersectsUp = raycasterUp.intersectObjects(this._scene.children, true);

                
        // 감지된 객체 처리
        let collidedWithTeleport = false;
        let isOnNavMesh = false;
                let lastValidPosition = this._model.position.clone();
                
        for (let i = 0; i < intersectsDown.length; i++) {
            const intersectedObject = intersectsDown[i].object;
            if (intersectedObject.name === 'teleport') {
                if (this._currentSceneIndex == 4) { //마을회관
                    this._switchScene(1)
                    // 플레이어를 특정 위치로 순간 이동
                        const teleportPosition = new THREE.Vector3(1129, 6, 81);
                        this._model.position.copy(teleportPosition);
                            
                        console.log("Player teleported to:", teleportPosition);

                        // 물리 엔진 상태 초기화가 필요한 경우 여기서 추가
                        if (this._model._capsule) {
                            this._model._capsule.start.copy(teleportPosition);
                            this._model._capsule.end.copy(teleportPosition).y += this._model._capsule.radius * 2;
                            console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                        }
                } else if (this._currentSceneIndex == 5) { //도서관
                    this._switchScene(2)
                    // 플레이어를 특정 위치로 순간 이동
                        const teleportPosition = new THREE.Vector3(3429, 4.07, -3721);
                        this._model.position.copy(teleportPosition);
                            
                        console.log("Player teleported to:", teleportPosition);

                        // 물리 엔진 상태 초기화가 필요한 경우 여기서 추가
                        if (this._model._capsule) {
                            this._model._capsule.start.copy(teleportPosition);
                            this._model._capsule.end.copy(teleportPosition).y += this._model._capsule.radius * 2;
                            console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                        }
                    
                }
                else collidedWithTeleport = true;
                break;
            } else if (intersectedObject.name === 'teleport001') {
                if (this._currentSceneIndex == 1) {
                    
                    this._switchScene(4)
                    console.log('jotbug')
                }
                else if (this._currentSceneIndex == 2) {
                    this._switchScene(5)
                } else
                    console.log(this._currentSceneIndex)
            }
        }
        for (let i = 0; i < intersectsUp.length; i++) {
            const intersectedObject = intersectsUp[i].object;
            if (intersectedObject.name === 'teleport') {
                if (this._currentSceneIndex == 4) { //마을회관
                    this._switchScene(1)
                                        // 플레이어를 특정 위치로 순간 이동
                        const teleportPosition = new THREE.Vector3(1547, 102.56, -50);
                        this._model.position.copy(teleportPosition);
                            
                        console.log("Player teleported to:", teleportPosition);

                        // 물리 엔진 상태 초기화가 필요한 경우 여기서 추가
                        if (this._model._capsule) {
                            this._model._capsule.start.copy(teleportPosition);
                            this._model._capsule.end.copy(teleportPosition).y += this._model._capsule.radius * 2;
                            console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                        }
                } else if (this._currentSceneIndex == 5) { //도서관
                    this._switchScene(2)
                    // 플레이어를 특정 위치로 순간 이동
                        const teleportPosition = new THREE.Vector3(3429, 4.07, -3721);
                        this._model.position.copy(teleportPosition);
                            
                        console.log("Player teleported to:", teleportPosition);

                        // 물리 엔진 상태 초기화가 필요한 경우 여기서 추가
                        if (this._model._capsule) {
                            this._model._capsule.start.copy(teleportPosition);
                            this._model._capsule.end.copy(teleportPosition).y += this._model._capsule.radius * 2;
                            console.log("캡슐 위치 초기화:", this._model._capsule.start, this._model._capsule.end);
                        }
                    
                }
                else collidedWithTeleport = true;
                break;
            }else if (intersectedObject.name === 'teleport001'){
                if (this._currentSceneIndex == 1) {
                    this._switchScene(4)
                }
                else if (this._currentSceneIndex == 2){
                    this._switchScene(5)
                }else
                console.log(this._currentSceneIndex)
            }
                }
                if (!isOnNavMesh) { 
    //                  console.log('NavMesh를 벗어났습니다. 마지막 유효 위치로 복귀합니다.');
    // this._model.position.copy(lastValidPosition);

    // if (this._model._capsule) {
    //     this._model._capsule.start.copy(lastValidPosition);
    //     this._model._capsule.end.copy(lastValidPosition).y += this._model._capsule.radius * 2;
    // }
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
// 플레이어의 정면 방향으로 Raycast 쏘기
const playerFront_wall = new THREE.Vector3(0, 0, 1); // 정면 방향 (카메라에 따라 맞춤 필요)
playerFront_wall.applyQuaternion(this._model.quaternion); // 플레이어 회전에 따라 정면 벡터 회전 적용

// Raycast 위치를 플레이어의 정면으로 이동
const raycasterForward_wall = new THREE.Raycaster();
const startPosition_wall = this._model.position.clone().add(playerFront_wall.multiplyScalar(50)); // 플레이어 앞쪽으로 1 단위
const rayDirectionDown_wall = new THREE.Vector3(0, -1, 0); // y축 아래 방향으로 Raycast (지면 감지용)
raycasterForward_wall.near = 0; // 시작 위치
raycasterForward_wall.far = 100000; // 탐지 거리 대폭 늘림
const rayDirectionForward_wall = playerFront_wall.clone().normalize(); // 플레이어가 바라보는 방향으로 Raycast (정면 감지용)
const rayDirectionUp_wall = new THREE.Vector3(0, 1, 0); // y축 위 방향으로 Raycast (언덕 감지용)

// Raycaster 설정
raycasterForward_wall.set(startPosition_wall, rayDirectionDown_wall);
const intersectsDown_wall = raycasterForward_wall.intersectObjects(this._scene.children, true);

const raycasterUp_wall = new THREE.Raycaster();
raycasterUp_wall.near = 0; // Ray 시작 위치에서부터 탐지
raycasterUp_wall.far = 100000; // 최대 탐지 거리 (위 방향 길이를 늘림, 필요에 따라 조정 가능)
raycasterUp_wall.set(startPosition_wall, rayDirectionUp_wall);
const intersectsUp_wall = raycasterUp_wall.intersectObjects(this._scene.children, true);

// Ray가 어디로 쏘아지는지 시각적으로 확인 (디버깅용)
// const arrowHelper_wall = new THREE.ArrowHelper(rayDirectionDown_wall, startPosition_wall, 10, 0xff0000); // 아래 방향 (빨간색)
// const arrowHelperForward_wall = new THREE.ArrowHelper(rayDirectionForward_wall, startPosition_wall, 10, 0x00ff00); // 정면 방향 (초록색)
// const arrowHelperUp_wall = new THREE.ArrowHelper(rayDirectionUp_wall, startPosition_wall, 1000, 0x0000ff); // 위 방향 (파란색)
// this._scene.add(arrowHelper_wall); // 씬에 추가하여 가시화
// this._scene.add(arrowHelperForward_wall); // 정면 Ray 가시화
// this._scene.add(arrowHelperUp_wall); // 위로 쏜 Ray 가시화

// Raycast 결과 처리 (아래, 위, 정면 모두 탐지)
                let isOnNavMesh_wall = false;
                let originalSpeed = this._speed;
                let originalMaxSpeed = this._maxSpeed;
                let originalAcceleration = this._acceleration;


// 아래쪽 탐지
for (let i = 0; i < intersectsDown_wall.length; i++) {
    const intersectedObject_wall = intersectsDown_wall[i].object;
    if (intersectedObject_wall.userData.name === 'NavMesh') {
        // console.log('NavMesh 탐지 (아래)');
        isOnNavMesh_wall = true;
        break;
    }
}

// 위쪽 탐지
for (let i = 0; i < intersectsUp_wall.length; i++) {
    const intersectedObject_wall = intersectsUp_wall[i].object;
    if (intersectedObject_wall.userData.name === 'NavMesh') {
        // console.log('NavMesh 탐지 (위쪽)');
        isOnNavMesh_wall = true;
        break;
    }
}


                // NavMesh 위에 있지 않으면 속도를 0으로 설정
                if (this._currentSceneIndex != 1) {
                    
                    if (!isOnNavMesh_wall) {
                        // 원래 속도를 저장 (한 번만 저장)
                        if (this._speed !== 0 || this._maxSpeed !== 0 || this._acceleration !== 0) {
                            originalSpeed = this._speed;
                            originalMaxSpeed = this._maxSpeed;
                            originalAcceleration = this._acceleration;
                        }
                        
                        // 속도를 0으로 설정
                        this._speed = 0;
                        this._maxSpeed = 0;
                        this._acceleration = 0;
                    } else {
                        // Raycast가 NavMesh를 감지하면 원래 속도를 복원
                        if (this._speed === 0 && this._maxSpeed === 0 && this._acceleration === 0) {
                            this._speed = originalSpeed;
                            this._maxSpeed = originalMaxSpeed;
                            this._acceleration = originalAcceleration;
                        }
                    }
                }



                if (this._support) {
                    this._support.lookAt(this._model.position);
                    const distance = this._support.position.distanceTo(this._model.position);
                    if (distance > 250) {
                        const step = 3.5;
                        const direction = new THREE.Vector3().subVectors(this._model.position, this._support.position).normalize();
                        this._support.position.addScaledVector(direction, step);
                    }
                }

                // NPC와의 상호작용
                let meet_teacher = false; // 클래스 밖에 선언하여 상태를 유지
                let help_shown = false; // tori_help가 이미 보여졌는지 추적

const minDistance = 400; // NPC들이 바라볼 최소 거리 설정
this._npcs.forEach((npc) => {
    const distance = npc.position.distanceTo(this._model.position);
    if (distance < minDistance) {
            if (!this._isTaklTutorialShown && log_map_tutorial=='false' && getTalkTutorial() === 'true' && getTpTutorial() === 'true') {

            document.querySelector('.left').style.display = 'block';
            document.querySelector('.left p').innerHTML = '선생님을 마주보고<br>마우스로 클릭해 대화를 나눠보자.';

            // 오디오 요소 생성
            const audioElement = document.createElement('audio');
            audioElement.src = './data/audio/8.mp3';  // 8.mp3 파일 경로
            audioElement.play();  // 8.mp3 파일 재생
            this._isTaklTutorialShown = true;  // 튜토리얼이 한 번 표시되면 플래그를 true로 설정
            document.querySelector('.left .next_btn').onclick = function () {        
                document.querySelector('.left').style.display = 'none';
                audioElement.pause();  // 8.mp3 음성 멈춤
                audioElement.currentTime = 0;  // 음성을 처음부터 다시 재생할 수 있도록 시간 초기화
            }
    }
    //     if (npc.userData.name === 'teacher' && talk_tutorial === 'true' && !help_shown) {
    //         meet_teacher = true;
    //         help_shown = true; // 도움말이 표시되었음을 기록

    //         console.log('teacher');
    //         document.querySelector('.tori_help p').innerHTML = '선생님을 마주보고<br>마우스로 클릭해 대화를 나눠보자.';
    //         document.querySelector('.tori_help').style.display = 'block';

    //         // 이벤트 리스너가 여러 번 등록되지 않도록 기존 이벤트 제거 후 추가
    //         const nextBtn = document.querySelector('.tori_help .next_btn');
    //         nextBtn.onclick = null; // 기존 이벤트 리스너 제거
    //         nextBtn.onclick = function() {
    //             console.log('test');
    //             document.querySelector('.tori_help').style.display = 'none';
    //             // 이미 도움말이 표시되었으므로 다시 표시되지 않도록 함
    //             // 필요한 경우 추가 로직을 여기에 작성
    //     }
    // }
        // 목표 방향 설정 (NPC의 높이에 맞춰 y축 고정)
        const targetPosition = this._model.position.clone();
        targetPosition.y = npc.position.y;  // NPC의 높이만 고려하여 Y축 회전만 하도록 설정


            // NPC의 현재 회전 상태 저장
            const currentQuaternion = npc.quaternion.clone();

            // NPC가 목표 위치를 바라보도록 설정 (Y축 회전만 적용)
            npc.lookAt(targetPosition);

            // 목표 회전값 저장
            const targetQuaternion = npc.quaternion.clone();

            // NPC를 원래 회전 상태로 되돌림
            npc.quaternion.copy(currentQuaternion);

            // 선형 보간(SLERP)을 사용하여 부드럽게 회전
            const slerpFactor = 0.1;  // 회전 속도를 조절하는 값 (0~1 사이 값)
            npc.quaternion.slerp(targetQuaternion, slerpFactor);
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