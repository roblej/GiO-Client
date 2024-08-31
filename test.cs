using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices; // DllImport를 사용하기 위해 필요
using UnityEngine;
using TMPro;
using UnityEngine.UI;
using UnityEngine.Networking;

public class QuizManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SendScoreToJS(int score);

    public List<QuizQuestion> questions; // 퀴즈 질문 리스트
    private List<int> remainingQuestions; // 남은 질문 인덱스 리스트
    public TextMeshProUGUI questionText; // 질문을 표시하는 UI 텍스트
    public TextMeshProUGUI characterDialogueText; // 캐릭터 대사를 표시하는 UI 텍스트
    public GameObject dialogueBubble; // 대사를 표시할 말풍선 오브젝트
    public Button[] choiceButtons; // 선택지 버튼들
    public TextMeshProUGUI countText; // 정답 수를 표시하는 UI 텍스트
    public TextMeshProUGUI scoreText; // 점수를 표시하는 UI 텍스트
    public Image characterImage; // 캐릭터 이미지를 표시하는 UI 이미지
    public RectTransform characterRectTransform; // 캐릭터 이미지의 RectTransform
    public Slider timerBar; // 타이머 바
    public GameObject resultPanel; // 결과 화면을 표시할 패널
    public TextMeshProUGUI resultText; // 결과 화면의 텍스트

    private QuizQuestion currentQuestion;
    private int correctCount = 0; // 정답 수
    private int score = 0; // 점수
    private float timeLimit = 30f; // 각 문제당 제한 시간 (30초)
    private float currentTime; // 현재 시간
    private Vector2 offScreenPosition; // 캐릭터가 사라질 때 위치
    private Vector2 centerScreenPosition; // 캐릭터가 나타날 때 위치
    private bool isGameOver = false; // 게임 종료 상태 확인

    void Start()
    {
        // 화면 밖 왼쪽 시작 위치 설정
        offScreenPosition = new Vector2(-Screen.width, characterRectTransform.anchoredPosition.y);

        // 화면의 특정 위치(-563, y)에서 멈춤 위치 설정
        centerScreenPosition = new Vector2(-563, characterRectTransform.anchoredPosition.y);

        // 시작 시 캐릭터를 화면 밖으로 이동
        characterRectTransform.anchoredPosition = offScreenPosition;

        // 대사와 말풍선을 초기에는 비활성화
        characterDialogueText.gameObject.SetActive(false);
        dialogueBubble.SetActive(false);

        InitializeQuestions();
        ShowRandomQuestion();
        resultPanel.SetActive(false); // 결과 화면 숨기기
    }

    void InitializeQuestions()
    {
        remainingQuestions = new List<int>();
        for (int i = 0; i < questions.Count; i++)
        {
            remainingQuestions.Add(i);
        }
    }

    void ShowRandomQuestion()
    {
        if (remainingQuestions.Count == 0)
        {
            EndGame();
            return;
        }

        int randomIndex = Random.Range(0, remainingQuestions.Count);
        int questionIndex = remainingQuestions[randomIndex];
        remainingQuestions.RemoveAt(randomIndex);

        currentQuestion = questions[questionIndex];
        questionText.text = currentQuestion.question;
        characterDialogueText.text = currentQuestion.characterDialogue;
        characterImage.sprite = currentQuestion.characterImage;

        // 캐릭터와 대사 나타내기
        StartCoroutine(MoveCharacterToPosition());

        // 선택지 섞기 및 버튼에 할당
        List<string> choices = new List<string>(currentQuestion.choices);
        for (int i = 0; i < choiceButtons.Length; i++)
        {
            int randomChoiceIndex = Random.Range(0, choices.Count);
            choiceButtons[i].GetComponentInChildren<TextMeshProUGUI>().text = choices[randomChoiceIndex];
            choices.RemoveAt(randomChoiceIndex);
        }

        // 타이머 초기화
        currentTime = timeLimit;
        timerBar.maxValue = timeLimit;
        timerBar.value = currentTime;
        StartCoroutine(TimerCountdown());
    }

    IEnumerator MoveCharacterToPosition()
    {
        float duration = 1.0f; // 이동에 걸리는 시간
        float elapsedTime = 0f;

        Vector2 startingPosition = characterRectTransform.anchoredPosition;

        while (elapsedTime < duration)
        {
            characterRectTransform.anchoredPosition = Vector2.Lerp(startingPosition, centerScreenPosition, elapsedTime / duration);
            elapsedTime += Time.deltaTime;
            yield return null;
        }

        characterRectTransform.anchoredPosition = centerScreenPosition;

        // 캐릭터가 특정 위치에 도달했을 때 대사와 말풍선을 표시
        if (characterRectTransform.anchoredPosition == centerScreenPosition)
        {
            characterDialogueText.gameObject.SetActive(true);
            dialogueBubble.SetActive(true);
        }
    }

    IEnumerator MoveCharacterOffScreen()
    {
        float duration = 1.0f; // 이동에 걸리는 시간
        float elapsedTime = 0f;

        Vector2 startingPosition = characterRectTransform.anchoredPosition;

        // 대사와 말풍선 숨기기
        characterDialogueText.gameObject.SetActive(false);
        dialogueBubble.SetActive(false);

        while (elapsedTime < duration)
        {
            characterRectTransform.anchoredPosition = Vector2.Lerp(startingPosition, offScreenPosition, elapsedTime / duration);
            elapsedTime += Time.deltaTime;
            yield return null;
        }

        characterRectTransform.anchoredPosition = offScreenPosition;
    }

    IEnumerator TimerCountdown()
    {
        while (currentTime > 0)
        {
            currentTime -= Time.deltaTime;
            timerBar.value = currentTime;
            yield return null;
        }

        StartCoroutine(MoveCharacterOffScreen());
        yield return new WaitForSeconds(1.0f); // 캐릭터가 사라질 시간을 기다림
        ShowRandomQuestion(); // 시간이 종료되면 다음 문제로 넘어감
    }

    public void OnChoiceSelected(int index)
    {
        if (choiceButtons[index].GetComponentInChildren<TextMeshProUGUI>().text == currentQuestion.choices[currentQuestion.correctAnswerIndex])
        {
            correctCount++;
            score += 100;
            Debug.Log("정답!");
        }
        else
        {
            Debug.Log("오답!");
        }

        UpdateUI();
        StartCoroutine(MoveCharacterOffScreen());
        StartCoroutine(WaitAndShowNextQuestion(1.0f)); // 1초 대기 후 다음 문제로 넘어감
    }

    IEnumerator WaitAndShowNextQuestion(float waitTime)
    {
        yield return new WaitForSeconds(waitTime);
        ShowRandomQuestion();
    }

    void UpdateUI()
    {
        scoreText.text = " " + score;
    }

    void EndGame()
    {
        isGameOver = true;
        resultPanel.SetActive(true);
        resultText.text = "게임이 끝났어!\n점수: " + score;

        // WebGL에서 점수 전송 호출
        SendScoreToHTML(score);
    }

    private void SendScoreToHTML(int score)
    {

        SendScoreToJS(score);
#endif
    }

    IEnumerator SendGameData(string id, string game_name, int score)
    {
        // 서버 정보 가져오기
        ServerInfo serverInfo = ServerManager.instance.serverInfo;

        // 데이터를 JSON 형식으로 구성
        GameData gameData = new GameData(id, game_name, score);
        string jsonData = JsonUtility.ToJson(gameData);
        Debug.Log("JSON Data to Send: " + jsonData); // 전송할 JSON 데이터 출력

        // UnityWebRequest 설정 및 요청 보내기
        string requestUrl = serverInfo.apiPathScore;
        UnityWebRequest www = new UnityWebRequest(requestUrl, "POST");
        byte[] bodyRaw = new System.Text.UTF8Encoding().GetBytes(jsonData);
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        yield return www.SendWebRequest();

        // 결과 확인
        if (www.result == UnityWebRequest.Result.ConnectionError || www.result == UnityWebRequest.Result.ProtocolError)
        {
            Debug.LogError(www.error);
        }
        else
        {
            Debug.Log("Score data sent successfully!");
        }
    }

    public bool IsGameOver()
    {
        return isGameOver;
    }
}

[System.Serializable]
public class PlayerInfo
{
    public string id;
    public string game_name;
    public int score;
}

[System.Serializable]
public class GameData
{
    public string id;
    public string game_name;
    public int score;

    public GameData(string id, string game_name, int score)
    {
        this.id = id;
        this.game_name = game_name;
        this.score = score;
    }
}
