package com.durgashakti.order.repository;

import com.durgashakti.common.entity.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderSettingRepository extends JpaRepository<Setting, String> {
}
