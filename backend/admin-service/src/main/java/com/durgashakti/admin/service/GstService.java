package com.durgashakti.admin.service;

import java.io.IOException;

public interface GstService {
    byte[] exportGstReport() throws IOException;
}
