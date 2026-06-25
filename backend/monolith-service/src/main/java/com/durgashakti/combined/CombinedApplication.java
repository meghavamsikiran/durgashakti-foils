package com.durgashakti.combined;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

@SpringBootApplication
@ComponentScan(
        basePackages = "com.durgashakti",
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.REGEX,
                pattern = "com\\.durgashakti\\..*Application"
        )
)
@EnableJpaRepositories(basePackages = "com.durgashakti")
@EntityScan(basePackages = "com.durgashakti")
@EnableScheduling
public class CombinedApplication {
    public static void main(String[] args) {
        SpringApplication.run(CombinedApplication.class, args);
    }
}
