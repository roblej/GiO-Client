export let globalId = "";

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
    fetch('https://gio.pe.kr:444/login', {
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
            loadThreeJS(); // 로그인 성공 후 three.js 로드
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
    fetch('https://gio.pe.kr:444/register', {
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
        switchToLogin()
    })
    .catch(error => {
        console.error('회원가입 실패:', error);
        alert(error.message); // 에러 메시지 표시
    });
});

function loadThreeJS() {
    const script1 = document.createElement('script');
    script1.type = 'module';
    script1.src = 'metaverse.js';
    script1.onload = () => {
        console.log('metaverse.js loaded');
        if (window.initThreeJS) {
            window.initThreeJS(); // initThreeJS 함수를 호출
        } else {
            console.error('initThreeJS function not found in metaverse.js');
        }
    };
    script1.onerror = () => {
        console.error('Failed to load metaverse.js');
    };
    document.body.appendChild(script1);
}
