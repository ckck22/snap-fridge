package com.fridge.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fridge.app.dto.QuizQuestionDto;
import com.fridge.app.entity.Translation;
import com.fridge.app.entity.Word;
import com.fridge.app.repository.TranslationRepository;
import com.fridge.app.repository.WordRepository;
import com.fridge.app.entity.LearningProgress; // Import
import com.fridge.app.repository.LearningProgressRepository; // Import
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final WordRepository wordRepository;
    private final TranslationRepository translationRepository;
    private final LearningProgressRepository learningProgressRepository;
    private final VisionService visionService;
    private final GeminiService geminiService;

    @Transactional
    // ✨ [수정] nativeLang 파라미터 추가됨
    public List<QuizQuestionDto> generateQuizFromImage(MultipartFile file, String targetLang, String nativeLang) throws IOException {
        
        List<String> rawLabels = visionService.detectLabels(file);
        System.out.println("👁️ Raw Vision labels: " + rawLabels);

        String bestFoodLabel = geminiService.extractFoodLabel(rawLabels);
        
        if (bestFoodLabel == null) {
            System.out.println("🚫 No food detected.");
            return Collections.emptyList();
        }
        
        System.out.println("🎯 AI Selected: " + bestFoodLabel);

        List<String> processedLabels = new ArrayList<>();
        processedLabels.add(bestFoodLabel);

        return processedLabels.stream()
                // ✨ [수정] 여기에도 nativeLang 전달
                .map(label -> getOrCreateWordData(label, targetLang, nativeLang))
                // ✨ [수정] DTO 생성자에도 nativeLang 전달
                .map(word -> new QuizQuestionDto(word, targetLang, nativeLang))
                .collect(Collectors.toList());
    }

    // ✨ [수정] nativeLang 파라미터 추가됨
    private Word getOrCreateWordData(String labelEn, String targetLang, String nativeLang) {
        Word word = wordRepository.findByLabelEn(labelEn)
                .orElseGet(() -> {
                    Word newWord = new Word();
                    newWord.setLabelEn(labelEn);
                    newWord.setNameKo(labelEn); // 임시값 (나중에 덮어씌워짐)
                    return wordRepository.save(newWord);
                });

        // 학습 진도 생성 (필수)
        learningProgressRepository.findByWord(word)
                .orElseGet(() -> {
                    LearningProgress progress = LearningProgress.createInitialProgress(word);
                    return learningProgressRepository.save(progress);
                });

        boolean translationExists = word.getTranslations().stream()
                .anyMatch(t -> t.getLanguageCode().equalsIgnoreCase(targetLang));

        if (!translationExists) {
            System.out.println("🤖 Asking Gemini: " + labelEn + " -> " + targetLang + " (Native: " + nativeLang + ")");
            
            List<String> contextWords = wordRepository.findTop3RecentWords().stream()
                    .map(Word::getLabelEn)
                    .filter(w -> !w.equalsIgnoreCase(labelEn))
                    .collect(Collectors.toList());
            
            // ✨ [수정] GeminiService 호출 시 nativeLang 전달
            JsonNode aiResponse = geminiService.getTranslationAndSentence(labelEn, targetLang, nativeLang, contextWords);
            
            if (aiResponse != null) {
                Translation newTrans = new Translation();
                newTrans.setWord(word);
                newTrans.setLanguageCode(targetLang);
                newTrans.setTranslatedWord(aiResponse.path("translatedWord").asText(labelEn));
                
                String sentence = aiResponse.path("exampleSentence").asText();
                if (sentence == null || sentence.trim().isEmpty()) sentence = "No example available.";
                newTrans.setExampleSentence(sentence);

                String emoji = aiResponse.path("emoji").asText();
                if (emoji == null || emoji.trim().isEmpty()) emoji = "📦";
                newTrans.setEmoji(emoji);
                
                translationRepository.save(newTrans);
                word.getTranslations().add(newTrans);

                // ✨ [수정] 모국어 뜻(Definition) 업데이트 로직
                String nativeDef = aiResponse.path("nativeDefinition").asText();
                if (nativeDef != null && !nativeDef.isEmpty()) {
                    System.out.println("🔄 Updating Native Def: " + nativeDef);
                    word.setNameKo(nativeDef);
                    wordRepository.save(word);
                }
            }
        } 
        return word;
    }
}