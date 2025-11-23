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
     * [연구 주제 1] Semantic Filtering
     * Vision API가 준 라벨 중에서 '음식'만 쏙 골라냅니다.
     */
    public String extractFoodLabel(List<String> visionLabels) {
        String labelsString = String.join(", ", visionLabels);

        String promptText = String.format(
                "Analyze this list of image labels: [%s].\n" +
                        "Identify the single most specific food ingredient or edible item visible.\n" +
                        "Ignore general terms like 'Food', 'Produce', 'Dish', 'Ingredient', 'Recipe', 'Cuisine', 'Display device', 'Gadget'.\n"
                        +
                        "Return ONLY a JSON object: { \"foodLabel\": \"Name\" } or { \"foodLabel\": null } if none found.",
                labelsString);

        JsonNode response = callGemini(promptText);

        if (response != null && response.has("foodLabel") && !response.get("foodLabel").isNull()) {
            return response.get("foodLabel").asText();
        }
        return null;
    }

    /**
     * [연구 주제 2] Context-Aware Generation
     * 사용자의 냉장고 속 재료(Context)를 고려해서 예문을 만듭니다.
     */
    public JsonNode getTranslationAndSentence(String word, String targetLang, String nativeLang,
            List<String> contextWords) {

        String contextString = (contextWords == null || contextWords.isEmpty()) ? "None"
                : String.join(", ", contextWords);

        String promptText = String.format(
                "You are a language teacher.\n" +
                        "Vision Label (English): '%s'\n" +
                        "Student's Native Language: %s\n" +
                        "Target Language to Learn: %s\n" +
                        "Context: [%s]\n" +
                        "\n" +
                        "Output JSON Requirements:\n" +
                        "1. nativeDefinition: The word '%s' translated into the Student's Native Language (%s).\n" +
                        "2. translatedWord: The word '%s' translated into the Target Language (%s).\n" +
                        "3. exampleSentence: A simple sentence using the word in the Target Language (%s).\n" +
                        "4. emoji: A matching emoji.\n" +
                        "\n" +
                        "Strict JSON: { \"nativeDefinition\": \"...\", \"translatedWord\": \"...\", \"exampleSentence\": \"...\", \"emoji\": \"...\" }",
                word, nativeLang, targetLang, contextString,
                word, nativeLang,
                word, targetLang,
                targetLang);

        return callGemini(promptText);
    }

    // Gemini API 호출 공통 메서드
    private JsonNode callGemini(String promptText) {
        GeminiRequest requestBody = new GeminiRequest(
                List.of(new GeminiRequest.Content(
                        List.of(new GeminiRequest.Part(promptText)))));

        RestClient restClient = RestClient.create();

        try {
            GeminiResponse response = restClient.post()
                    .uri(apiUrl + "?key=" + apiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response != null && !response.getCandidates().isEmpty()) {
                String jsonString = response.getCandidates().get(0).getContent().getParts().get(0).getText();
                System.out.println("🤖 Raw Gemini Response: " + jsonString);

                jsonString = jsonString.replaceAll("```json", "").replaceAll("```", "").trim();
                JsonNode rootNode = objectMapper.readTree(jsonString);

                if (rootNode instanceof ObjectNode) {
                    ObjectNode objNode = (ObjectNode) rootNode;
                    if (!objNode.has("exampleSentence") || objNode.get("exampleSentence").asText().isEmpty()) {
                        String fallback = "No example available.";
                        if (objNode.has("sentence"))
                            fallback = objNode.get("sentence").asText();
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