-- Migration 038: "Quy bao hanh ve theo du an" (2026-08-19, theo yeu cau nguoi dung).
-- warranties.project_id: FK toi projects(id), NULLABLE (tuy chon - da chot qua AskUserQuestion,
-- giu tuong thich nguoc voi khach hang chua co du an nao/khong dung module Du an). Khi co chon
-- thi ban ghi bao hanh do hien trong tab "Bao hanh" cua dung du an do. 1 du an co the co NHIEU
-- ban ghi bao hanh (vd nhieu hang muc/dot nghiem thu khac ngay) - khong ep unique.
ALTER TABLE warranties ADD COLUMN project_id INTEGER REFERENCES projects(id);

-- Lich su bao hanh (tung lan bao hanh/bao tri thuc te tai cong trinh) - gan voi 1 ban ghi
-- warranties cu the (KHONG gan thang project_id de tranh 2 nguon su that ve du an cua 1 lan bao
-- hanh - luon suy ra qua warranties.project_id).
-- "Lan" (visit_number) do BACKEND tu tinh luc INSERT (MAX+1 trong pham vi warranty_id), khong
-- nhan tu client - tranh trung/nhay so neu client tu danh so sai.
CREATE TABLE warranty_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warranty_id INTEGER NOT NULL REFERENCES warranties(id),
    visit_number INTEGER NOT NULL,
    performed_date TEXT NOT NULL,
    content TEXT NOT NULL,
    performed_by_user_id INTEGER REFERENCES users(id),
    result TEXT NOT NULL DEFAULT 'hoan_thanh' CHECK (result IN ('hoan_thanh', 'chua_hoan_thanh', 'tam_dung')),
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
