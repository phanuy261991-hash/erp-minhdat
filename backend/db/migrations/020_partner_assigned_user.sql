-- Migration 020: "Nguoi phu trach" cho khach hang - lien ket toi 1 tai khoan nguoi dung
-- (khong bat buoc), theo yeu cau nguoi dung 2026-08-03. Ap dung chung cho ca 2 loai doi tac
-- (cot dat tren bang partners dung chung), nhung frontend hien tai chi hien truong nay o
-- customers.html theo dung pham vi yeu cau.

ALTER TABLE partners ADD COLUMN assigned_user_id INTEGER REFERENCES users(id);
