import { game_name } from './metaverse.js';
import { globalId } from './login.js';

// export var stickerNumber = 0

export function updateSticker(stickerNumber) {
    fetch('https://gio.pe.kr:444/updateSticker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: globalId,
        stickerNumber: stickerNumber
      })
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('스티커 업데이트 실패');
      }
    })
    .then(data => {
      console.log('스티커 업데이트 성공:', data);
      alert('스티커 업데이트 성공!');
    })
    .catch(error => {
      console.error('스티커 업데이트 실패:', error);
      alert(error.message);
    });
  }

  export function getSticker(id) {
    fetch(`https://gio.pe.kr:444/getSticker/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('스티커 조회 실패');
      }
    })
    .then(data => {
      console.log('스티커 조회 성공:', data);
      alert('스티커 조회 성공!');
      // 여기서 data를 이용해 UI를 업데이트할 수 있습니다.
    })
    .catch(error => {
      console.error('스티커 조회 실패:', error);
      alert(error.message);
    });
  }

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
// document.addEventListener('DOMContentLoaded', () => {
//     sessionStorage.clear();  // sessionStorage의 모든 항목을 비우기
// });

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') { // ESC 키가 눌렸을 때
        var modal = document.getElementById('openModal');
        modal.style.display = 'block'; // 모달을 보이게 설정
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const option1Button = document.getElementById('option1');
    // const userId = sessionStorage.getItem('userId')
    
    const eventHandler = () => {
        console.log(globalId)
        console.log(game_name)
        fetch(`https://gio.pe.kr:444/api/gamescore?id=${globalId}&game_name=${game_name}`)
        // fetch(`http://127.0.0.1:3000/api/gamescore?id=${globalId}&game_name=${game_name}`)
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    };
    
    option1Button.addEventListener('click', eventHandler);
});

// 게임 시작 버튼 이벤트 리스너 추가
document.getElementById('Game').addEventListener('click', function() {
    var textmodal = document.getElementById("myModal");
    var gameModal = document.getElementById('gameModal');
    var unityGame = document.getElementById('unityGame');
    var gamePath = this.getAttribute('data-path');

    // Unity WebGL 게임 로드
    unityGame.src = `https://gio.pe.kr:447/${gamePath}`;
    gameModal.style.display = 'block'; // 게임 모달을 표시
    textmodal.style.display = "none";
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

// Unity에서 메시지를 받을 이벤트 리스너 추가
window.addEventListener('message', function(event) {
    if (event.data.type === 'score') {
        console.log(event.data.value)
        const game_score = event.data.value
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: globalId,
                game_name: game_name,
                score: game_score
            }),
        };
        
        // fetch 함수를 사용하여 POST 요청 보내기
        // fetch('http://127.0.0.1:3000/api/gamescore', requestOptions)
        fetch('https://gio.pe.kr:444/api/gamescore', requestOptions)
            .then(response => response.json())
            .then(data => console.log(data)) // 응답 데이터 처리
            .catch(error => console.error('Error:', error)); // 에러 처리

    }
}, false);
  