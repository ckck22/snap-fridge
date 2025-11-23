package com.fridge.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_progress")
@Getter
@Setter
@NoArgsConstructor
public class LearningProgress extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "progress_id")
    private Long progressId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @Column(name = "proficiency_level")
    private int proficiencyLevel = 1;

    @Column(name = "review_count")
    private int reviewCount = 0;

    @Column(name = "last_reviewed_at")
    private LocalDateTime lastReviewedAt;

    @Column(name = "next_review_date")
    private LocalDateTime nextReviewDate;

    public static LearningProgress createInitialProgress(Word word) {
        LearningProgress lp = new LearningProgress();
        lp.setWord(word);
        lp.setProficiencyLevel(1); 
        lp.setReviewCount(0);
        lp.setLastReviewedAt(LocalDateTime.now());
        lp.setNextReviewDate(LocalDateTime.now().plusDays(1)); 
        return lp;
    }
}