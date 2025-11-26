package com.fridge.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fridge.app.dto.gemini.GeminiRequest;
import com.fridge.app.dto.gemini.GeminiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final ObjectMapper objectMapper;

    /**
     * 1. Semantic Filtering (Smart Labeling)
     * 식재료 이름만 깔끔하게 추출하는 로직 (여기는 정확성이 중요하므로 페르소나 변경 X)
     */
public String extractFoodLabel(List<String> visionLabels) {
        String labelsString = String.join(", ", visionLabels);
        
        // ✨ [수정] 페르소나: "마트 직원" / 목표: "가격표 붙이기"
        String promptText = String.format(
            "Analyze this list of image labels: [%s].\n" +
            "Role: You are a grocery store inventory manager.\n" +
            "Task: Choose the specific item name to print on a Price Tag.\n" +
            "\n" +
            "RULES:\n" +
            "1. 🚫 IGNORE broad categories: 'Food', 'Produce', 'Vegetable', 'Fruit', 'Leaf vegetable', 'Root vegetable', 'Natural foods'.\n" +
            "2. 🚫 IGNORE botanical/scientific names: 'Brassica', 'Cruciferous vegetables', 'Flowering plant'.\n" +
            "3. ✅ SELECT the specific product name: e.g., use 'Cabbage' instead of 'Leaf vegetable', use 'Carrot' instead of 'Root vegetable'.\n" +
            "4. If the specific name is missing in the list, infer the most likely specific food item based on the available labels.\n" +
            "\n" +
            "Return ONLY a JSON object: { \"foodLabel\": \"Name\" } or { \"foodLabel\": null }.", 
            labelsString
        );

        JsonNode response = callGemini(promptText);
        
        if (response != null && response.has("foodLabel") && !response.get("foodLabel").isNull()) {
            return response.get("foodLabel").asText();
        }
        return null;
    }

    /**
     * 2. Content Generation (Translation, Definition, Contextual Sentence)
     * ✨ [Updated Persona] 친절한 선생님/엄마가 아이에게 가르쳐주는 톤앤매너 적용
     */
    public JsonNode getTranslationAndSentence(String word, String targetLang, String nativeLang, List<String> contextWords) {
        
        String contextString = (contextWords == null || contextWords.isEmpty()) 
            ? "None" 
            : String.join(", ", contextWords);

        // ✨ [프롬프트 수정] "Kind Parent/Teacher" 페르소나 주입
        String promptText = String.format(
            "Role: You are a kind and patient teacher or parent explaining ingredients to a young child.\n" +
            "User's Native Language: %s\n" +
            "Target Language to Learn: %s\n" +
            "Word to analyze: '%s'\n" +
            "Context (User's Fridge): [%s]\n" +
            "\n" +
            "Task: Provide the following in JSON format:\n" +
            "1. translatedWord: The word translated into the Target Language. (If Target is same as Word, keep it).\n" +
            "2. nativeDefinition: The SIMPLEST common name in the User's Native Language (%s).\n" +
            "   - Keep it direct (e.g., 'Egg' -> '계란'). Do not use complex definitions.\n" +
            "3. exampleSentence: A short, cute, and easy sentence (A1 level) in the Target Language (%s).\n" +
            "   - Tone: Warm, encouraging, and simple (like talking to a kid).\n" +
            "   - Use simple verbs like 'eat', 'like', 'yummy', 'cook'.\n" +
            "   - Try to combine with context items ([%s]) if it makes a yummy food combination.\n" +
            "   - MUST NOT be empty.\n" +
            "4. emoji: A single representative emoji.\n" +
            "\n" +
            "STRICT JSON OUTPUT: { \"translatedWord\": \"...\", \"nativeDefinition\": \"...\", \"exampleSentence\": \"...\", \"emoji\": \"...\" }", 
            nativeLang, targetLang, word, contextString, 
            nativeLang, targetLang, contextString
        );

        return callGemini(promptText);
    }

    /**
     * Shared method to call Gemini API and parse JSON response safely.
     */
    private JsonNode callGemini(String promptText) {
        GeminiRequest requestBody = new GeminiRequest(
            List.of(new GeminiRequest.Content(
                List.of(new GeminiRequest.Part(promptText))
            ))
        );

        RestClient restClient = RestClient.create();
        
        try {
            GeminiResponse response = restClient.post()
                    .uri(apiUrl + "?key=" + apiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response != null && !response.getCandidates().isEmpty()) {
                String jsonString = response.getCandidates().get(0).getContent().getParts().get(0).getText();
                
                // Debug Log
                System.out.println("🤖 Raw Gemini Response: " + jsonString);

                // Clean up markdown code blocks (e.g., ```json ... ```)
                jsonString = jsonString.replaceAll("```json", "").replaceAll("```", "").trim();
                
                JsonNode rootNode = objectMapper.readTree(jsonString);

                // Safety Check: Ensure exampleSentence is not empty or missing
                if (rootNode instanceof ObjectNode) {
                    ObjectNode objNode = (ObjectNode) rootNode;
                    if (!objNode.has("exampleSentence") || objNode.get("exampleSentence").asText().isEmpty()) {
                        // Fallback strategy: check for other common keys
                         String fallback = "No example available.";
                         if (objNode.has("sentence")) fallback = objNode.get("sentence").asText();
                         objNode.put("exampleSentence", fallback);
                    }
                }
                return rootNode;
            }
        } catch (Exception e) {
            System.err.println("🚨 Gemini Error: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
}