package com.fridge.app.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserStatsDto {
    private String currentTitle;     // 현재 칭호 (Chef)
    private String nextTitle;        // 다음 칭호 (Master)
    private int totalXp;             // 현재 XP
    private int nextLevelXp;         // 다음 레벨 목표 XP
    private double progressPercentage; // 0.0 ~ 1.0 (게이지 바 용)
    
    private int totalItems;          // 총 아이템 수
    private int freshCount;          // 싱싱한 거 개수
    private int rottenCount;         // 썩은 거 개수
}