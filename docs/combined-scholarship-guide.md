# 合併獎學金功能使用指南

## 概述

本系統支援合併獎學金功能，允許將多個相關的獎學金（如國科會與教育部博士獎學金）整合為一個申請流程，同時保留各自的申請條件和審核標準。

## 資料庫設計

### 1. 獎學金類型表 (scholarship_types)

新增欄位：
- `category` - 獎學金大類別（doctoral/undergraduate/master/special）
- `sub_type` - 子類型（most/moe/general）
- `is_combined` - 是否為合併獎學金
- `parent_scholarship_id` - 父獎學金ID（用於關聯子獎學金）

### 2. 申請表 (applications)

新增欄位：
- `scholarship_type_id` - 主獎學金ID
- `sub_scholarship_type_id` - 子獎學金ID（用於合併獎學金）

## 資料庫遷移

執行以下命令來更新資料庫結構：

```bash
cd backend
alembic upgrade head
```

## 初始化合併獎學金資料

運行初始化腳本來創建博士獎學金資料：

```bash
cd backend
python -m app.core.init_combined_scholarships
```

這會創建：
- 主獎學金：博士生獎學金（Doctoral Scholarship）
- 子獎學金1：國科會博士生獎學金（MOST Doctoral Scholarship）
  - 金額：NT$40,000/月
  - 最低GPA：3.7
  - 最高名次百分比：20%
- 子獎學金2：教育部博士生獎學金（MOE Doctoral Scholarship）
  - 金額：NT$35,000/月
  - 最低GPA：3.5
  - 最高名次百分比：30%

## API 使用方式

### 1. 獲取合併獎學金列表

```bash
GET /api/v1/scholarships/combined/list
```

回應範例：
```json
[
  {
    "id": 1,
    "code": "doctoral_combined",
    "name": "博士生獎學金",
    "category": "doctoral",
    "sub_type": "general",
    "is_combined": true,
    "sub_scholarships": [
      {
        "id": 2,
        "code": "doctoral_most",
        "name": "國科會博士生獎學金",
        "sub_type": "most",
        "amount": 40000
      },
      {
        "id": 3,
        "code": "doctoral_moe",
        "name": "教育部博士生獎學金",
        "sub_type": "moe",
        "amount": 35000
      }
    ]
  }
]
```

### 2. 獲取獎學金詳情（含子獎學金）

```bash
GET /api/v1/scholarships/{scholarship_id}
```

### 3. 創建合併獎學金申請

```bash
POST /api/v1/applications/
```

請求內容：
```json
{
  "scholarship_type": "doctoral_combined",
  "scholarship_type_id": 1,
  "sub_scholarship_type_id": 2,  // 選擇國科會或教育部
  "personal_statement": "...",
  "research_proposal": "...",
  "agree_terms": true
}
```

## 前端整合

### 1. 使用合併獎學金表單元件

```tsx
import { CombinedScholarshipForm } from '@/components/combined-scholarship-form'

// 在申請頁面中使用
<CombinedScholarshipForm
  scholarship={scholarshipData}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### 2. 顯示合併獎學金資訊

```tsx
// 檢查是否為合併獎學金
if (scholarship.is_combined && scholarship.sub_scholarships) {
  return (
    <div>
      <h3>{scholarship.name}</h3>
      <p>請選擇以下其中一項申請：</p>
      {scholarship.sub_scholarships.map(sub => (
        <div key={sub.id}>
          <h4>{sub.name}</h4>
          <p>金額：NT${sub.amount}/月</p>
        </div>
      ))}
    </div>
  )
}
```

## 業務邏輯說明

1. **申請限制**：學生在同一個合併獎學金下只能選擇一個子獎學金申請
2. **審核流程**：雖然是合併獎學金，但國科會和教育部的審核標準可能不同
3. **白名單設定**：可以分別為不同的子獎學金設定白名單
4. **統計分析**：系統會分別統計各子獎學金的申請和核准情況

## 注意事項

1. 遷移現有資料時，需要確保舊的獎學金資料正確對應到新的類別和子類型
2. 合併獎學金的總預算由各子獎學金的預算組成
3. 申請表單需要明確顯示學生選擇的是哪一個子獎學金
4. 審核介面需要能夠區分不同子獎學金的申請

## 未來擴展

此設計支援：
- 新增更多合併獎學金類型
- 一個合併獎學金下可以有多個子獎學金
- 不同子獎學金可以有不同的申請時間和條件
- 支援跨部門或跨機構的聯合獎學金計畫