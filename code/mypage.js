import { getSticker, setSTTutorial } from "./event.js";
import { globalId } from "./login.js";
import {getSTTutorial} from './event.js';
import { audioElement } from "./event.js";
// function openTab(evt, tabName) {
//     var i, tabcontent, tablinks;
//     tabcontent = document.getElementsByClassName("tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].style.display = "none";
//     }
//     tablinks = document.getElementsByClassName("tablinks");
//     for (i = 0; i < tablinks.length; i++) {
//         tablinks[i].className = tablinks[i].className.replace(" active", "");
//     }
//     document.getElementById(tabName).style.display = "block";
//     evt.currentTarget.className += " active";
// }

// document.addEventListener("DOMContentLoaded", function() {
//   var modal = document.getElementById("pageModal");
//   var btn = document.getElementById("openModal");
//   var span = document.getElementsByClassName("close-mypage")[0];

//   console.log(btn); // 버튼 요소를 콘솔에 출력하여 확인

//   btn.onclick = function() {
//       console.log("Button clicked"); // 버튼 클릭 확인
//       console.log("Current display style: " + window.getComputedStyle(modal).display); // 현재 display 스타일 로그
//       if (window.getComputedStyle(modal).display === "none") {
//           modal.style.display = "flex"; // 모달을 열 때 display: flex;
//           console.log("Modal opened"); // 모달 열림 확인
//       } else {
//           modal.style.display = "none"; // 모달을 닫을 때 display: none;
//           console.log("Modal closed"); // 모달 닫힘 확인
//       }
//   }

//   span.onclick = function() {
//       modal.style.display = "none";
//       console.log("Close button clicked"); // 닫기 버튼 클릭 확인
//   }

//   window.onclick = function(event) {
//     if (event.target == modal) {
//         modal.style.display = "none";
//     }
// }
// document.addEventListener("keydown", function(event) {
//     if (event.key === "Escape" || event.key === "Esc") {
//         if (modal.style.display === "flex") {
//             modal.style.display = "none";
//         } else {
//             modal.style.display = "flex";
//         }
//     }
// });
//   // 초기화
//   document.getElementById("Mypage").style.display = "block";
// });

    var tabHistory = [];
    var modal = document.getElementById("pageModal");

    // 기본 초기화 함수
    function resetToInitialState() {
        tabHistory = ['InitialState'];  // 기본 상태로 히스토리 초기화

        var tabcontent = document.getElementsByClassName("tabcontent");
        for (var i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";  // 모든 탭 숨기기
        }

        var images = document.querySelectorAll('#mypageMain *');
        images.forEach(function(img) {
            img.classList.remove('hidden');  // 모든 기본 이미지 표시
        });
    }

    function openModal() {
        modal.style.display = 'flex';
        resetToInitialState();  // 초기화 상태로 설정
    }

    function closeModal() {
        modal.style.display = 'none';
        resetToInitialState();  // 모달을 닫을 때 초기화 상태로 설정
    }

    // ID가 'mypagebtn'인 div 클릭 이벤트로 변경
    var mypagebtn = document.getElementById('mypagebtn');
    mypagebtn.addEventListener('click', function() {
        // 모달이 열려 있는지 여부 확인
        if (modal.style.display === "none" || modal.style.display === "") {
            openModal();
                if(getSTTutorial() === 'true'){
                    document.querySelector('.left').style.display = 'block';
                    document.querySelector('.tori_help').style.display = 'none';
                    document.querySelector('.left p').innerHTML = '여긴 마이페이지야!<br>네가 GiO를 얼마나 탐험했는지<br>확인할 수 있어!'
                    
                    // 16.mp3 재생

                    audioElement.src = './data/audio/16.mp3';  // 16.mp3 파일 경로
                    audioElement.play();

                    document.querySelector('.left .next_btn').onclick = function () {
                        document.querySelector('.left p').innerHTML = '방금 얻은 스티커는<br>스티커북에서 확인 가능해!'
                        
                        // 16.mp3 중지, 17.mp3 재생
                        audioElement.pause();
                        audioElement.currentTime = 0;

                        // 17.mp3 재생

                        audioElement.src = './data/audio/17.mp3';  // 17.mp3 파일 경로
                        audioElement.play();

                        document.querySelector('.left .next_btn').onclick = function () {
                            document.querySelector('.left p').innerHTML = '스티커북을 눌러<br> 확인해보자!'
                            document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/209.png')";


                             // 17.mp3 중지, 18.mp3 재생
                            audioElement.pause();
                            audioElement.currentTime = 0;

                            // 18.mp3 재생

                            audioElement.src = './data/audio/18.mp3';  // 18.mp3 파일 경로
                            audioElement.play();

                            const originalOnClick = document.querySelector('#stickerbook').onclick;
                            document.querySelector('#stickerbook').onclick = function () {
                                if (originalOnClick) originalOnClick(); // 기존의 기능을 수행
                                // 추가 기능 수행
                                document.querySelector('.left').style.display = 'none';
                                document.querySelector('.tori_help').style.display = 'block'
                                document.querySelector('.tori_help p').innerHTML = '와~ 이것봐!<br><파란 공> 스티커야!<br>정말 멋지다!'

                                 // 18.mp3 중지, 19.mp3 재생
                                audioElement.pause();
                                audioElement.currentTime = 0;

                                // 19.mp3 재생
                                const audioElement19 = document.createElement('audio');
                                audioElement.src = './data/audio/19.mp3';  // 19.mp3 파일 경로
                                audioElement.play();
                                  
                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/214.png')";
                                document.querySelector('.tori_help .next_btn').onclick = function () {
                                        document.querySelector('.tori_help p').innerHTML = '<파란 공> 스티커 외에<br>다른 스티커도 획득 할 수 있어!'
                                  document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/215.png')";
                                        
                                        // 19.mp3 중지, 20.mp3 재생
                                        audioElement.pause();
                                        audioElement.currentTime = 0;
                                        
                                        // 20.mp3 재생
                                        const audioElement20 = document.createElement('audio');
                                        audioElement.src = './data/audio/20.mp3';  // 20.mp3 파일 경로
                                        audioElement.play();

                                        document.querySelector('.tori_help .next_btn').onclick = function () {
                                            document.querySelector('.tori_help p').innerHTML = '<파란 공> 옆에 있는<br>물음표를 눌러볼래?'

                                            // 20.mp3 중지, 21.mp3 재생
                                            audioElement.pause();
                                            audioElement.currentTime = 0;

                                            // 21.mp3 재생
                                            audioElement.src = './data/audio/21.mp3';  // 21.mp3 파일 경로
                                            audioElement.play();

                                            const originalOnClick2 = document.querySelector('#mark2').onclick;
                                            document.querySelector('#mark2').onclick = function () {
                                                if (originalOnClick2) originalOnClick2(); // 기존의 기능을 수행
                                                document.querySelector('.tori_help').style.display = 'none'
                                                document.querySelector('.left').style.display = 'block'
                                                document.querySelector('.left p').innerHTML = '이 스티커는 다른 장소로<br>이동하면 얻을 수 있는<br>스티커같아.'
                                                document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/218.png')";
                                                
                                                // 21.mp3 중지, 22.mp3 재생
                                                audioElement.pause();
                                                audioElement.currentTime = 0;

                                                // 22.mp3 재생

                                                audioElement.src = './data/audio/22.mp3';  // 22.mp3 파일 경로
                                                audioElement.play();

                                                document.querySelector('.left .next_btn').onclick = function () {
                                                    document.querySelector('.left p').innerHTML = '마침 학교도 둘러봤으니<br>다른 장소로 이동을 해볼까?'
                                                    
                                                    // 22.mp3 중지, 23.mp3 재생
                                                    audioElement.pause();
                                                    audioElement.currentTime = 0;

                                                    // 23.mp3 재생

                                                    audioElement.src = './data/audio/23.mp3';  // 23.mp3 파일 경로
                                                    audioElement.play();
                                                    document.querySelector('.left .next_btn').onclick = function () {
                                                        document.querySelector('.left p').innerHTML = '노란색 X 책갈피를 누르면<br>마이페이지를 나갈 수 있어!'
                                                        document.getElementById('shadow_mp').style.backgroundImage = "url('data/tutorial/dimmed/220.png')";
                                                        setSTTutorial('false');
                                                        
                                                        // 23.mp3 중지, 24.mp3 재생
                                                        audioElement.pause();
                                                        audioElement.currentTime = 0;

                                                        // 24.mp3 재생

                                                        audioElement.src = './data/audio/24.mp3';  // 24.mp3 파일 경로
                                                        audioElement.play();

                                                        document.querySelector('.left .next_btn').onclick = function () {
                                                            document.querySelector('.left').style.display = 'none';
                                                            document.querySelector('#getsticker').style.display = 'none'
                                                            audioElement.pause();  // 24.mp3 음성 중지
                                                        }

                                                    }
                                                }
                                            }

                                            }
                                }
                            }
                        }
                    }
                }
        } else {
            closeModal();
        }
    });

    