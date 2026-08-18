# 📋 Database Schema Changelog & Requirements Coverage

เอกสารสรุปการปรับปรุง Database Schema สำหรับระบบ **Phonebook**

---

## 🎯 สรุปการปรับปรุงระบบ (Overview of Changes)

### 1. ข้อมูลรูปภาพ (Profile & Organization Images)
- **`officers.avatar_url` (Text):** ช่องเก็บ URL / Path สำหรับรูปโปรไฟล์ของแต่ละบุคคล
- **`certs.logo_url` (Text):** ช่องเก็บ URL / Path สำหรับรูปภาพ/โลโก้ของแต่ละหน่วยงาน (Cert)

### 2. ระบบแจ้งปัญหาข้อมูล (`data_correction_reports`)
- **วัตถุประสงค์:** รองรับฟังก์ชันหน้า **Info page** (กดเลือกปัญหา เช่น โทรไม่ติด, ข้อมูลไม่ถูกต้อง) และ **Admin page** (ดูรายการแจ้งเตือนเพื่อดำเนินการแก้ไข)
- **ประเภทปัญหาที่เลือกได้ (`REPORT_REASONS`):**
  - `unreachable_phone`: โทรไม่ติด / ติดต่อไม่ได้
  - `wrong_phone`: เบอร์โทรศัพท์ไม่ถูกต้อง
  - `wrong_name`: ชื่อ-นามสกุลไม่ถูกต้อง
  - `wrong_cert`: สังกัด/หน่วยงานไม่ถูกต้อง
  - `wrong_role`: ตำแหน่งไม่ถูกต้อง
  - `resigned_or_moved`: ย้ายหน่วยงาน / ลาออก
  - `other`: อื่นๆ
- **สถานะคำขอ (`REPORT_STATUSES`):**
  - `reported`: แจ้งปัญหาเข้ามา (Default)
  - `resolved`: แก้ไขข้อมูล/จัดการเรียบร้อยแล้ว
  - `rejected`: ปฏิเสธ (ข้อมูลถูกต้องอยู่แล้ว หรือไม่พบปัญหา)
- **โครงสร้างตาราง:**
  - `id`: UUID (Primary Key)
  - `target_officer_id`: เจ้าของข้อมูลที่ถูกแจ้งปัญหา (Foreign Key -> `officers.id`, On Delete Cascade)
  - `reporter_id`: ผู้แจ้งเรื่อง (Foreign Key -> `officers.id`, On Delete Set Null)
  - `reason`: ประเภทปัญหาที่เลือก (Varchar(64))
  - `details`: รายละเอียดเพิ่มเติม (Text, Optional)
  - `status`: สถานะคำขอ (`reported`, `resolved`, `rejected`)
  - `admin_notes`: บันทึกการดำเนินงานของแอดมิน
  - `resolved_by`: แอดมินผู้ดำเนินการ (Foreign Key -> `officers.id`)
  - `resolved_at`: วันที่ดำเนินการเสร็จสิ้น
  - `created_at`, `updated_at`, `deleted_at`: Timestamps

### 3. การจัดการสิทธิ์ผู้ใช้งาน (`system_role`)
- **วัตถุประสงค์:** รองรับการแบ่งสิทธิ์ `officer`, `admin`, `superadmin` เพื่อควบคุมการเข้าถึงระบบ
- **คอลัมน์:** `officers.system_role` (Default: `'officer'`)

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
  - `reports_target_officer_id_idx`, `reports_status_idx`, `reports_reason_idx`, `reports_created_at_idx`: บน `data_correction_reports`

---

## 📊 ตารางตรวจสอบความสอดคล้องกับ Requirements

| Requirement | รายละเอียด | ตาราง/ฟิลด์ที่รองรับ | สถานะ |
| :--- | :--- | :--- | :--- |
| **Search Algorithm** | ค้นหาด้วย ชื่อ-นามสกุล, เบอร์โทร, อีเมล, cert / แสดงผล ชื่อ-นามสกุล, cert, ตำแหน่ง | `officers`, `phones`, `certs`, `roles` พร้อม Indexes ครบถ้วน | ✅ ครบถ้วน |
| **User Role & Auth** | สมาชิกของ cert / แก้ไขข้อมูลตัวเองได้ใน User Page | `officers.systemRole`, `officerCerts` | ✅ ครบถ้วน |
| **Admin Role** | ผู้ดูแลระบบ / เพิ่ม-แก้ไขข้อมูลผู้ใช้ / จัดการการแจ้งเตือนปัญหา | `officers.systemRole = 'admin'`, `data_correction_reports` | ✅ ครบถ้วน |
| **Info Page** | แสดงข้อมูลบุคคล + กดเลือกแจ้งปัญหา (เช่น โทรไม่ติด) | `officers`, `data_correction_reports` (reason, details, status) | ✅ ครบถ้วน |
| **Admin Page** | ดูและจัดการเมื่อมีคนแจ้งปัญหาเข้ามา | `data_correction_reports` (status, admin_notes, resolved_by) | ✅ ครบถ้วน |
| **Vertical Scroll** | Pagination / Infinite Scroll ลื่นไหล | Index บน `created_at` และ Foreign Keys ทุกตาราง | ✅ ครบถ้วน |
