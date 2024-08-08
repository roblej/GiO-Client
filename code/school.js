import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class SchoolScene {
    constructor(scene, worldOctree, mixers, divContainer, camera) {
        this._scene = scene;
        this._worldOctree = worldOctree;
        this._mixers = mixers;
        this._divContainer = divContainer;
        this._camera = camera;
        this._mouse = new THREE.Vector2();
        this._raycaster = new THREE.Raycaster();
    }

 _setupModel(){
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
    //
    // const loader = new THREE.FileLoader();
    // loader.setResponseType('arraybuffer');

    // loader.load('./data/sc.glb.gz', (data) => {
    //     // 데이터 디코딩
    //     const decompressedData = pako.inflate(new Uint8Array(data));

    //     const blob = new Blob([decompressedData], { type: 'application/octet-stream' });
    //     const url = URL.createObjectURL(blob);

    //     // GLTFLoader로 모델 로드
    //     const gltfLoader = new GLTFLoader();
    //     gltfLoader.load(url, (gltf) => {
    //         const map = gltf.scene;
    //         this._scene.add(map);
    //         this.map = map;
    //         map.scale.set(500, 500, 500);
    //         // map.rotation.y = Math.PI/-1; // Z축을 중심으로 180도 회전
    //         map.position.set(0, 1, -2100);
        
    //         // map 내의 모든 자식 객체를 순회하여 그림자 설정 적용
    //         map.traverse((child) => {
    //             if (child instanceof THREE.Mesh) {
    //                 child.castShadow = true;
    //                 child.receiveShadow = true;
    //             }
    //         });
        
    //         this._worldOctree.fromGraphNode(map);
    //         loadingPage.style.display = 'none'; // 로딩 페이지 숨김
    //     });
    // });
//
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('../jsm/libs/draco/'); // DRACO decoder 경로를 설정하세요
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load('./data/schooln.glb', (gltf) => {
        const map = gltf.scene;
        this._scene.add(map);
        this.map = map;
        map.scale.set(500, 500, 500);
        // map.rotation.y = Math.PI / -1; // Z축을 중심으로 180도 회전
        map.position.set(0, 1, -2100);

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
    loader.load("./data/Xbot.glb",(gltf) =>{
        const npc = gltf.scene;
        this._scene.add(npc);
        

        npc.traverse(child =>{
            if(child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
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
loader.load("./data/Xbot.glb",(gltf) =>{
    const npc = gltf.scene;
    this._scene.add(npc);
    

    npc.traverse(child =>{
        if(child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
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
loader.load("./data/Xbot.glb",(gltf) =>{
    const npc = gltf.scene;
    this._scene.add(npc);
    

    npc.traverse(child =>{
        if(child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
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


loader.load("./data/Xbot.glb",(gltf) =>{
const npc = gltf.scene;
this._scene.add(npc);


npc.traverse(child =>{
    if(child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
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

loader.load("./data/Xbot.glb",(gltf) =>{
const npc = gltf.scene;
this._scene.add(npc);


npc.traverse(child =>{
    if(child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
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

loader.load("./data/Xbot.glb",(gltf) =>{
const npc = gltf.scene;
this._scene.add(npc);


npc.traverse(child =>{
    if(child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
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
loader.load("./data/Xbot.glb",(gltf) =>{

    const npc = gltf.scene;
    this._scene.add(npc);
    

    npc.traverse(child =>{
        if(child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
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


loader.load("./data/Xbot.glb", (gltf) => {
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
    for (let i = 0; i < intersects.length; i++) {
        const selectedObject = intersects[0].object;

        if (selectedObject.userData.type === 'casher') {
        //   this._model.lookAt(selectedObject.position)
            // console.log(selectedObject.userData.type);
            
            var casher = document.getElementById("thiscasher");
            var span = document.getElementsByClassName("close")[1];
            var speechText = document.getElementById("speechText");
            var buttonGroup = document.getElementById("buttonGroup");
    
            casher.style.display = "block";

            // 모달을 초기 상태로 재설정하는 함수
            function resetModal() {
                speechText.style.display = "block"; // 텍스트 보이기
                buttonGroup.style.display = "none" // 버튼 그룹 숨기기
            }

            // 초기 상태로 모달 재설정
            resetModal();
    
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                casher.style.display = "none";
                resetModal();
            }

             // 텍스트 클릭 시 텍스트 숨기기 및 버튼 그룹 보이기
            speechText.onclick = function() {
                speechText.style.display = "none"; // 텍스트 숨김
                buttonGroup.style.display = "block"; // 버튼 그룹 표시
            }
    
            // 선택지 1 클릭 시 동작
            document.getElementById("select1").onclick = function() {
                console.log("선택지 1 선택됨");
                casher.style.display = "none";
                resetModal();
            }
    
            // 선택지 2 클릭 시 동작
            document.getElementById("select2").onclick = function() {
                console.log("선택지 2 선택됨");
                casher.style.display = "none";
                resetModal();
            }

            // 선택지 3 클릭 시 동작
            document.getElementById("select3").onclick = function() {
                console.log("선택지 3 선택됨");
                casher.style.display = "none";
                resetModal();
            }
    
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    resetModal();
                }
            }

        break; // 첫 번째 교차 객체만 처리하고 루프 종료

    //         // 올바른 animationsMap 참조를 확인
    //         let npcObject = selectedObject;
    //         while (npcObject.parent && !npcObject.userData.animationsMap) {
    //             npcObject = npcObject.parent;  // 부모를 거슬러 올라가며 검사
    //         }
    //         if (npcObject.userData.animationsMap) {
    //             const mixer = npcObject.userData.mixer;
    //             const walkAction = npcObject.userData.animationsMap['walk'];
    //             const idleAction = npcObject.userData.animationsMap['idle'];
        
    //             // 모든 애니메이션 중지 및 'walk' 애니메이션 재생
    //             // mixer.stopAllAction();
    //             walkAction.play();

    // // 'walk' 애니메이션의 완료 이벤트 리스너 설정
    //             walkAction.clampWhenFinished = true; // 애니메이션 완료 후 마지막 포즈 유지
    //             walkAction.loop = THREE.LoopOnce; // 애니메이션을 한 번만 재생
    //             // mixer.addEventListener('finished', function(e) {
    //             //     if (e.action === walkAction) {
    //             idleAction.play(); // 'walk' 애니메이션이 끝나면 'idle' 애니메이션 재생
                
            
    //     }
        }
        else if (selectedObject.userData.type == 'teacher') {
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
            dialogText.onclick = function() {
                this.style.display = "none"; // 텍스트 숨김
                buttonGroup.style.display = "block"; // 버튼 그룹 표시
                recordButton.onclick()
            };
        
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                casher.style.display = "none";
                resetModal();
            };
        
            option1.onclick = function() {
                console.log("첫 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "안녕? 나는 선생님이란다. 학교에 온걸 환영해!";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option2.onclick = function() {
                console.log("두 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "어머..낯을가리는 아이인가?";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option3.onclick = function() {
                console.log("세 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "나는 선생님이란다.";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };  
        
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    resetModal();
                }
            };
            
        }
        else if (selectedObject.userData.type == 'game_friend') {
            game_name = "GameB"
            var modal = document.getElementById("myModal");
            var span = document.getElementsByClassName("close")[0];
            modal.style.display = "block";
            var gameAButton = document.getElementById("Game");
            gameAButton.setAttribute('data-path', 'BallGame/index.html'); // data-path 속성 설정

            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                modal.style.display = "none";
            }
    
            // 선택지 1 클릭 시 동작
            document.getElementById("option1").onclick = function() {
                console.log("선택지 1 선택됨");
                modal.style.display = "none";
            }
    
            // 선택지 2 클릭 시 동작
            document.getElementById("option2").onclick = function() {
                console.log("선택지 2 선택됨");
                modal.style.display = "none";
            }
    
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                }
            }

        break; // 첫 번째 교차 객체만 처리하고 루프 종료
        }
        else if (selectedObject.userData.type == 'friend_crash') {
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
            dialogText.onclick = function() {
                this.style.display = "none"; // 텍스트 숨김
                buttonGroup.style.display = "block"; // 버튼 그룹 표시
                recordButton.onclick()
            };
        
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                casher.style.display = "none";
                resetModal();
            };
        
            option1.onclick = function() {
                console.log("첫 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "어? 아...미안";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option2.onclick = function() {
                console.log("두 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "...";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option3.onclick = function() {
                console.log("세 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "아야! 너 뭐야?";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };  
        
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    resetModal();
                }
            };
        }
        else if (selectedObject.userData.type == 'rector') {
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
            dialogText.onclick = function() {
                this.style.display = "none"; // 텍스트 숨김
                buttonGroup.style.display = "block"; // 버튼 그룹 표시
                recordButton.onclick()
            };
        
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                casher.style.display = "none";
                resetModal();
            };
        
            option1.onclick = function() {
                console.log("첫 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "머리가 없는게 아니다. 내가 나아갈 뿐";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option2.onclick = function() {
                console.log("두 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "안녕, 오늘도 좋은 하루 보내렴";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option3.onclick = function() {
                console.log("세 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "...";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };  
        
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    resetModal();
                }
            };
        }

        else if (selectedObject.userData.type == 'npc3') {
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
            dialogText.onclick = function() {
                this.style.display = "none"; // 텍스트 숨김
                buttonGroup.style.display = "block"; // 버튼 그룹 표시
            };
        
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                casher.style.display = "none";
                resetModal();
            };
        
            // 각 선택지 클릭 시 동작
            option1.onclick = function() {
                console.log("첫 번째 선택지 선택됨");
                casher.style.display = "none";
                resetModal();
            };
        
            option2.onclick = function() {
                console.log("두 번째 선택지 선택됨");
                casher.style.display = "none";
                resetModal();
            };
        
            option3.onclick = function() {
                console.log("세 번째 선택지 선택됨");
                casher.style.display = "none";
                resetModal();
            };
        
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    resetModal();
                }
            };
        }
        else if (selectedObject.userData.type == 'friend_hurt') {
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
            dialogText.onclick = function() {
                this.style.display = "none"; // 텍스트 숨김
                buttonGroup.style.display = "block"; // 버튼 그룹 표시
                recordButton.onclick()
            };
        
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                casher.style.display = "none";
                resetModal();
            };
        
            // 각 선택지 클릭 시 동작
            option1.onclick = function() {
                console.log("첫 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "뭐야? 구경났어?";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option2.onclick = function() {
                console.log("두 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = "괜찮아. 혼자 양호실에 갈게. 걱정해줘서 고마워.";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };
        
            option3.onclick = function() {
                console.log("세 번째 선택지 선택됨");
                dialogText.style.display = "block";
                buttonGroup.style.display = "none";
                dialogText.innerHTML = ".....";
                dialogText.onclick = function() {
                    casher.style.display = "none";
                    resetModal();
                };
            };           
        
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
                if (event.target == casher) {
                    casher.style.display = "none";
                    resetModal();
                }
            };
        }
        

        
    // if (intersects[i].object.name !== "plane")
    //     console.log(intersects[i].object.name);
        if (intersects[i].object.name === "clickableBox") {
            var modal = document.getElementById("myModal");
            var span = document.getElementsByClassName("close")[0];
            sessionStorage.setItem('npc_name', selectedObject.userData.type);
            modal.style.display = "block";
    
            // 닫기 버튼 클릭 시 모달 닫기
            span.onclick = function() {
                modal.style.display = "none";
            }
    
            // 선택지 1 클릭 시 동작
            document.getElementById("option1").onclick = function() {
                console.log("선택지 1 선택됨");
                modal.style.display = "none";
            }
    
            // 선택지 2 클릭 시 동작
            document.getElementById("option2").onclick = function() {
                console.log("선택지 2 선택됨");
                modal.style.display = "none";
            }
    
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
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
            span.onclick = function() {
                modal.style.display = "none";
            }
    
            // 선택지 1 클릭 시 동작
            document.getElementById("option1").onclick = function() {
                console.log("선택지 1 선택됨");
                modal.style.display = "none";
            }
    
            // 선택지 2 클릭 시 동작
            document.getElementById("option2").onclick = function() {
                console.log("선택지 2 선택됨");
                modal.style.display = "none";
            }
    
            // 모달 창 바깥 영역 클릭 시 모달 닫기
            window.onclick = function(event) {
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
        span.onclick = function() {
            modal.style.display = "none";
        }

        // 선택지 1 클릭 시 동작
        document.getElementById("option1").onclick = function() {
            console.log("선택지 1 선택됨");
            modal.style.display = "none";
        }

        // 선택지 2 클릭 시 동작
        document.getElementById("option2").onclick = function() {
            console.log("선택지 2 선택됨");
            modal.style.display = "none";
        }

        // 모달 창 바깥 영역 클릭 시 모달 닫기
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

    break; // 첫 번째 교차 객체만 처리하고 루프 종료
    
}
    if (intersects[i].object.name === "tp") {
        // 캐릭터의 새 위치 설정
        this._model.position.x = 2328;
        this._model.position.y= 10;
        this._model.position.z = 247;
    
        // 캐릭터의 현재 y 위치를 유지하면서 캡슐 위치 업데이트
        const heightOffset = (this._model._capsule.end.y - this._model._capsule.start.y) / 2;
        this._model._capsule.start.set(this._model.position.x, this._model.position.y, this._model.position.z);
        this._model._capsule.end.set(this._model.position.x, this._model.position.y + heightOffset * 2, this._model.position.z);
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
}