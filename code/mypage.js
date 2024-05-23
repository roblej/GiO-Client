document.addEventListener("DOMContentLoaded", function() {
    var modal = document.getElementById("pageModal");
    var btn = document.getElementById("openModal");
    var span = document.getElementsByClassName("close-mypage")[0];

    btn.onclick = function() {
        console.log("Current display style: " + window.getComputedStyle(modal).display); // 현재 display 스타일 로그
        if (window.getComputedStyle(modal).display === "none") {
            modal.style.display = "flex"; // 모달을 열 때 display: flex;
        } else {
            modal.style.display = "none"; // 모달을 닫을 때 display: none;
        }
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" || event.key === "Esc") {
            modal.style.display = "none";
        }
    });

    // 탭 기능
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

    // 초기화
    document.getElementById("Mypage").style.display = "block";
  });