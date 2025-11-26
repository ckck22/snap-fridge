package com.fridge.app.repository;

import com.fridge.app.entity.LearningProgress;
import com.fridge.app.entity.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, Long> {
    
    Optional<LearningProgress> findByWord(Word word);

    // ✨ [성능 최적화] N+1 문제 해결을 위한 Fetch Join
    // LearningProgress를 가져올 때 Word와 Translation들도 한 번에 로딩합니다.
    @Query("SELECT lp FROM LearningProgress lp " +
           "JOIN FETCH lp.word w " +
           "LEFT JOIN FETCH w.translations")
    List<LearningProgress> findAllWithDetails();
}