# 📋 Database Schema Changelog & Requirements Coverage

เอกสารสรุปการปรับปรุง Database Schema สำหรับระบบ **Phonebook**

---

## 🎯 สรุปการปรับปรุงระบบ (Overview of Changes)

### 1. ระบบแจ้งข้อมูลผิดพลาด (`data_correction_reports`)
- **วัตถุประสงค์:** รองรับฟังก์ชันหน้า **Info page** (แจ้งเมื่อข้อมูลผิดพลาด) และ **Admin page** (ดูรายการแจ้งเตือนข้อมูลผิดพลาดเพื่อดำเนินการแก้ไข)
- **โครงสร้างตาราง:**
  - `id`: UUID (Primary Key)
  - `target_officer_id`: เจ้าของข้อมูลที่ถูกแจ้ง (Foreign Key -> `officers.id`, On Delete Cascade)
  - `reporter_id`: ผู้แจ้งเรื่อง (Foreign Key -> `officers.id`, On Delete Set Null)
  - `field_name`: ฟิลด์ที่พบข้อผิดพลาด (เช่น `phone`, `email`, `role`, `cert`)
  - `reason`: ข้อความ/รายละเอียดของข้อผิดพลาด
  - `suggested_data`: ข้อมูลที่ถูกต้องที่ผู้แจ้งเสนอแนะ
  - `status`: สถานะคำขอ (`pending`, `in_review`, `resolved`, `rejected`)
  - `admin_notes`: บันทึกการดำเนินงานของแอดมิน
  - `resolved_by`: แอดมินผู้ดำเนินการ (Foreign Key -> `officers.id`)
  - `resolved_at`: วันที่ดำเนินการเสร็จสิ้น
  - `created_at`, `updated_at`, `deleted_at`: Timestamps

### 2. ระบบจัดการประวัติการใช้งาน (`audit_logs`)
- **วัตถุประสงค์:** รองรับ Requirement **Log management** บันทึกประวัติการกระทำต่างๆ ในระบบ
- **โครงสร้างตาราง:**
  - `id`: UUID (Primary Key)
  - `officer_id`: ผู้ใช้งานที่ทำรายการ (Foreign Key -> `officers.id`, On Delete Set Null)
  - `action`: การกระทำ (เช่น `SEARCH`, `PROFILE_UPDATE`, `ADMIN_CREATE_USER`, `REPORT_ISSUE`, `RESOLVE_REPORT`)
  - `target_entity`: ตารางหรือข้อมูลเป้าหมาย (เช่น `officers`, `data_correction_reports`)
  - `target_id`: รหัสข้อมูลเป้าหมาย (UUID)
  - `metadata`: รายละเอียดเพิ่มเติมแบบ JSONB (เช่น คำค้นหา, Diff ข้อมูลก่อน-หลังแก้ไข)
  - `ip_address`: IP Address ของผู้ใช้งาน
  - `user_agent`: ข้อมูลเบราว์เซอร์ / อุปกรณ์
  - `created_at`: วันที่บันทึก Log

### 3. การจัดการสิทธิ์ผู้ใช้งาน (`system_role`)
- **วัตถุประสงค์:** รองรับการแบ่งสิทธิ์ **User ทั่วไป** และ **Admin** (ผู้ดูแลระบบ) เพื่อควบคุมการเข้าถึง **Admin Page**
- **สิ่งที่เพิ่ม:**
  - `system_role` Enum: `['user', 'admin']`
  - คอลัมน์ `system_role` ในตาราง `officers` (Default: `'user'`)

### 4. ปรับปรุงประสิทธิภาพการค้นหาและ Vertical Scroll (Indexing)
- **วัตถุประสงค์:** เพิ่มความเร็วของ Search Algorithm และการโหลดข้อมูลแบบ Vertical Scroll (Pagination)
- **Indexes ที่สร้าง:**
  - `officers_name_idx`: `officers(name)`
  - `officers_email_idx`: `officers(email)`
  - `phones_phone_number_idx`: `phones(phone_number)`
  - `phones_officer_id_idx`: `phones(officer_id)`
  - `certs_name_idx`: `certs(name)`
  - `officer_certs_cert_id_idx`: `officer_certs(cert_id)`
  - `roles_name_idx`: `roles(name)`
  - `officer_roles_role_id_idx`: `officer_roles(role_id)`
  - `reports_target_officer_id_idx`, `reports_status_idx`, `reports_created_at_idx`: บน `data_correction_reports`
  - `audit_logs_officer_id_idx`, `audit_logs_action_idx`, `audit_logs_created_at_idx`: บน `audit_logs`

---

## 📊 ตารางตรวจสอบความสอดคล้องกับ Requirements

| Requirement | รายละเอียด | ตาราง/ฟิลด์ที่รองรับ | สถานะ |
| :--- | :--- | :--- | :---: |
| **Search Algorithm** | ค้นหาด้วย ชื่อ-นามสกุล, เบอร์โทร, อีเมล, cert / แสดงผล ชื่อ-นามสกุล, cert, ตำแหน่ง | `officers`, `phones`, `certs`, `roles` พร้อม Indexes ครบถ้วน | ✅ ครบถ้วน |
| **User Role & Auth** | สมาชิกของ cert / แก้ไขข้อมูลตัวเองได้ใน User Page | `officers.systemRole = 'user'`, `officerCerts` | ✅ ครบถ้วน |
| **Admin Role** | ผู้ดูแลระบบเท่านั้น / เพิ่ม-แก้ไขข้อมูลผู้ใช้ / ดูการแจ้งเตือน | `officers.systemRole = 'admin'`, `data_correction_reports` | ✅ ครบถ้วน |
| **Info Page** | แสดงข้อมูลบุคคล + แจ้งเมื่อข้อมูลผิดพลาด | `officers`, `data_correction_reports` | ✅ ครบถ้วน |
| **Admin Page** | ดูและจัดการเมื่อมีคนแจ้งข้อมูลผิดพลาด | `data_correction_reports` (status, admin_notes, resolved_by) | ✅ ครบถ้วน |
| **Log Management** | บันทึกประวัติการใช้งานและกิจกรรมต่างๆ | `audit_logs` (action, metadata, ip_address, created_at) | ✅ ครบถ้วน |
| **Vertical Scroll** | Pagination / Infinite Scroll ลื่นไหล | Index บน `created_at` และ Foreign Keys ทุกตาราง | ✅ ครบถ้วน |
