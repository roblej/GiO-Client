let recordButton = document.getElementById("recordButton");
let mediaRecorder;
let audioChunks = [];

recordButton.onclick = function() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordButton.textContent = "녹음 시작";
    } else {
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

    fetch('http://localhost:5000/recognize', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert("인식된 텍스트: " + data.transcript);
    })
    .catch(error => console.error("Error:", error));
}