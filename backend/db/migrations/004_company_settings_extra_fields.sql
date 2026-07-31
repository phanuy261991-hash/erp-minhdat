-- Migration 004: bo sung truong cho company_settings theo yeu cau nguoi dung 2026-08-01:
-- them email, website, chi nhanh ngan hang; doi "phone" (1 gia tri) sang "phones" (mang JSON,
-- cho nhap tu 2 so tro len). Chi 1 dong duy nhat trong bang nen an toan chuyen doi truc tiep.

ALTER TABLE company_settings ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN website TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN bank_branch TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN phones TEXT NOT NULL DEFAULT '[]';

UPDATE company_settings SET phones = json_array(phone) WHERE phone IS NOT NULL AND phone != '';

ALTER TABLE company_settings DROP COLUMN phone;
