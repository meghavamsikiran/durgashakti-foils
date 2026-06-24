package com.durgashakti.order.service;

import com.durgashakti.common.entity.Order;

public interface InvoiceService {
    byte[] generateInvoicePdf(Order order);
}
