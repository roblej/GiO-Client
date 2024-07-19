import { getSticker } from "./event.js";
import { globalId } from "./login.js";

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

document.addEventListener("DOMContentLoaded", function() {
  var modal = document.getElementById("pageModal");
  var btn = document.getElementById("openModal");
  var span = document.getElementsByClassName("close-mypage")[0];

  console.log(btn); // 버튼 요소를 콘솔에 출력하여 확인

  btn.onclick = function() {
      console.log("Button clicked"); // 버튼 클릭 확인
      console.log("Current display style: " + window.getComputedStyle(modal).display); // 현재 display 스타일 로그
      if (window.getComputedStyle(modal).display === "none") {
          modal.style.display = "flex"; // 모달을 열 때 display: flex;
          console.log("Modal opened"); // 모달 열림 확인
      } else {
          modal.style.display = "none"; // 모달을 닫을 때 display: none;
          console.log("Modal closed"); // 모달 닫힘 확인
      }
  }

  span.onclick = function() {
      modal.style.display = "none";
      console.log("Close button clicked"); // 닫기 버튼 클릭 확인
  }

  window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" || event.key === "Esc") {
        if (modal.style.display === "flex") {
            modal.style.display = "none";
        } else {
            modal.style.display = "flex";
        }
    }
});
  // 초기화
  document.getElementById("Mypage").style.display = "block";
});