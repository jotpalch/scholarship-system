# 用戶管理篩選功能測試指南

## 🔧 修復內容

### 1. 後端篩選邏輯
- ✅ 搜尋功能：支援姓名、信箱、使用者名稱搜尋
- ✅ 角色篩選：支援所有角色類型篩選
- ✅ 狀態篩選：支援啟用/停用狀態篩選

### 2. 前端 API 客戶端修復
- ✅ 修復 `request` 方法支援查詢參數
- ✅ 自動構建查詢字符串
- ✅ 過濾空值參數

### 3. 前端 UI 修復
- ✅ `useEffect` 監聽篩選條件變化
- ✅ 篩選時自動重置到第一頁
- ✅ 添加清除篩選功能

## 🧪 測試步驟

### 1. 基本搜尋測試
1. 打開系統管理 → 使用者管理
2. 在搜尋框輸入「admin」
3. 點擊「搜尋」按鈕
4. **預期結果**：只顯示包含「admin」的用戶

### 2. 角色篩選測試
1. 選擇角色篩選：「學生」
2. 點擊「搜尋」按鈕
3. **預期結果**：只顯示角色為學生的用戶

### 3. 狀態篩選測試
1. 選擇狀態篩選：「啟用」
2. 點擊「搜尋」按鈕
3. **預期結果**：只顯示啟用的用戶

### 4. 組合篩選測試
1. 搜尋框輸入：「學生」
2. 角色篩選：「學生」
3. 狀態篩選：「啟用」
4. 點擊「搜尋」按鈕
5. **預期結果**：顯示符合所有條件的用戶

### 5. 清除篩選測試
1. 設置任意篩選條件
2. 點擊「清除」按鈕
3. **預期結果**：所有篩選條件清空，顯示所有用戶

### 6. 分頁測試
1. 設置篩選條件
2. 切換到第二頁
3. 修改篩選條件
4. **預期結果**：自動重置到第一頁並應用新篩選

## 🔍 調試信息

### 前端控制台日志
```
🔄 開始獲取使用者列表...
📡 使用者API調用參數: {page: 1, size: 20, search: "admin", role: "admin"}
Making API request: GET http://localhost:8000/api/v1/users?page=1&size=20&search=admin&role=admin
Query parameters: {page: 1, size: 20, search: "admin", role: "admin"}
```

### 後端日志
```
INFO: 172.19.0.1:41018 - "GET /api/v1/users?page=1&size=20&search=admin&role=admin HTTP/1.1" 200 OK
```

## 🐛 故障排除

### 1. 篩選無效果
- 檢查前端控制台是否有查詢參數日志
- 檢查 API 請求 URL 是否包含查詢參數
- 檢查後端日志確認收到正確參數

### 2. 搜尋結果錯誤
- 確認後端搜尋邏輯正確（支援中文名、英文名、信箱、使用者名稱）
- 檢查大小寫敏感性設定

### 3. 角色篩選失效
- 確認角色值正確（student, professor, college, admin, super_admin）
- 檢查後端 UserRole 枚舉轉換

### 4. 狀態篩選問題
- 確認布林值正確傳遞（true/false）
- 檢查後端 is_active 欄位查詢

## ✅ 驗證清單

- [ ] 搜尋功能正常
- [ ] 角色篩選正常
- [ ] 狀態篩選正常
- [ ] 組合篩選正常
- [ ] 清除功能正常
- [ ] 分頁重置正常
- [ ] API 查詢參數正確
- [ ] 後端響應正確

## 🚀 部署後確認

1. 確認所有篩選功能在生產環境正常
2. 檢查性能影響（大量用戶時的篩選速度）
3. 驗證權限控制（只有管理員能訪問）
4. 測試邊界情況（空搜尋、特殊字符等） 