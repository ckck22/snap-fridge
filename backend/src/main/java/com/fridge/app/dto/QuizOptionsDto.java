package com.fridge.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
public class QuizOptionsDto {
    private Long correctId;       // 정답 ID (프론트에서 정답 확인용)
    private String question;      // 문제 (예: "Apple")
    private List<Option> options; // 보기 4개 (정답 1 + 오답 3)

    @Getter
    @AllArgsConstructor
    public static class Option {
        private Long wordId;
        private String text; // 보기 텍스트 (예: "사과", "포도")
    }
}