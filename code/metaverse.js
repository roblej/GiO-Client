import * as THREE from 'three';
import Stats from "stats.js"
import { GLTFLoader } from "../jsm/loaders/GLTFLoader.js"
import { Octree } from "../jsm/math/Octree.js"
import { Capsule } from "../jsm/math/Capsule.js"
import { OrbitControls } from "../jsm/controls/OrbitControls.js"
import { onMouseMove } from './event.js';
import { FBXLoader } from '../jsm/loaders/FBXLoader.js';

export var game_name = ""

class App {
    constructor() {
        const divContainer = document.querySelector("#webgl-container");
        this._divContainer = divContainer;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        divContainer.appendChild(renderer.domElement);
        this._renderer = renderer;
        this._canvas = renderer.domElement; // canvas를 클래스 변수로 저장

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;

        this._mixers = []; // 클래스의 생성자 또는 초기화 부분에 추가

        const scene = new THREE.Scene();
        this._scene = scene;
        const loader = new THREE.TextureLoader();
        this._scene.background = loader.load('./data/sky_images.jpeg');

        // 추가된 코드
        this._originalCamera = null;
        this._npcCamera = null;
        this._isNpcCameraActive = false;

        this._setupOctree();
        this._setupCamera();
        this._setupLight();
        this._setupModel();
        this._setupControls();
        this._setupEventListeners(); // 이벤트 리스너 설정

        // 추가된 코드: 렌더링 루프 시작
        this._animate();

        const listener = new THREE.AudioListener();
        this._camera.add(listener);
        const sound = new THREE.Audio(listener);

        // 오디오 로더 생성
        const audioLoader = new THREE.AudioLoader();

        // 초기 볼륨 설정
        let initialVolume = 0.3;

        // AudioContext 상태 확인 및 활성화
        document.getElementById('loginModal').addEventListener('click', function () {
            if (listener.context.state === 'suspended') {
                listener.context.resume();
            }

            // sound가 이미 재생 중인지 확인
            if (!sound.isPlaying) {
                audioLoader.load('./data/bgm.mp3', function (buffer) {
                    sound.setBuffer(buffer);
                    sound.setLoop(true);
                    sound.setVolume(initialVolume); // 초기 볼륨 적용
                    sound.play();
                });
            }
        });

        // 볼륨 노브 컨트롤
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', function () {
            const volume = this.value / 100;
            initialVolume = volume; // 전역 변수로 볼륨 저장
            if (sound.isPlaying) {
                sound.setVolume(volume); // 사운드가 재생 중이면 즉시 적용
            }
        });

        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();
        this._highlighted = null; // 마지막으로 강조 표시된 객체
        this._originalColor = new THREE.Color(); // 원래 색상을 저장할 변수
        this._positionLabel = document.getElementById("positionLabel");  // HTML에서 레이블 요소 참조
        this._divContainer.addEventListener('mousemove', (event) => onMouseMove(event, this));

        // 마우스 클릭 이벤트 리스너 추가
        this._divContainer.addEventListener('click', this._onMouseClick.bind(this));

        window.onresize = this.resize.bind(this);
        this.resize();

        requestAnimationFrame(this.render.bind(this));
    }
    _updatePositionLabel() {
        if (this._model) {  // 모델이 로드된 경우에만 실행
            const { x, y, z } = this._model.position;
            this._positionLabel.innerHTML = `Model Position - X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;
        }
    }
    _setupOctree(){
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
        this._originalCamera = camera; // 추가된 코드: 원래 카메라 저장
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

    _setupEventListeners() {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.key === 'x') {
                this._switchToOriginalCamera();
            }
        });
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
    
        const npcPosition = new THREE.Vector3();
        npc.getWorldPosition(npcPosition);
        console.log("NPC Position:", npcPosition); // 디버그 로그 추가
    
        // NPC의 전방 벡터 계산
        const npcForward = new THREE.Vector3();
        npc.getWorldDirection(npcForward);
        npcForward.normalize();
    
        // 카메라 위치를 NPC 전방으로 설정
        const cameraOffset = 50; // NPC로부터 카메라의 거리 (원하는 대로 조정 가능)
        const newCameraPosition = npcPosition.clone().add(npcForward.multiplyScalar(-cameraOffset));
    
        const newCamera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            20000
        );
        newCamera.position.set(newCameraPosition.x, npcPosition.y + 50, newCameraPosition.z); // 높이 조절
        
        // 카메라가 NPC를 바라보도록 설정
        newCamera.lookAt(npcPosition.x, npcPosition.y, npcPosition.z);
        
        // 카메라의 타겟을 NPC 위치로 설정
        this._controls.target.set(npcPosition.x, npcPosition.y, npcPosition.z);
        this._controls.update();
    
        console.log("New camera position:", newCamera.position); // 디버그 로그 추가
    
        this._npcCamera = newCamera;
        this._camera = this._npcCamera;
        this._controls.object = this._npcCamera;
        this._isNpcCameraActive = true;
    
        console.log("Switched to NPC camera"); // 디버그 로그 추가
    }
    

    _animate() {
        requestAnimationFrame(this._animate.bind(this));
        this._controls.update();
        this._renderer.render(this._scene, this._camera);
    }

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

    _setupModel() {
        const planeGeometry = new THREE.PlaneGeometry(20000,20000);
        const planeMaterial = new THREE.MeshPhongMaterial({color: 0x0A630A});
        const NpcMaterial = new THREE.MeshPhongMaterial({color: 0x878787});
        const plane = new THREE.Mesh(planeGeometry,planeMaterial);
        plane.name = "plane";
        plane.rotation.x = -Math.PI/2;
        plane.position.y= -0;
        this._scene.add(plane);
        plane.receiveShadow = true;

        this._worldOctree.fromGraphNode(plane);
        new GLTFLoader().load("./data/schooln.glb", (gltf) => {
            const map = gltf.scene;
            this._scene.add(map);
            this.map = map;
            map.scale.set(500, 500, 500);
            // map.rotation.y = Math.PI/-1; // Z축을 중심으로 180도 회전
            map.position.set(0, 1, -2100);
        
            // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
            map.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        
            this._worldOctree.fromGraphNode(map);
        });
        


new GLTFLoader().load("./data/maru1.glb",(gltf) =>{
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
    support.scale.set(20,20,20);
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
        new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{
            const npc = gltf.scene;
            this._scene.add(npc);
            
    
            npc.traverse(child =>{
                if(child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isNPC = true; // NPC 속성 추가
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
            npc.position.set(-91,0,-775);
            npc.scale.set(50,50,50);
            const box = (new THREE.Box3).setFromObject(npc);
            // npc.position.y = (box.max.y - box.min.y) /2;
            const height = box.max.y - box.min.y;
            const diameter = box.max.z - box.min.z
            
            npc._capsule = new Capsule(
                new THREE.Vector3(0, diameter/2, 0),
                new THREE.Vector3(0, height - diameter/2, 0),
                diameter/2
            );
            npc.rotation.y = Math.PI;
            this._npc = npc;
    }); 
    new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{
        const npc = gltf.scene;
        this._scene.add(npc);
        

        npc.traverse(child =>{
            if(child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.isNPC = true; // NPC 속성 추가
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
        npc.position.set(-209,1,-1350);
        npc.scale.set(50,50,50);
        npc.rotation.z = Math.PI/2
        npc.rotation.x = Math.PI/2
        const box = (new THREE.Box3).setFromObject(npc);
        // npc.position.y = (box.max.y - box.min.y) /2;
        const height = box.max.y - box.min.y;
        const diameter = box.max.z - box.min.z
        
        npc._capsule = new Capsule(
            new THREE.Vector3(0, diameter/2, 0),
            new THREE.Vector3(0, height - diameter/2, 0),
            diameter/2
        );
        npc.rotation.y = Math.PI;
        this._npc = npc;
}); 
    new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{
        const npc = gltf.scene;
        this._scene.add(npc);
        

        npc.traverse(child =>{
            if(child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.isNPC = true; // NPC 속성 추가
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
        npc.position.set(2300,30,60);
        npc.scale.set(50,50,50);
        const box = (new THREE.Box3).setFromObject(npc);
        // npc.position.y = (box.max.y - box.min.y) /2;
        const height = box.max.y - box.min.y;
        const diameter = box.max.z - box.min.z
        
        npc._capsule = new Capsule(
            new THREE.Vector3(0, diameter/2, 0),
            new THREE.Vector3(0, height - diameter/2, 0),
            diameter/2
        );
        // npc.rotation.y = Math.PI;
        this._npc = npc;
}); 
 

new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{
    const npc = gltf.scene;
    this._scene.add(npc);
    

    npc.traverse(child =>{
        if(child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData.isNPC = true; // NPC 속성 추가
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
    npc.position.set(225,1,-1682);
    // npc.rotation.y = Math.PI /2;
    npc.scale.set(70,70,70);
    const box = (new THREE.Box3).setFromObject(npc);
    // npc.position.y = (box.max.y - box.min.y) /2;
    const height = box.max.y - box.min.y;
    const diameter = box.max.z - box.min.z
    
    npc._capsule = new Capsule(
        new THREE.Vector3(0, diameter/2, 0),
        new THREE.Vector3(0, height - diameter/2, 0),
        diameter/2
    );
    // npc.rotation.y = Math.PI/2;
    this._npc = npc;
});

new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{
    const npc = gltf.scene;
    this._scene.add(npc);
    

    npc.traverse(child =>{
        if(child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
        if (child.isMesh) {
            child.userData.type = 'game_friend';
            child.userData.isNPC = true; // NPC 속성 추가
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
    npc.position.set(-705,1,-690);
    npc.scale.set(50,50,50);
    const box = (new THREE.Box3).setFromObject(npc);
    // npc.position.y = (box.max.y - box.min.y) /2;
    const height = box.max.y - box.min.y;
    const diameter = box.max.z - box.min.z
    
    npc._capsule = new Capsule(
        new THREE.Vector3(0, diameter/2, 0),
        new THREE.Vector3(0, height - diameter/2, 0),
        diameter/2
    );
    npc.rotation.y = Math.PI/2;
    this._npc = npc;
});

new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{
    const npc = gltf.scene;
    this._scene.add(npc);
    

    npc.traverse(child =>{
        if(child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData.isNPC = true; // NPC 속성 추가
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
    npc.position.set(-104,0,-160);
    npc.scale.set(70,70,70);
    const box = (new THREE.Box3).setFromObject(npc);
    // npc.position.y = (box.max.y - box.min.y) /2;
    const height = box.max.y - box.min.y;
    const diameter = box.max.z - box.min.z
    
    npc._capsule = new Capsule(
        new THREE.Vector3(0, diameter/2, 0),
        new THREE.Vector3(0, height - diameter/2, 0),
        diameter/2
    );
    npc.rotation.y = Math.PI/4;
    this._npc = npc;
}); 
    new GLTFLoader().load("./data/Xbot.glb",(gltf) =>{

        const npc = gltf.scene;
        this._scene.add(npc);
        

        npc.traverse(child =>{
            if(child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.isNPC = true; // NPC 속성 추가
            }
            if (child.isMesh) {
                child.userData.type = 'casher';
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

        npc.position.set(0,0,-2300);
        npc.scale.set(70,70,70);
        const box = (new THREE.Box3).setFromObject(npc);
        // npc.position.y = 0;
        const height = box.max.y - box.min.y;
        const diameter = box.max.z - box.min.z
        
        npc._capsule = new Capsule(
            new THREE.Vector3(0, diameter/2, 0),
            new THREE.Vector3(0, height - diameter/2, 0),
            diameter/2
        );
        // npc.rotation.y = Math.PI;
        this._npc = npc;
}); 


    new GLTFLoader().load("./data/Xbot.glb", (gltf) => {
        const model = gltf.scene;
        this._scene.add(model);

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
            (diameter/2)*50
        );
        
        model.scale.set(50, 50, 50);
        model.position.set(-0.5,10,-9)
            const axisHelper = new THREE.AxesHelper(1000);
            // this._scene.add(axisHelper)
            const boxHelper = new THREE.BoxHelper(model);
            // this._scene.add(boxHelper);
            this._boxHelper = boxHelper;
            this._model = model;
        });
            const boxG = new THREE.BoxGeometry(50, 50, 50);
            // const boxM = new THREE.Mesh(boxG, NpcMaterial);
            // boxM.receiveShadow = true;
            // boxM.castShadow = true;
            // boxM.position.set(150, 0, 0);
            // boxM.name = "clickableBox"; // 식별 가능한 name 속성 추가
            // this._scene.add(boxM);
            // this._worldOctree.fromGraphNode(boxM);
            // this._boxM = boxM;

            const GameA = new THREE.Mesh(boxG, NpcMaterial);
            GameA.receiveShadow = true;
            GameA.castShadow = true;
            GameA.position.set(76, 0, -2300);
            GameA.name = "GameA"; // 식별 가능한 name 속성 추가
            this._scene.add(GameA);
            this._worldOctree.fromGraphNode(GameA);

            const GameB = new THREE.Mesh(boxG, NpcMaterial);
            GameB.receiveShadow = true;
            GameB.castShadow = true;
            GameB.position.set(2189, 0, 132);
            GameB.name = "GameB"; // 식별 가능한 name 속성 추가
            this._scene.add(GameB);
            this._worldOctree.fromGraphNode(GameB);


            const boxT = new THREE.Mesh(boxG, NpcMaterial);
            boxT.receiveShadow = true;
            boxT.castShadow = true;
            boxT.position.set(-150, 0, 0);
            boxT.name = "tp";
            // this._scene.add(boxT);
            this._boxT= boxT;
            this._worldOctree.fromGraphNode(boxT);
    }


    _onMouseClick(event) {
        console.log('Mouse click event'); // 디버그 로그
        // 마우스 위치를 정규화된 장치 좌표로 변환
        this._mouse.x = (event.clientX / this._divContainer.clientWidth) * 2 - 1;
        this._mouse.y = -(event.clientY / this._divContainer.clientHeight) * 2 + 1;
    
        // Raycaster 업데이트
        this._raycaster.setFromCamera(this._mouse, this._camera);
    
        // 클릭된 객체 확인
        const intersects = this._raycaster.intersectObjects(this._scene.children, true);
        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                const selectedObject = intersects[i].object;
                console.log('Clicked object:', selectedObject); // 클릭된 객체 정보 로그
    
                if (selectedObject.userData && selectedObject.userData.isNPC) {
                    console.log('NPC clicked, focusing on NPC'); // NPC 클릭 여부 확인하는 로그
                    this._focusOnNPC(selectedObject);
                    break; // 첫 번째 NPC 객체만 처리하고 루프 종료
                }
    
                if (selectedObject.userData.type === 'casher') {
                    console.log('Casher clicked'); // Casher 클릭 여부 확인하는 로그
    
                    var casher = document.getElementById("thiscasher");
                    var span = document.getElementsByClassName("close")[1];
                    var speechText = document.getElementById("speechText");
                    var buttonGroup = document.getElementById("buttonGroup");
    
                    casher.style.display = "block";
    
                    // 모달을 초기 상태로 재설정하는 함수
                    function resetModal() {
                        speechText.style.display = "block"; // 텍스트 보이기
                        buttonGroup.style.display = "none"; // 버튼 그룹 숨기기
                    }
    
                    // 초기 상태로 모달 재설정
                    resetModal();
    
                    // 닫기 버튼 클릭 시 모달 닫기
                    span.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    }
    
                    // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
                    speechText.onclick = function () {
                        speechText.style.display = "none"; // 텍스트 숨김
                        buttonGroup.style.display = "block"; // 버튼 그룹 표시
                    }
    
                    // 선택지 1 클릭 시 동작
                    document.getElementById("select1").onclick = function () {
                        console.log("선택지 1 선택됨");
                        casher.style.display = "none";
                        resetModal();
                    }
    
                    // 선택지 2 클릭 시 동작
                    document.getElementById("select2").onclick = function () {
                        console.log("선택지 2 선택됨");
                        casher.style.display = "none";
                        resetModal();
                    }
    
                    // 선택지 3 클릭 시 동작
                    document.getElementById("select3").onclick = function () {
                        console.log("선택지 3 선택됨");
                        casher.style.display = "none";
                        resetModal();
                    }
    
                    // 모달 창 바깥 영역 클릭 시 모달 닫기
                    window.onclick = function (event) {
                        if (event.target == casher) {
                            casher.style.display = "none";
                            resetModal();
                        }
                    }
    
                    break; // 첫 번째 교차 객체만 처리하고 루프 종료
                } else if (selectedObject.userData.type == 'teacher') {
                    console.log('Teacher clicked'); // Teacher 클릭 여부 확인하는 로그
    
                    var casher = document.getElementById("thiscasher");
                    var span = document.getElementsByClassName("close")[1];
                    var dialogText = document.querySelector("#thiscasher .Speech1 p");
                    var option1 = document.getElementById("select1");
                    var option2 = document.getElementById("select2");
                    var option3 = document.getElementById("select3");
                    var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
    
                    // 대화 내용 업데이트
                    dialogText.innerHTML = "안녕? 새로 온 학생이니?";
    
                    // 각 선택지 업데이트
                    function resetModal() {
                        option1.innerHTML = "네, 맞아요. 안녕하세요?";
                        option2.innerHTML = "(무시하고 갈 길을 간다.)";
                        option3.innerHTML = "누구세요?";
                        dialogText.style.display = "block";  // 텍스트를 보이게 함
                        buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                    }
    
                    // 초기 상태로 모달 재설정
                    resetModal();
    
                    casher.style.display = "block";
    
                    // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
                    dialogText.onclick = function () {
                        this.style.display = "none"; // 텍스트 숨김
                        buttonGroup.style.display = "block"; // 버튼 그룹 표시
                    };
    
                    // 닫기 버튼 클릭 시 모달 닫기
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
                        };
                    };
    
                    option2.onclick = function () {
                        console.log("두 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "어머..낯을가리는 아이인가?";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option3.onclick = function () {
                        console.log("세 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "나는 선생님이란다.";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    // 모달 창 바깥 영역 클릭 시 모달 닫기
                    window.onclick = function (event) {
                        if (event.target == casher) {
                            casher.style.display = "none";
                            resetModal();
                        }
                    };
    
                } else if (selectedObject.userData.type == 'game_friend') {
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
    
                    break; // 첫 번째 교차 객체만 처리하고 루프 종료
                } else if (selectedObject.userData.type == 'friend_crash') {
                    var casher = document.getElementById("thiscasher");
                    var span = document.getElementsByClassName("close")[1];
                    var dialogText = document.querySelector("#thiscasher .Speech1 p");
                    var option1 = document.getElementById("select1");
                    var option2 = document.getElementById("select2");
                    var option3 = document.getElementById("select3");
                    var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
    
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
    
                    // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
                    dialogText.onclick = function () {
                        this.style.display = "none"; // 텍스트 숨김
                        buttonGroup.style.display = "block"; // 버튼 그룹 표시
                    };
    
                    // 닫기 버튼 클릭 시 모달 닫기
                    span.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    };
    
                    option1.onclick = function () {
                        console.log("첫 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "어? 아...미안";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option2.onclick = function () {
                        console.log("두 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "...";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option3.onclick = function () {
                        console.log("세 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "아야! 너 뭐야?";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    // 모달 창 바깥 영역 클릭 시 모달 닫기
                    window.onclick = function (event) {
                        if (event.target == casher) {
                            casher.style.display = "none";
                            resetModal();
                        }
                    };
                } else if (selectedObject.userData.type == 'rector') {
                    var casher = document.getElementById("thiscasher");
                    var span = document.getElementsByClassName("close")[1];
                    var dialogText = document.querySelector("#thiscasher .Speech1 p");
                    var option1 = document.getElementById("select1");
                    var option2 = document.getElementById("select2");
                    var option3 = document.getElementById("select3");
                    var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
    
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
    
                    // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
                    dialogText.onclick = function () {
                        this.style.display = "none"; // 텍스트 숨김
                        buttonGroup.style.display = "block"; // 버튼 그룹 표시
                    };
    
                    // 닫기 버튼 클릭 시 모달 닫기
                    span.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    };
    
                    option1.onclick = function () {
                        console.log("첫 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "머리가 없는게 아니다. 내가 나아갈 뿐";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option2.onclick = function () {
                        console.log("두 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "안녕, 오늘도 좋은 하루 보내렴";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option3.onclick = function () {
                        console.log("세 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "...";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    // 모달 창 바깥 영역 클릭 시 모달 닫기
                    window.onclick = function (event) {
                        if (event.target == casher) {
                            casher.style.display = "none";
                            resetModal();
                        }
                    };
                } else if (selectedObject.userData.type == 'npc3') {
                    var casher = document.getElementById("thiscasher");
                    var span = document.getElementsByClassName("close")[1];
                    var dialogText = document.querySelector("#thiscasher .Speech1 p");
                    var option1 = document.getElementById("select1");
                    var option2 = document.getElementById("select2");
                    var option3 = document.getElementById("select3");
                    var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
    
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
    
                    // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
                    dialogText.onclick = function () {
                        this.style.display = "none"; // 텍스트 숨김
                        buttonGroup.style.display = "block"; // 버튼 그룹 표시
                    };
    
                    // 닫기 버튼 클릭 시 모달 닫기
                    span.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    };
    
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
    
                    // 모달 창 바깥 영역 클릭 시 모달 닫기
                    window.onclick = function (event) {
                        if (event.target == casher) {
                            casher.style.display = "none";
                            resetModal();
                        }
                    };
                } else if (selectedObject.userData.type == 'friend_hurt') {
                    var casher = document.getElementById("thiscasher");
                    var span = document.getElementsByClassName("close")[1];
                    var dialogText = document.querySelector("#thiscasher .Speech1 p");
                    var option1 = document.getElementById("select1");
                    var option2 = document.getElementById("select2");
                    var option3 = document.getElementById("select3");
                    var buttonGroup = document.getElementById("buttonGroup"); // 버튼 그룹을 감싸고 있는 div의 ID를 가정
    
                    // 대화 내용 업데이트
                    dialogText.innerHTML = "넘어져서 주져 앉아있다. 무릎에 상처가 났다..";
    
                    // 각 선택지 업데이트
                    function resetModal() {
                        option1.innerHTML = "어, 피가 난다!";
                        option2.innerHTML = "괜찮아? 아프겠다. 양호실까지 부축해줄까?";
                        option3.innerHTML = "(무시하고 지나간다.)";
                        dialogText.style.display = "block";  // 텍스트를 보이게 함
                        buttonGroup.style.display = "none";  // 버튼 그룹을 숨김
                    }
    
                    // 초기 상태로 모달 재설정
                    resetModal();
    
                    casher.style.display = "block";
    
                    // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
                    dialogText.onclick = function () {
                        this.style.display = "none"; // 텍스트 숨김
                        buttonGroup.style.display = "block"; // 버튼 그룹 표시
                    };
    
                    // 닫기 버튼 클릭 시 모달 닫기
                    span.onclick = function () {
                        casher.style.display = "none";
                        resetModal();
                    };
    
                    // 각 선택지 클릭 시 동작
                    option1.onclick = function () {
                        console.log("첫 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "뭐야? 구경났어?";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option2.onclick = function () {
                        console.log("두 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = "괜찮아. 혼자 양호실에 갈게. 걱정해줘서 고마워.";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    option3.onclick = function () {
                        console.log("세 번째 선택지 선택됨");
                        dialogText.style.display = "block";
                        buttonGroup.style.display = "none";
                        dialogText.innerHTML = ".....";
                        dialogText.onclick = function () {
                            casher.style.display = "none";
                            resetModal();
                        };
                    };
    
                    // 모달 창 바깥 영역 클릭 시 모달 닫기
                    window.onclick = function (event) {
                        if (event.target == casher) {
                            casher.style.display = "none";
                            resetModal();
                        }
                    };
                }
    
                if (intersects[i].object.name === "clickableBox") {
                    var modal = document.getElementById("myModal");
                    var span = document.getElementsByClassName("close")[0];
                    sessionStorage.setItem('npc_name', selectedObject.userData.type);
                    modal.style.display = "block";
    
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
    
                    break; // 첫 번째 교차 객체만 처리하고 루프 종료
                } else if (intersects[i].object.name === "GameA") {
                    game_name = "GameA"
                    var modal = document.getElementById("myModal");
                    var span = document.getElementsByClassName("close")[0];
                    modal.style.display = "block";
                    var gameAButton = document.getElementById("Game");
                    gameAButton.setAttribute('data-path', 'WebGLTest1/index.html'); // data-path 속성 설정
    
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
    
                    break; // 첫 번째 교차 객체만 처리하고 루프 종료
                } else if (intersects[i].object.name === "GameB") {
                    game_name = "GameB"
                    var modal = document.getElementById("myModal");
                    var span = document.getElementsByClassName("close")[0];
                    modal.style.display = "block";
    
                    var gameAButton = document.getElementById("Game");
                    if (gameAButton) {
                        gameAButton.setAttribute('data-path', 'JonnaZiralBall/index.html'); // data-path 속성 설정
                    }
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
    
                    break; // 첫 번째 교차 객체만 처리하고 루프 종료
                }
    
                if (intersects[i].object.name === "tp") {
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
        }
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
        this._scene.add(ambientLight);


        const shadowLight = new THREE.DirectionalLight(0xffffff, 2);
        shadowLight.position.set(-1000, 1200, -2350);
        shadowLight.target.position.set(50, 0, -1000);
        const directionalLightHelper = new THREE.DirectionalLightHelper(shadowLight, 10);
        // this._scene.add(directionalLightHelper);
        
        this._scene.add(shadowLight);
        this._scene.add(shadowLight.target);

        shadowLight.castShadow = true;
        // shadowLight.receiveShadow = true;
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
    _bOnTheGround = false;
    _fallingAcceleration = 0;
    _fallingSpeed = 0;

       update(time) {
        time *= 0.001;
        this._controls.update();
        
        if(this._boxHelper){
            this._boxHelper.update();
        }

        this._fps.update();

        if(this._mixer) {
            const deltaTime = time - this._previousTime;
            this._mixers.forEach(mixer => mixer.update(deltaTime));

            const angleCameraDirectionAxisY=Math.atan2(
                (this._camera.position.x - this._model.position.x),
                (this._camera.position.z -  this._model.position.z)
            )+ Math.PI;

            const rotateQuarternion = new THREE.Quaternion();
            rotateQuarternion.setFromAxisAngle(
                new THREE.Vector3(0,1,0),
                angleCameraDirectionAxisY + this._directionOffset()
            );

            this._model.quaternion.rotateTowards(rotateQuarternion, THREE.MathUtils.degToRad(5));

            const walkDirection = new THREE.Vector3();
            this._camera.getWorldDirection(walkDirection);

            walkDirection.y = this._bOnTheGround ? 0 : -1;
            walkDirection.normalize();

            walkDirection.applyAxisAngle(new THREE.Vector3(0,1,0), this._directionOffset());

            if(this._speed < this._maxSpeed) this._speed += this._acceleration
            else this._speed -= this._acceleration*2;

            if(!this._bOnTheGround){
                this._fallingAcceleration+=1;
                this._fallingSpeed+= Math.pow(this._fallingAcceleration, 2);
            } else{
                this._fallingAcceleration = 0;
                this._fallingSpeed = 0;
            }

            const velocity = new THREE.Vector3(
                walkDirection.x * this._speed,
                walkDirection.y * this._fallingSpeed,
                walkDirection.z * this._speed,
            );

            const deltaPosition = velocity.clone().multiplyScalar(deltaTime);

            this._model._capsule.translate(deltaPosition);

            const result = this._worldOctree.capsuleIntersect(this._model._capsule);
            if(result){
                this._model._capsule.translate(result.normal.multiplyScalar(result.depth));
                this._bOnTheGround = true;
            } else{
                this._bOnTheGround = false;
            }

            const previousPosition = this._model.position.clone();
            const capsuleHeight = this._model._capsule.end.y - this._model._capsule.start.y + this._model._capsule.radius*2;
            this._model.position.set(
            this._model._capsule.start.x,
            this._model._capsule.start.y - this._model._capsule.radius + capsuleHeight/2,
            this._model._capsule.start.z
            );

            this._camera.position.x -= previousPosition.x - this._model.position.x;
            this._camera.position.z -= previousPosition.z - this._model.position.z;

            this._controls.target.set(
                this._model.position.x,
                this._model.position.y,
                this._model.position.z,
            )
            this._support.lookAt(this._model.position)
            const distance = this._support.position.distanceTo(this._model.position)
            if(distance>150){
                const step = 3.5
                const direction = new THREE.Vector3().subVectors(this._model.position, this._support.position).normalize();
                this._support.position.addScaledVector(direction, step);
            }

            const vector = new THREE.Vector3();
            this._support.getWorldPosition(vector);
            vector.project(this._camera);

            const x = (vector.x * .5 + .5) * this._canvas.clientWidth;
            const y = (vector.y * -.5 + .5) * this._canvas.clientHeight;

            const speechBubble = document.getElementById('speechBubble');
            speechBubble.style.transform = `translate(-50%, -600%) translate(${x}px,${y}px)`;
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


window.onload = function() {
    new App();
}