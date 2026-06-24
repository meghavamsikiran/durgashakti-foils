package com.durgashakti.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.durgashakti.user", "com.durgashakti.common"})
@EntityScan(basePackages = {"com.durgashakti.common.entity"})
@EnableJpaRepositories(basePackages = {"com.durgashakti.user.repository"})
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
