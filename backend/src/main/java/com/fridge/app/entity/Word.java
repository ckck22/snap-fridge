package com.fridge.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter; // Import Setter

@Entity
@Table(name = "word")
@Getter
@Setter 
@NoArgsConstructor 
public class Word extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "word_id")
    private Long wordId;

    @Column(name = "label_en", nullable = false, unique = true)
    private String labelEn;

    @Column(name = "name_ko", nullable = false)
    private String nameKo;

    @Column(name = "image_path")
    private String imagePath;

    @OneToMany(mappedBy = "word", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Translation> translations = new java.util.ArrayList<>();

    public void addTranslation(Translation translation) {
        translations.add(translation);
        translation.setWord(this);
    }
}