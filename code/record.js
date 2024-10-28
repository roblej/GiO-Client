import config from './config.js';

// 자소 분리 함수
function decomposeHangul(syllable) {
    const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    const JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
    const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    
    const code = syllable.charCodeAt(0) - 44032;
    
    const cho = Math.floor(code / 588);
    const jung = Math.floor((code - (cho * 588)) / 28);
    const jong = code % 28;
    
    return [CHO[cho], JUNG[jung], JONG[jong]].join("");
}

// 문자열을 자소 단위로 분리하는 함수
function decomposeString(str) {
    return str.split("").map(char => {
        const code = char.charCodeAt(0);
        if (code >= 44032 && code <= 55203) { // 한글 음절 범위
            return decomposeHangul(char);
        }
        return char; // 한글이 아니면 그대로 반환
    }).join("");
}

// 레벤슈타인 거리 함수 (자소 분리 적용)
function levenshtein(a, b) {
    const decompA = decomposeString(a);
    const decompB = decomposeString(b);

    const matrix = Array.from({ length: decompA.length + 1 }, (_, i) =>
        Array.from({ length: decompB.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

    for (let i = 1; i <= decompA.length; i++) {
        for (let j = 1; j <= decompB.length; j++) {
            const substitutionCost = decompA[i - 1] === decompB[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,                 // 삭제
                matrix[i][j - 1] + 1,                 // 삽입
                matrix[i - 1][j - 1] + substitutionCost // 대체
            );
        }
    }

    return matrix[decompA.length][decompB.length];
}
let talk_btn = "";
let talkBtnPromiseResolve;

export let talkBtnPromise = new Promise((resolve) => {
    talkBtnPromiseResolve = resolve;  // 초기 Promise를 생성
});

export function setTalkBtn(value) {
    talk_btn = value;
    talkBtnPromiseResolve();  // 현재 Promise를 resolve
    resetTalkBtnPromise();    // 새로운 Promise로 초기화
}

export function getTalkBtn() {
    return talk_btn;
}

// 새로운 talkBtnPromise를 초기화하는 함수
function resetTalkBtnPromise() {
    talkBtnPromise = new Promise((resolve) => {
        talkBtnPromiseResolve = resolve;  // 새로운 Promise 생성 및 resolve 저장
    });
}


// 기존 코드 유지
let recordButton = document.getElementById("recordButton");
document.addEventListener('DOMContentLoaded', function() {
    let selectButton1 = document.getElementById("select1");
    let selectButton2 = document.getElementById("select2");
    let selectButton3 = document.getElementById("select3");
    let mediaRecorder;
    let audioChunks = [];
    let recognition;
    let recordingDiv = document.getElementById("recording"); // id가 recording인 div

    recordButton.onclick = function() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton.textContent = "녹음 시작";
            resetRecordingDiv(); // 녹음 종료 시 상태를 복원
        } else {
            navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorder.start();
                recordingDiv.style.display = 'flex'
                recordButton.textContent = "녹음 중지";

                audioChunks = [];
                mediaRecorder.ondataavailable = function(event) {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = function() {
                    const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav' });
                    sendAudioToServer(audioBlob);
                    resetRecordingDiv(); // 녹음 종료 시 상태를 복원
                };

                // 1초 후에 recordingDiv의 상태를 변경
                setTimeout(function() {
                    recordingDiv.innerHTML = ""; // 공백으로 변경
                    recordingDiv.style.backgroundImage = "url('data/recording.png')"; // 배경 이미지 교체
                    recordingDiv.classList.add("blinking"); // 점등하는 애니메이션 추가
                }, 1000);

                // 음성 인식 설정
                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                } else if ('SpeechRecognition' in window) {
                    recognition = new SpeechRecognition();
                } else {
                    alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
                    return;
                }

                recognition.lang = 'ko-KR';
                recognition.interimResults = true;
                recognition.continuous = true;

                recognition.onresult = function(event) {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            mediaRecorder.stop();
                            recordButton.textContent = "녹음 시작";
                            recognition.stop();
                            resetRecordingDiv(); // 음성 인식이 끝나면 상태를 복원
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                };

                recognition.start();
            });
        }
    };

    // 녹음이 종료되었을 때 recordingDiv의 상태를 복원하는 함수
    function resetRecordingDiv() {
        recordingDiv.innerHTML = "정답을 소리내어 말해보세요.";
        recordingDiv.style.backgroundImage = "url(data/recordbg.png"; // 원래 배경으로 복원
        recordingDiv.classList.remove("blinking"); // 점등 애니메이션 제거
        recordingDiv.style.display='none'
    }



    function sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append("file", audioBlob);

        fetch(`${config.Domain}:446/recognize`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // alert("인식된 텍스트: " + data.transcript);
            selectClosestButton(data.transcript);
        })
        .catch(error => console.error("Error:", error));
    }

    function selectClosestButton(transcript) {
        const buttons = [selectButton1, selectButton2, selectButton3];
        let minDistance = Infinity;
        let closestButton;

        buttons.forEach(button => {
            const distance = levenshtein(transcript, button.innerHTML);
            if (distance < minDistance) {
                minDistance = distance;
                closestButton = button;
            }
        });

        if (closestButton) {
            // closestButton.click(); // 가장 가까운 버튼을 프로그래매틱하게 클릭
            // alert("클릭된 버튼: " + closestButton.innerHTML); // 콘솔에 클릭된 버튼의 텍스트를 로그
            setTalkBtn(closestButton.innerHTML)
            console.log(talk_btn)
        } else {
            console.error("가장 가까운 버튼을 찾을 수 없습니다.");
        }
    }
});
export async function sendMessageToClova(message) {
    const helperElement = document.getElementById('helper');
    // const response = await fetch(`${config.Domain}:446/clova`, {
    const response = await fetch('http://localhost:5000/clova', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    });

    const result = await response.json();
    console.log(result.clova_response); // 클로바 챗봇 응답 출력
    // document.getElementById('helper_text').innerHTML = result.clova_response;
    document.querySelector('.tori_help p').innerHTML = result.clova_response;
    // helperElement.style.display = 'block'
    const utterance = new SpeechSynthesisUtterance(result.clova_response);
    utterance.lang = 'ko-KR'; // 한국어 설정
    utterance.rate = 1; // 읽기 속도 조절 (기본값: 1)
    utterance.pitch = 1; // 음높이 조절 (기본값: 1)
    
    // 음성 합성 실행
    window.speechSynthesis.speak(utterance);
}
// var question = '대화 상대가 {teacher}이고 질문이 {안녕? 새로 온 학생이니} 일때, 선택지는 {네, 맞아요. 안녕하세요},{(무시하고 갈 길을 간다.)},{누구세요}가 있다. 그리고 아이가 고른 선택지는 {(무시하고 갈 길을 간다.)}이다.'
// sendMessageToClova(question)
