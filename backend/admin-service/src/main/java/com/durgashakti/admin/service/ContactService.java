package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Contact;
import java.util.List;
import java.util.UUID;

public interface ContactService {
    Contact submitContact(Contact contact);
    List<Contact> listInquiries();
    Contact replyToInquiry(UUID id, String replyBody);
    List<Contact> getMyContactsByEmail(String email);
}
