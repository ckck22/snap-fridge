package com.fridge.app.dto;

import com.fridge.app.entity.Translation;
import com.fridge.app.entity.Word;
import lombok.Getter;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class QuizQuestionDto {
    
    private final String labelEn; // Vision API가 본 원래 영어 단어 (ID 역할)
    
    // ✨ [핵심] 프론트엔드가 헷갈리지 않게 명확한 변수명 사용
    private final String frontWord;  // Native Language (예: 사과)
    private final String backWord;   // Target Language (예: Apple)
    private final String backSentence; // Target Sentence (예: I eat...)
    private final String emoji;
    private final String targetLangCode; // TTS용

    // 필터링 생성자
    public QuizQuestionDto(Word word, String targetLang, String nativeLang) {
        this.labelEn = word.getLabelEn();
        
        // 1. Target Language 데이터 찾기 (뒷면)
        Translation targetTrans = word.getTranslations().stream()
                .filter(t -> t.getLanguageCode().equalsIgnoreCase(targetLang))
                .findFirst()
                .orElse(null);

        // 2. Native Language 데이터 찾기 (앞면) -> 없으면 영어(labelEn)라도 보여줌
        // (참고: 우리 로직상 Native 데이터가 Translation 테이블에 없을 수도 있습니다. 
        //  Gemini가 줄 때 nativeDefinition을 Word.nameKo에 저장했으므로 그걸 씁니다.)
        this.frontWord = (word.getNameKo() != null) ? word.getNameKo() : word.getLabelEn();

        if (targetTrans != null) {
            this.backWord = targetTrans.getTranslatedWord();
            this.backSentence = targetTrans.getExampleSentence();
            this.emoji = targetTrans.getEmoji();
            this.targetLangCode = targetTrans.getLanguageCode();
        } else {
            this.backWord = "???";
            this.backSentence = "No data";
            this.emoji = "📦";
            this.targetLangCode = "en";
        }
    }
}