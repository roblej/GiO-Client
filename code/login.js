export let globalId = "";
export let gender = "";
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const closeButtons = document.querySelectorAll('#loginModal .close');
const mainLogin = document.getElementById('main-login');
const loginpage = document.getElementById('loginpage')
const loginlogo = document.getElementById('login-logo')
const intro = document.getElementById('intro')
const signupPage = document.getElementById('signupPage')

// 페이지 로드 시 로그인 모달 표시
document.addEventListener('DOMContentLoaded', function() {
    loginModal.style.display = 'block';
});


mainLogin.addEventListener('click', function() {
    // 백그라운드 이미지가 수직으로 확대되면서 바뀌는 애니메이션 추가
    // loginModal.classList.remove('scale-down-ver-background');
    // loginModal.classList.add('scale-up-ver-background');
    // loginModal.classList.remove('main-background');
    // loginModal.classList.add('login-background');
    // document.getElementById('characters').style.display = 'none'

    signupPage.style.display = 'none';
    loginpage.style.display = 'block';
    loginpage.classList.add('fade-in'); // opacity 변화 애니메이션 추가
    // document.getElementById('mini_characters').style.display = 'block'
    // document.getElementById('mini_characters').classList.add('fade-in');
    intro.style.display = 'none';
    loginModal.classList.add('overlay');
    loginModal.classList.remove('hide-overlay')
    setTimeout(() => {
    }, 1000); // 애니메이션 시간과 맞춤
});

loginlogo.addEventListener('click', function() {
    // 백그라운드 이미지가 수직으로 축소되면서 원래 상태로 돌아가는 애니메이션 추가
    signupPage.style.display = 'none';
    // loginModal.classList.remove('scale-up-ver-background');
    // loginModal.classList.add('scale-down-ver-background');
    // loginModal.classList.remove('login-background');
    // loginModal.classList.add('main-background');
    loginpage.style.display = 'none';
    intro.style.display = 'block';
    intro.classList.add('fade-in'); // opacity 변화 애니메이션 추가
    loginModal.classList.add('hide-overlay');
    loginModal.classList.remove('overlay');
    // document.getElementById('characters').style.display = 'block'
    // document.getElementById('characters').classList.add('fade-in'); // opacity 변화 애니메이션 추가
    // document.getElementById('mini_characters').style.display = 'none'
    // document.getElementById('mini_characters').classList.add('fade-in');
    setTimeout(() => {
    }, 1000); // 애니메이션 시간과 맞춤
});

// 모달 닫기 버튼 처리
closeButtons.forEach(button => {
    button.addEventListener('click', function() {
        this.parentElement.parentElement.style.display = 'none';
        loadThreeJS(); // 로그인 성공 후 three.js 로드

    });
});

// 로그인 폼과 회원가입 폼 전환 함수
window.switchToSignup = function () {
    loginpage.style.display = 'none';
    // document.getElementById('characters').style.display = 'none'
    // document.getElementById('mini_characters').style.display = 'block'
    // loginModal.classList.remove('main-background');
    // loginModal.classList.add('login-background');
    intro.style.display = 'none'
    signupPage.style.display = 'block';
    signupPage.classList.add('fade-in'); // opacity 변화 애니메이션 추가
    loginModal.classList.add('overlay');
    loginModal.classList.remove('hide-overlay');
    // document.getElementById('mini_characters').classList.add('fade-in');
}

window.switchToLogin = function () {
    document.getElementById('signupComplete').style.display='none'
    signupPage.style.display = 'none';
    intro.style.display = 'none'
    loginpage.style.display = 'block';
    loginpage.classList.add('fade-in'); // opacity 변화 애니메이션 추가
    // document.getElementById('mini_characters').classList.add('fade-in');
}

// 로그인 및 회원가입 처리 함수 (예시)
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const id = loginForm.id.value;
    const password = loginForm.password.value;
    console.log('로그인 시도:', id, password);

    // Fetch API를 사용하여 서버에 로그인 요청을 보냅니다.
    // fetch('http://localhost:3000/login', {
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
            gender = data.gender
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
    const name = signupForm.querySelector('input[placeholder="예시) 홍길동"]').value;
    const gender = signupForm.querySelector('input[name="gender"]:checked')?.value;
    const year = signupForm.querySelector('input[placeholder="년(4자)"]').value;
    const month = signupForm.querySelector('input[placeholder="월"]').value;
    const day = signupForm.querySelector('input[placeholder="일"]').value;
    const email = signupForm.querySelector('input[type="email"]').value;

    // 비밀번호 일치 여부 확인
    if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    // 필수 입력값 확인
    if (!name || !gender || !year || !month || !day || !id || !password || !confirmPassword || !email) {
        alert('모든 필수 입력값을 입력해주세요.');
        return;
    }

    // 비밀번호 길이 및 포맷 확인 (6~12자의 영문, 숫자)
    const passwordRegex = /^[A-Za-z0-9]{6,12}$/;
    if (!passwordRegex.test(password)) {
        alert('비밀번호는 6~12자의 영문, 숫자만 사용 가능합니다.');
        return;
    }

    // 생년월일 합치기
    const birthdate = `${year}-${month}-${day}`;

    console.log('회원가입 시도:', id, password, name, gender, birthdate, email);

    // Fetch API를 사용하여 서버에 회원가입 요청 전송
    // fetch('http://localhost:3000/register', {
    fetch('https://gio.pe.kr:444/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            password: password,
            name: name,
            gender: gender,
            birthdate: birthdate,
            email: email
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
        // 회원가입 성공 UI 변경
        document.getElementById('signupForm').style.display='none';
        document.getElementById('signupComplete').style.display = 'flex';
        
        // 회원가입 성공 후 stickers 테이블에 row 추가
        return fetch('https://gio.pe.kr:444/addStickerRow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: id
            })
        });
    })
    .then(response => {
        if (response.ok) {
            console.log('스티커 row 추가 성공');
        } else {
            throw new Error('스티커 row 추가 중 오류 발생');
        }
    })
    .catch(error => {
        console.error('에러 발생:', error);
        alert(error.message);
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
