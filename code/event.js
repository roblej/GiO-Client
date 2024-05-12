import { game_name } from './metaverse.js';

export function onMouseMove(event, appInstance) {
    event.preventDefault();

    // 마우스 위치를 정규화된 장치 좌표로 변환
    appInstance._mouse.x = (event.clientX / appInstance._divContainer.clientWidth) * 2 - 1;
    appInstance._mouse.y = -(event.clientY / appInstance._divContainer.clientHeight) * 2 + 1;

    // Raycaster 업데이트
    appInstance._raycaster.setFromCamera(appInstance._mouse, appInstance._camera);

    // 교차하는 객체 찾기
    const intersects = appInstance._raycaster.intersectObjects(appInstance._scene.children);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.name === "clickableBox") {
            if (appInstance._highlighted !== intersected) {
                // 이전에 강조된 객체가 있으면 원래 색상으로 되돌림
                if (appInstance._highlighted) {
                    appInstance._highlighted.material.color.set(appInstance._originalColor);
                }
                // 새로운 객체 강조
                appInstance._originalColor.copy(intersected.material.color); // 원래 색상 저장
                intersected.material.color.set(0xff0000); // 강조 색상으로 변경
                appInstance._highlighted = intersected; // 현재 강조된 객체 업데이트
            }
        } else if (appInstance._highlighted) {
            // 마우스가 다른 객체로 이동했을 때 원래 색상으로 되돌림
            appInstance._highlighted.material.color.set(appInstance._originalColor);
            appInstance._highlighted = null;
        }
    } else if (appInstance._highlighted) {
        // 마우스가 모든 객체에서 벗어났을 때 원래 색상으로 되돌림
        appInstance._highlighted.material.color.set(appInstance._originalColor);
        appInstance._highlighted = null;
    }
}
let globalId = "";
// document.addEventListener('DOMContentLoaded', () => {
//     sessionStorage.clear();  // sessionStorage의 모든 항목을 비우기
// });

// 모달 요소
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const closeButtons = document.querySelectorAll('.modal .close');

// 페이지 로드 시 로그인 모달 표시
document.addEventListener('DOMContentLoaded', function() {
    loginModal.style.display = 'block';
});

// 모달 닫기 버튼 처리
closeButtons.forEach(button => {
    button.addEventListener('click', function() {
        this.parentElement.parentElement.style.display = 'none';
    });
});

// 로그인 폼과 회원가입 폼 전환 함수
window.switchToSignup = function() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
}

window.switchToLogin = function() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
}


// 로그인 및 회원가입 처리 함수 (예시)
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const id = loginForm.id.value;
    const password = loginForm.password.value;
    console.log('로그인 시도:', id, password);

    // Fetch API를 사용하여 서버에 로그인 요청을 보냅니다.
    // fetch('http://127.0.0.1:3000/login', {
    fetch('http://ec2-54-252-221-53.ap-southeast-2.compute.amazonaws.com:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === '로그인 성공') {
            console.log('로그인 성공');
            globalId = id
            loginModal.style.display = 'none'; // 로그인 모달을 숨깁니다.
            // 추가적인 성공 후 로직을 구현할 수 있습니다. 예: 페이지 리다이렉션
        } else {
            alert(data.message); // 서버로부터의 응답 메시지를 경고창으로 표시
        }
    })
    .catch(error => {
        console.error('로그인 요청 실패:', error);
        alert('로그인 과정에서 오류가 발생했습니다.');
    });
});

signupForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const id = signupForm.id.value;
    const password = signupForm.password.value;
    const confirmPassword = signupForm.confirmPassword.value;

    if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    console.log('회원가입 시도:', id, password);

    // Fetch API를 사용하여 서버에 회원가입 요청 전송
    // fetch('http://127.0.0.1:3000/register', {
    fetch('http://ec2-54-252-221-53.ap-southeast-2.compute.amazonaws.com:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            password: password
        })
    })
    .then(response => {
        if (response.ok) {
            return response.json(); // 성공 시 JSON 데이터로 파싱
        } else if (response.status === 409) {
            throw new Error('중복된 아이디입니다.'); // 409 상태 코드 처리
        } else {
            throw new Error('회원가입 중 오류 발생'); // 기타 오류 처리
        }
    })
    .then(data => {
        console.log('회원가입 성공:', data);
        alert('회원가입 성공!');
        // 성공 후 추가적인 로직 처리 (예: 로그인 페이지로 리다이렉트)
    })
    .catch(error => {
        console.error('회원가입 실패:', error);
        alert(error.message); // 에러 메시지 표시
    });
});


document.addEventListener('DOMContentLoaded', () => {
    const option1Button = document.getElementById('option1');
    // const userId = sessionStorage.getItem('userId')
    
    const eventHandler = () => {
        console.log(globalId)
        console.log(game_name)
        fetch(`http://ec2-54-252-221-53.ap-southeast-2.compute.amazonaws.com:3000/api/gamescore?id=${globalId}&game_name=${game_name}`)
        // fetch(`http://127.0.0.1:3000/api/gamescore?id=${globalId}&game_name=${game_name}`)
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    };
    
    option1Button.addEventListener('click', eventHandler);
});

document.addEventListener('DOMContentLoaded', () => {
    const option1Button = document.getElementById('option2');

    option1Button.addEventListener('click', () => {
        const randomScore = Math.floor(Math.random() * 11) * 10; // 0부터 100까지 10의 단위로 랜덤 점수 생성

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: globalId,
                game_name: game_name,
                score: randomScore // 랜덤 점수 사용
            }),
        };
        
        // fetch 함수를 사용하여 POST 요청 보내기
        // fetch('http://127.0.0.1:3000/api/gamescore', requestOptions)
        fetch('http://ec2-54-252-221-53.ap-southeast-2.compute.amazonaws.com:3000/api/gamescore', requestOptions)
            .then(response => response.json())
            .then(data => console.log(data)) // 응답 데이터 처리
            .catch(error => console.error('Error:', error)); // 에러 처리
    });
});

// 게임 시작 버튼 이벤트 리스너 추가
document.getElementById('Game').addEventListener('click', function() {
    var gameModal = document.getElementById('gameModal');
    var unityGame = document.getElementById('unityGame');
    var gamePath = this.getAttribute('data-path');
    unityGame.src = `http://ec2-54-252-221-53.ap-southeast-2.compute.amazonaws.com:8080/${gamePath}`;
    // unityGame.src = `http://localhost:8080/${gamePath}`;
    gameModal.style.display = 'block'; // 게임 모달을 표시
});

// 모달 닫기 버튼 이벤트 리스너 추가
document.getElementById('closeGameModal').addEventListener('click', function() {
    var gameModal = document.getElementById('gameModal');
    var unityGame = document.getElementById('unityGame');
    unityGame.src = ''; // 리소스 해제
    gameModal.style.display = 'none'; // 게임 모달을 숨김
});

// 모달 바깥 영역 클릭시 모달 닫기 기능 추가
window.onclick = function(event) {
    var gameModal = document.getElementById('gameModal');
    if (event.target == gameModal) {
        var unityGame = document.getElementById('unityGame');
        unityGame.src = ''; // 리소스 해제
        gameModal.style.display = 'none'; // 게임 모달을 숨김
    }
}
