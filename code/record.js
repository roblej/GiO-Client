export let recordButton = document.getElementById("recordButton");
document.addEventListener('DOMContentLoaded', function() {
let selectButton1 = document.getElementById("select1");
let selectButton2 = document.getElementById("select2");
let selectButton3 = document.getElementById("select3");
let mediaRecorder;
let audioChunks = [];

// Levenshtein Distance Function
function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,                 // deletion
                matrix[i][j - 1] + 1,                 // insertion
                matrix[i - 1][j - 1] + substitutionCost // substitution
            );
        }
    }

    return matrix[a.length][b.length];
}

recordButton.onclick = function() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordButton.textContent = "녹음 시작";
    } else {
        console.log(selectButton1.innerHTML)
        navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream,{mimeType:`audio/webm`});
            mediaRecorder.start();
            recordButton.textContent = "녹음 중지";

            audioChunks = [];
            mediaRecorder.ondataavailable = function(event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { 'type' : 'audio/wav' });
                sendAudioToServer(audioBlob);
            };
        });
    }
};

function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append("file", audioBlob);

    // fetch('http://localhost:5000/recognize', {
    fetch('http://3.106.251.131:5000/recognize', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert("인식된 텍스트: " + data.transcript);
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
        closestButton.click(); // 가장 가까운 버튼을 프로그래매틱하게 클릭
        alert("클릭된 버튼: " + closestButton.innerHTML); // 콘솔에 클릭된 버튼의 텍스트를 로그
    } else {
        console.error("가장 가까운 버튼을 찾을 수 없습니다.");
    }
}
})