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

    public JsonNode getTranslationAndSentence(String word, String targetLang) {
        String promptText = String.format(
            "You are a language teacher. Translate '%s' into language code '%s'.\n" +
            "Create a simple example sentence using the word IN THE TARGET LANGUAGE (%s).\n" +
            "STRICT JSON OUTPUT format required: { \"translatedWord\": \"...\", \"exampleSentence\": \"...\" }", 
            word, targetLang, targetLang
        );

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
                
                // ✨ [DEBUG] 이 로그가 반드시 찍혀야 합니다!
                System.out.println("🤖 Raw Gemini Response: " + jsonString);

                jsonString = jsonString.replaceAll("```json", "").replaceAll("```", "").trim();
                JsonNode rootNode = objectMapper.readTree(jsonString);
                
                // 예문 강제 주입 로직
                String sentence = "No example available.";
                if (rootNode.has("exampleSentence")) sentence = rootNode.get("exampleSentence").asText();
                
                if (sentence == null || sentence.trim().isEmpty()) {
                    sentence = "Gemini returned an empty sentence.";
                }

                if (rootNode instanceof ObjectNode) {
                    ((ObjectNode) rootNode).put("exampleSentence", sentence);
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