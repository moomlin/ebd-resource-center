// dashboard.js －－ 後台管理主程式（type="module"）

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ========== Firebase 設定 ==========
const firebaseConfig = {
  apiKey: "AIzaSyDiinzeBHJi8ReCOe4pkIl6j3Y9wTwphtc",
  authDomain: "ebd-case-pro-manager-system.firebaseapp.com",
  projectId: "ebd-case-pro-manager-system",
  storageBucket: "ebd-case-pro-manager-system.firebasestorage.app",
  messagingSenderId: "704486903894",
  appId: "1:704486903894:web:9a8f3879c4a06cf7602bf7",
  measurementId: "G-CHRM369TK6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========== 登入檢查與登出 ==========
const adminUserEmailSpan = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutBtn");
const topNavUserName = document.getElementById("topNavUserName");
const topNavBackToFrontBtn = document.getElementById("topNavBackToFrontBtn");
const topNavLogoutBtn = document.getElementById("topNavLogoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("未登入，重導向到登入頁面");
    window.location.href = "login.html";
    return;
  }

  try {
    // 檢查使用者是否在 Firestore 中且已核准
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("使用者不在 Firestore 中，需要完成註冊");
      await signOut(auth);
      alert("您的帳號尚未完成註冊。請前往註冊頁面完成註冊。");
      window.location.href = "register.html";
      return;
    }

    const userData = querySnapshot.docs[0].data();

    if (userData.status === "pending") {
      console.log("使用者帳號待核准");
      await signOut(auth);
      alert("您的帳號正在等待管理員核准。");
      window.location.href = "login.html";
      return;
    } else if (userData.status === "rejected") {
      console.log("使用者帳號已被拒絕");
      await signOut(auth);
      alert("您的帳號已被拒絕，無法登入。");
      window.location.href = "login.html";
      return;
    }

    // 帳號已核准，可以繼續
    console.log("使用者已登入且已核准：", user.email);
    if (adminUserEmailSpan) adminUserEmailSpan.textContent = user.email || "";
    // 更新右上角的使用者名稱
    if (topNavUserName) {
      topNavUserName.textContent = userData.name || user.displayName || user.email.split("@")[0];
      console.log("更新名稱為：", topNavUserName.textContent);
    }
  } catch (error) {
    console.error("檢查使用者狀態時發生錯誤：", error);
    await signOut(auth);
    alert("發生錯誤，請重新登入。");
    window.location.href = "login.html";
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "myweb.html";
    } catch (e) {
      console.error("登出失敗：", e);
      alert("登出時發生錯誤，請稍後再試。");
    }
  });
}

// 右上角回到首頁按鈕
if (topNavBackToFrontBtn) {
  topNavBackToFrontBtn.addEventListener("click", () => {
    window.location.href = "myweb.html";
  });
}

// 右上角登出按鈕
if (topNavLogoutBtn) {
  topNavLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "myweb.html";
    } catch (e) {
      console.error("登出失敗：", e);
      alert("登出時發生錯誤，請稍後再試。");
    }
  });
}

// ========== 左側欄切換區塊 ==========
const adminSections = document.querySelectorAll(".admin-section");
const adminMenuItems = document.querySelectorAll(".admin-menu-item");

console.log("找到的區塊數量：", adminSections.length);
console.log("找到的選單項數量：", adminMenuItems.length);
adminSections.forEach((sec, idx) => {
  console.log(`區塊 ${idx}:`, sec.id);
});
adminMenuItems.forEach((btn, idx) => {
  console.log(`選單項 ${idx}:`, btn.dataset.section);
});

function showAdminSection(sectionId) {
  console.log("切換到區塊：", sectionId);
  adminSections.forEach((sec) => {
    const shouldShow = sec.id === sectionId;
    const oldDisplay = sec.style.display;
    sec.style.display = shouldShow ? "block" : "none";
    const newDisplay = sec.style.display;
    console.log(`  區塊 ${sec.id}: ${oldDisplay} → ${newDisplay}, 內容高度:`, sec.offsetHeight);
  });
  adminMenuItems.forEach((btn) => {
    if (btn.dataset.section === sectionId) {
      btn.classList.add("active");
      console.log("  標記為 active:", btn.dataset.section);
    } else {
      btn.classList.remove("active");
    }
  });
}

adminMenuItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;
    if (target) showAdminSection(target);
  });
});

// 預設顯示檔案與公告
showAdminSection("fileAdminSection");

// ========== 1. 檔案與公告管理 ==========

const filesCol = collection(db, "files");

const fileForm = document.getElementById("fileForm");
const fileDocIdInput = document.getElementById("fileDocId");
const fileCategory = document.getElementById("fileCategory");
const fileServiceGroupDiv = document.getElementById("fileServiceGroup");
const fileServiceLevel = document.getElementById("fileServiceLevel");
const fileServiceType = document.getElementById("fileServiceType");
const fileInfoTitle = document.getElementById("fileInfoTitle");
const fileInfoContent = document.getElementById("fileInfoContent");
const fileNameInput = document.getElementById("fileName");
const fileTypeInput = document.getElementById("fileType");
const fileUrlInput = document.getElementById("fileUrl");
const fileNoteInput = document.getElementById("fileNote");
const fileTableBody = document.querySelector("#fileTable tbody");

const fileSearchBtn = document.getElementById("fileSearchBtn");
const fileReloadBtn = document.getElementById("fileReloadBtn");
const fileClearBtn = document.getElementById("fileClearBtn");

// 顯示 / 隱藏情支層級區塊
function updateServiceFieldsVisibility() {
  if (!fileCategory || !fileServiceGroupDiv) return;
  if (fileCategory.value === "情支服務") {
    fileServiceGroupDiv.style.display = "flex";
  } else {
    fileServiceGroupDiv.style.display = "none";
    if (fileServiceLevel) fileServiceLevel.value = "";
    if (fileServiceType) fileServiceType.value = "";
  }
}

if (fileCategory) {
  fileCategory.addEventListener("change", updateServiceFieldsVisibility);
}
updateServiceFieldsVisibility();

// 清空檔案表單
function resetFileForm() {
  if (!fileForm) return;
  fileDocIdInput.value = "";
  fileForm.reset();
}

// 取得查詢條件
function getFileFilterFromForm() {
  return {
    category: fileCategory.value || "",
    serviceLevel: fileServiceLevel ? fileServiceLevel.value || "" : "",
    serviceType: fileServiceType ? fileServiceType.value || "" : "",
    infoTitle: fileInfoTitle.value.trim(),
    fileName: fileNameInput.value.trim(),
  };
}

// 載入檔案列表（可選 filter）
async function loadFiles(filter) {
  if (!fileTableBody) return;

  fileTableBody.innerHTML =
    "<tr><td colspan='6' class='loading-text'>載入中⋯</td></tr>";

  try {
    const qRef = query(filesCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(qRef);

    let rows = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      // 只顯示非複製品的資料（即不是複製到「最新消息」的資料）
      if (d.category !== "最新消息" || !d.originalCategory) {
        rows.push({ id: docSnap.id, data: d });
      }
    });

    if (filter) {
      rows = rows.filter(({ data: d }) => {
        if (filter.category && d.category !== filter.category) return false;
        if (filter.serviceLevel && d.serviceLevel !== filter.serviceLevel)
          return false;
        if (filter.serviceType && d.serviceType !== filter.serviceType)
          return false;
        if (
          filter.infoTitle &&
          !String(d.infoTitle || "").includes(filter.infoTitle)
        )
          return false;
        if (
          filter.fileName &&
          !String(d.fileName || "").includes(filter.fileName)
        )
          return false;
        return true;
      });
    }

    fileTableBody.innerHTML = "";

    if (rows.length === 0) {
      fileTableBody.innerHTML =
        "<tr><td colspan='6' class='empty-text'>目前尚無符合條件的檔案資訊。</td></tr>";
      return;
    }

    rows.forEach(({ id, data: d }) => {
      const createdAt = d.createdAt?.toDate
        ? d.createdAt.toDate()
        : null;
      const dateStr = createdAt
        ? `${createdAt.getFullYear()}-${String(
            createdAt.getMonth() + 1
          ).padStart(2, "0")}-${String(
            createdAt.getDate()
          ).padStart(2, "0")}`
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${d.category || ""}</td>
        <td>${d.infoTitle || ""}</td>
        <td>${d.fileName || ""}</td>
        <td>${d.note || ""}</td>
        <td>
          <button type="button" class="table-btn edit-file" data-id="${id}">編輯</button>
          <button type="button" class="table-btn delete-file" data-id="${id}">刪除</button>
        </td>
      `;
      fileTableBody.appendChild(tr);
    });

    fileTableBody
      .querySelectorAll(".edit-file")
      .forEach((btn) =>
        btn.addEventListener("click", () => editFile(btn.dataset.id))
      );
    fileTableBody
      .querySelectorAll(".delete-file")
      .forEach((btn) =>
        btn.addEventListener("click", () => deleteFile(btn.dataset.id))
      );
  } catch (e) {
    console.error("載入檔案錯誤：", e);
    fileTableBody.innerHTML =
      "<tr><td colspan='6' class='error-text'>載入資料時發生錯誤。</td></tr>";
  }
}

// 新增 / 更新檔案
if (fileForm) {
  fileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      category: fileCategory.value,
      serviceLevel: fileServiceLevel ? fileServiceLevel.value || null : null,
      serviceType: fileServiceType ? fileServiceType.value || null : null,
      infoTitle: fileInfoTitle.value,
      infoContent: fileInfoContent.value || "",
      fileName: fileNameInput.value,
      fileType: fileTypeInput.value || "",
      url: fileUrlInput.value,
      note: fileNoteInput.value || "",
      createdAt: serverTimestamp(),
    };

    if (!data.category || !data.infoTitle || !data.fileName || !data.url) {
      alert("請至少填寫主分類、資訊標題、檔案名稱與檔案連結。");
      return;
    }

    const docId = fileDocIdInput.value;

    try {
      if (docId) {
        // 更新現有資料
        const ref = doc(db, "files", docId);
        await updateDoc(ref, data);
        alert("檔案資訊已更新。");
      } else {
        // 新增資料到所選分類
        await addDoc(filesCol, data);
        
        // 同時新增一份到「最新消息」（如果不是最新消息本身）
        if (fileCategory.value !== "最新消息") {
          const latestNewsData = {
            ...data,
            category: "最新消息",
            originalCategory: fileCategory.value,
          };
          await addDoc(filesCol, latestNewsData);
        }
        
        alert("已新增一筆檔案資訊。");
      }
      resetFileForm();
      updateServiceFieldsVisibility();
      loadFiles();
    } catch (e) {
      console.error("儲存檔案資訊錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

// 搜尋 / 重新整理 / 清除
if (fileSearchBtn) {
  fileSearchBtn.addEventListener("click", () => {
    const filter = getFileFilterFromForm();
    loadFiles(filter);
  });
}

if (fileReloadBtn) {
  fileReloadBtn.addEventListener("click", () => {
    loadFiles();
  });
}

if (fileClearBtn) {
  fileClearBtn.addEventListener("click", () => {
    resetFileForm();
    updateServiceFieldsVisibility();
    loadFiles();
  });
}

// 刪除檔案
async function deleteFile(id) {
  if (!confirm("確定要刪除此檔案資訊嗎？")) return;
  try {
    await deleteDoc(doc(db, "files", id));
    loadFiles();
  } catch (e) {
    console.error("刪除檔案錯誤：", e);
    alert("刪除時發生錯誤，請稍後再試。");
  }
}

// 檔案編輯 Modal
const fileEditModal = document.getElementById("fileEditModal");
const fileEditForm = document.getElementById("fileEditForm");
const fileEditDocId = document.getElementById("fileEditDocId");
const fileEditCategory = document.getElementById("fileEditCategory");
const fileEditInfoTitle = document.getElementById("fileEditInfoTitle");
const fileEditFileName = document.getElementById("fileEditFileName");
const fileEditFileType = document.getElementById("fileEditFileType");
const fileEditUrl = document.getElementById("fileEditUrl");
const fileEditNote = document.getElementById("fileEditNote");
const fileEditCancelBtn = document.getElementById("fileEditCancelBtn");

function openFileEditModal() {
  if (fileEditModal) fileEditModal.classList.remove("hidden");
}
function closeFileEditModal() {
  if (fileEditModal) fileEditModal.classList.add("hidden");
  if (fileEditForm) fileEditForm.reset();
  if (fileEditDocId) fileEditDocId.value = "";
}

// 從資料表開啟編輯
async function editFile(id) {
  if (!fileEditModal || !fileEditForm) {
    // 若沒做 modal，就維持舊行為（填到上方表單）
    try {
      const snap = await getDoc(doc(db, "files", id));
      if (!snap.exists()) return;
      const d = snap.data();

      fileDocIdInput.value = id;
      fileCategory.value = d.category || "";
      if (fileServiceLevel) fileServiceLevel.value = d.serviceLevel || "";
      if (fileServiceType) fileServiceType.value = d.serviceType || "";
      fileInfoTitle.value = d.infoTitle || "";
      fileInfoContent.value = d.infoContent || "";
      fileNameInput.value = d.fileName || "";
      fileTypeInput.value = d.fileType || "";
      fileUrlInput.value = d.url || "";
      fileNoteInput.value = d.note || "";
      updateServiceFieldsVisibility();
      showAdminSection("fileAdminSection");
    } catch (e) {
      console.error("讀取檔案錯誤：", e);
      alert("讀取該筆資料時發生錯誤。");
    }
    return;
  }

  try {
    const snap = await getDoc(doc(db, "files", id));
    if (!snap.exists()) return;
    const d = snap.data();

    fileEditDocId.value = id;
    fileEditCategory.value = d.category || "最新消息";
    fileEditInfoTitle.value = d.infoTitle || "";
    fileEditFileName.value = d.fileName || "";
    fileEditFileType.value = d.fileType || "";
    fileEditUrl.value = d.url || "";
    fileEditNote.value = d.note || "";

    openFileEditModal();
  } catch (e) {
    console.error("讀取檔案錯誤：", e);
    alert("讀取該筆資料時發生錯誤。");
  }
}

// Modal 關閉事件
if (fileEditCancelBtn) {
  fileEditCancelBtn.addEventListener("click", () => {
    closeFileEditModal();
  });
}
if (fileEditModal) {
  const backdrop = fileEditModal.querySelector(".modal-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", () => closeFileEditModal());
  }
}

// Modal 儲存變更
if (fileEditForm) {
  fileEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = fileEditDocId.value;
    if (!id) return;

    try {
      const ref = doc(db, "files", id);
      await updateDoc(ref, {
        category: fileEditCategory.value,
        infoTitle: fileEditInfoTitle.value,
        fileName: fileEditFileName.value,
        fileType: fileEditFileType.value,
        url: fileEditUrl.value,
        note: fileEditNote.value,
      });
      alert("已更新檔案 / 公告。");
      closeFileEditModal();
      loadFiles();
    } catch (e) {
      console.error("更新檔案錯誤：", e);
      alert("更新時發生錯誤。");
    }
  });
}

// ========== 2. 分頁文字管理 ==========

const pageTextsCol = collection(db, "pageTexts");
const pageTextForm = document.getElementById("pageTextForm");
const pageKeySelect = document.getElementById("pageKey");
const pageTextContent = document.getElementById("pageTextContent");

if (pageKeySelect) {
  pageKeySelect.addEventListener("change", () => {
    if (!pageKeySelect.value) {
      pageTextContent.value = "";
      return;
    }
    loadSinglePageText(pageKeySelect.value);
  });
}

async function loadSinglePageText(key) {
  pageTextContent.value = "";
  try {
    const qRef = query(pageTextsCol, where("pageKey", "==", key));
    const snap = await getDocs(qRef);
    if (snap.empty) {
      pageTextContent.value = "";
      return;
    }
    const d = snap.docs[0].data();
    pageTextContent.value = d.content || "";
  } catch (e) {
    console.error("載入分頁文字錯誤：", e);
  }
}

if (pageTextForm) {
  pageTextForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pageKeySelect.value) {
      alert("請先選擇分頁。");
      return;
    }

    try {
      const qRef = query(
        pageTextsCol,
        where("pageKey", "==", pageKeySelect.value)
      );
      const snap = await getDocs(qRef);
      if (snap.empty) {
        await addDoc(pageTextsCol, {
          pageKey: pageKeySelect.value,
          content: pageTextContent.value || "",
          updatedAt: serverTimestamp(),
        });
      } else {
        const ref = doc(db, "pageTexts", snap.docs[0].id);
        await updateDoc(ref, {
          content: pageTextContent.value || "",
          updatedAt: serverTimestamp(),
        });
      }
      alert("已儲存分頁文字。");
    } catch (e) {
      console.error("儲存分頁文字錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

// ========== 3. 團隊教師名單 ==========

const teamCol = collection(db, "teamMembers");

const teamForm = document.getElementById("teamForm");
const teamDocIdInput = document.getElementById("teamDocId");
const teamRoleGroup = document.getElementById("teamRoleGroup");
const teamName = document.getElementById("teamName");
const teamJobTitle = document.getElementById("teamJobTitle");
const teamRoleTitle = document.getElementById("teamRoleTitle");
const teamAvatarType = document.getElementById("teamAvatarType");
const teamPhotoUrl = document.getElementById("teamPhotoUrl");
const teamTableBody = document.querySelector("#teamTable tbody");
const resetTeamFormBtn = document.getElementById("resetTeamFormBtn");

function resetTeamForm() {
  if (!teamForm) return;
  teamDocIdInput.value = "";
  teamForm.reset();
  teamAvatarType.value = "photo";
}

if (resetTeamFormBtn) {
  resetTeamFormBtn.addEventListener("click", () => resetTeamForm());
}

if (teamForm) {
  teamForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      roleGroup: teamRoleGroup.value,
      name: teamName.value,
      jobTitle: teamJobTitle.value,
      roleTitle: teamRoleTitle.value || "",
      avatarType: teamAvatarType.value || "photo",
      photoUrl: teamPhotoUrl.value || "",
      createdAt: serverTimestamp(),
    };

    if (!data.name) {
      alert("請填寫姓名。");
      return;
    }

    const docId = teamDocIdInput.value;

    try {
      if (docId) {
        await updateDoc(doc(db, "teamMembers", docId), data);
        alert("成員資料已更新。");
      } else {
        await addDoc(teamCol, data);
        alert("已新增一位成員。");
      }
      resetTeamForm();
      loadTeamMembers();
    } catch (e) {
      console.error("儲存成員資料錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

// 載入成員列表（修正版，不再使用雙重 orderBy，改成程式端排序）
async function loadTeamMembers() {
  if (!teamTableBody) return;

  teamTableBody.innerHTML =
    "<tr><td colspan='6' class='loading-text'>載入中⋯</td></tr>";

  try {
    // 直接抓全部資料，避免需要建立複合索引
    const snap = await getDocs(teamCol);

    if (snap.empty) {
      teamTableBody.innerHTML =
        "<tr><td colspan='6' class='empty-text'>尚未建立任何成員資料。</td></tr>";
      return;
    }

    // 先拉到陣列再用 JS 排序
    const members = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // 角色顯示順序：召集人 > 專業督導 > 副召集人 > 專業教師 > 執行秘書
    const roleOrder = ["召集人", "專業督導", "副召集人", "專業教師", "執行秘書"];

    members.sort((a, b) => {
      const ai = roleOrder.indexOf(a.roleGroup || "");
      const bi = roleOrder.indexOf(b.roleGroup || "");

      if (ai !== bi) return ai - bi; // 先比角色群組順序
      // 再比 createdAt（較舊在前），若沒有 createdAt 則放後面
      const ad = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Infinity;
      const bd = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Infinity;
      return ad - bd;
    });

    teamTableBody.innerHTML = "";

    members.forEach((d) => {
      const id = d.id;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.roleGroup || ""}</td>
        <td>${d.name || ""}</td>
        <td>${d.jobTitle || ""}</td>
        <td>${d.roleTitle || ""}</td>
        <td>${d.avatarType === "avatar" ? "Avatar" : "照片"}</td>
        <td>
          <button type="button" class="table-btn edit-team" data-id="${id}">編輯</button>
          <button type="button" class="table-btn delete-team" data-id="${id}">刪除</button>
        </td>
      `;
      teamTableBody.appendChild(tr);
    });

    teamTableBody
      .querySelectorAll(".edit-team")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          editTeamMember(btn.dataset.id)
        )
      );
    teamTableBody
      .querySelectorAll(".delete-team")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          deleteTeamMember(btn.dataset.id)
        )
      );
  } catch (e) {
    console.error("載入成員列表錯誤：", e);
    teamTableBody.innerHTML =
      "<tr><td colspan='6' class='error-text'>載入資料時發生錯誤。</td></tr>";
  }
}

// 刪除成員
async function deleteTeamMember(id) {
  if (!confirm("確定要刪除此成員資料嗎？")) return;
  try {
    await deleteDoc(doc(db, "teamMembers", id));
    loadTeamMembers();
  } catch (e) {
    console.error("刪除成員錯誤：", e);
    alert("刪除時發生錯誤。");
  }
}

// 團隊編輯 Modal
const teamEditModal = document.getElementById("teamEditModal");
const teamEditForm = document.getElementById("teamEditForm");
const teamEditDocId = document.getElementById("teamEditDocId");
const teamEditRoleGroup = document.getElementById("teamEditRoleGroup");
const teamEditName = document.getElementById("teamEditName");
const teamEditJobTitle = document.getElementById("teamEditJobTitle");
const teamEditRoleTitle = document.getElementById("teamEditRoleTitle");
const teamEditAvatarType = document.getElementById("teamEditAvatarType");
const teamEditPhotoUrl = document.getElementById("teamEditPhotoUrl");
const teamEditCancelBtn = document.getElementById("teamEditCancelBtn");

function openTeamEditModal() {
  if (teamEditModal) teamEditModal.classList.remove("hidden");
}
function closeTeamEditModal() {
  if (teamEditModal) teamEditModal.classList.add("hidden");
  if (teamEditForm) teamEditForm.reset();
  if (teamEditDocId) teamEditDocId.value = "";
}

// 開啟成員編輯 modal
async function editTeamMember(id) {
  if (!teamEditModal || !teamEditForm) {
    // 無 modal 時，退回舊行為：填到表單
    try {
      const snap = await getDoc(doc(db, "teamMembers", id));
      if (!snap.exists()) return;
      const d = snap.data();

      teamDocIdInput.value = id;
      teamRoleGroup.value = d.roleGroup || "召集人";
      teamName.value = d.name || "";
      teamJobTitle.value = d.jobTitle || "";
      teamRoleTitle.value = d.roleTitle || "";
      teamAvatarType.value = d.avatarType || "photo";
      teamPhotoUrl.value = d.photoUrl || "";
      showAdminSection("teamAdminSection");
    } catch (e) {
      console.error("讀取成員資料錯誤：", e);
      alert("讀取該筆資料時發生錯誤。");
    }
    return;
  }

  try {
    const snap = await getDoc(doc(db, "teamMembers", id));
    if (!snap.exists()) return;
    const d = snap.data();

    teamEditDocId.value = id;
    teamEditRoleGroup.value = d.roleGroup || "召集人";
    teamEditName.value = d.name || "";
    teamEditJobTitle.value = d.jobTitle || "";
    teamEditRoleTitle.value = d.roleTitle || "";
    teamEditAvatarType.value = d.avatarType || "photo";
    teamEditPhotoUrl.value = d.photoUrl || "";

    openTeamEditModal();
  } catch (e) {
    console.error("讀取成員資料錯誤：", e);
    alert("讀取該筆資料時發生錯誤。");
  }
}

// 關閉 team modal
if (teamEditCancelBtn) {
  teamEditCancelBtn.addEventListener("click", () => closeTeamEditModal());
}
if (teamEditModal) {
  const backdrop = teamEditModal.querySelector(".modal-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", () => closeTeamEditModal());
  }
}

// team modal 儲存
if (teamEditForm) {
  teamEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = teamEditDocId.value;
    if (!id) return;

    const data = {
      roleGroup: teamEditRoleGroup.value,
      name: teamEditName.value,
      jobTitle: teamEditJobTitle.value,
      roleTitle: teamEditRoleTitle.value || "",
      avatarType: teamEditAvatarType.value || "photo",
      photoUrl: teamEditPhotoUrl.value || "",
    };

    try {
      await updateDoc(doc(db, "teamMembers", id), data);
      alert("已更新成員資料。");
      closeTeamEditModal();
      loadTeamMembers();
    } catch (e) {
      console.error("更新成員錯誤：", e);
      alert("更新時發生錯誤。");
    }
  });
}

// ========== 4. 教師請假系統 ==========

const leaveCol = collection(db, "leaveRequests");
const compRestCol = collection(db, "compRests");

// ===== 補休相關函數 =====

// 檢查是否符合補休資格
// 條件：星期六、星期日，或是週一到週五的上午1~7時、下午5~11時
function isEligibleForCompRest(dateStr, startHour, endHour) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = 週日, 1 = 週一, ..., 6 = 週六
  
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // 檢查是否是非上班時間
  // 上午1~7時、下午5~11時
  // 上午1~7時 = 1-7點, 下午5~11時 = 17-23點
  const isOutsideBusinessHours = (startHour <= 7 && endHour <= 7) || (startHour >= 17 && endHour >= 17);
  
  return isWeekend || isOutsideBusinessHours;
}

// 取得補休 Modal 相關元素
const compRestConfirmModal = document.getElementById("compRestConfirmModal");
const compRestConfirmTitle = document.getElementById("compRestConfirmTitle");
const compRestConfirmMessage = document.getElementById("compRestConfirmMessage");
const compRestConfirmYesBtn = document.getElementById("compRestConfirmYesBtn");
const compRestConfirmNoBtn = document.getElementById("compRestConfirmNoBtn");

const overtimeInvalidModal = document.getElementById("overtimeInvalidModal");
const overtimeInvalidCloseBtn = document.getElementById("overtimeInvalidCloseBtn");

// 全域變數用於儲存待決的請假資料
let pendingLeaveData = null;
let shouldSaveAsCompRest = false;

// Subtab 切換
const subtabButtons = document.querySelectorAll(".subtab-button");
const subtabPanels = document.querySelectorAll(".subtab-panel");

subtabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.subtab;
    subtabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    subtabPanels.forEach((panel) => {
      panel.style.display = panel.id === target ? "block" : "none";
    });
  });
});

// 共同刪除函式
async function deleteLeaveRecord(id) {
  if (!confirm("確定要刪除此筆請假紀錄嗎？")) return;
  try {
    await deleteDoc(doc(db, "leaveRequests", id));
    await loadRecentLeaveRecords();
    await loadLeaveStatistics();
  } catch (e) {
    console.error("刪除請假紀錄錯誤：", e);
    alert("刪除時發生錯誤，請稍後再試。");
  }
}

/* ---- 請假登記 ---- */

const leaveForm = document.getElementById("leaveForm");
const recentLeaveTableBody = document.querySelector(
  "#recentLeaveTable tbody"
);

// 時間選擇時自動計算請假時數
const timeInputs = [
  "leaveStartHour", "leaveStartMinute", "leaveStartPeriod",
  "leaveEndHour", "leaveEndMinute", "leaveEndPeriod"
];
const leaveHoursInput = document.getElementById("leaveHours");

function calculateLeaveHours() {
  const startHour = parseInt(document.getElementById("leaveStartHour").value) || 0;
  const startMinute = parseInt(document.getElementById("leaveStartMinute").value) || 0;
  const startPeriod = document.getElementById("leaveStartPeriod").value;
  
  const endHour = parseInt(document.getElementById("leaveEndHour").value) || 0;
  const endMinute = parseInt(document.getElementById("leaveEndMinute").value) || 0;
  const endPeriod = document.getElementById("leaveEndPeriod").value;

  if (!startHour || !startPeriod || !endHour || !endPeriod) {
    leaveHoursInput.value = "";
    return;
  }

  // 轉換為24小時制的分鐘
  const start24Hour = startPeriod === "AM" ? startHour : (startHour === 12 ? 12 : startHour + 12);
  const end24Hour = endPeriod === "AM" ? endHour : (endHour === 12 ? 12 : endHour + 12);

  const startTotalMinutes = start24Hour * 60 + startMinute;
  const endTotalMinutes = end24Hour * 60 + endMinute;

  let diffMinutes = endTotalMinutes - startTotalMinutes;
  
  // 如果結束時間早於開始時間，視為隔日
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  // 未滿一小時進位
  const hours = Math.ceil(diffMinutes / 60);
  leaveHoursInput.value = hours > 0 ? `${hours}小時` : "";
}

timeInputs.forEach((inputId) => {
  const element = document.getElementById(inputId);
  if (element) {
    element.addEventListener("change", calculateLeaveHours);
  }
});

if (leaveForm) {
  leaveForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const startHour = parseInt(document.getElementById("leaveStartHour").value);
    const startMinute = parseInt(document.getElementById("leaveStartMinute").value);
    const startPeriod = document.getElementById("leaveStartPeriod").value;
    const endHour = parseInt(document.getElementById("leaveEndHour").value);
    const endMinute = parseInt(document.getElementById("leaveEndMinute").value);
    const endPeriod = document.getElementById("leaveEndPeriod").value;
    const leaveType = document.getElementById("leaveType").value;
    const leaveDate = document.getElementById("leaveDate").value;

    if (!startHour || !startMinute || !startPeriod || !endHour || !endMinute || !endPeriod) {
      alert("請填寫完整的時間範圍。");
      return;
    }

    // 組合時間範圍字符串
    const timeRange = `${startPeriod === "AM" ? "上午" : "下午"} ${startHour}:${startMinute} ~ ${endPeriod === "AM" ? "上午" : "下午"} ${endHour}:${endMinute}`;

    // 轉換為24小時制
    const start24Hour = startPeriod === "AM" ? startHour : (startHour === 12 ? 12 : startHour + 12);
    const end24Hour = endPeriod === "AM" ? endHour : (endHour === 12 ? 12 : endHour + 12);

    const data = {
      teacher: document.getElementById("leaveTeacherName").value,
      type: leaveType,
      startDate: leaveDate,
      timeRange: timeRange,
      hours: parseInt(document.getElementById("leaveHours").value),
      agent: document.getElementById("leaveAgent").value,
      reason: document.getElementById("leaveReason").value || "",
      proofUrl: document.getElementById("leaveProofUrl").value || "",
      createdAt: serverTimestamp(),
    };

    if (!data.teacher || !data.type || !data.startDate || !data.agent) {
      alert("請填寫所有必填欄位。");
      return;
    }

    // 檢查是否需要補休審核
    const isPublicHoliday = leaveType === "公假";
    const isOvertime = leaveType === "加班";
    
    if (isPublicHoliday || isOvertime) {
      const isEligible = isEligibleForCompRest(leaveDate, start24Hour, end24Hour);
      
      if (isOvertime && !isEligible) {
        // 加班時間不符合資格，顯示錯誤提示
        overtimeInvalidModal.classList.remove("hidden");
        return;
      }
      
      if (isEligible) {
        // 符合補休資格，顯示確認視窗
        pendingLeaveData = data;
        const typeLabel = isPublicHoliday ? "公假" : "加班";
        compRestConfirmTitle.textContent = `${typeLabel}補休資格確認`;
        compRestConfirmMessage.textContent = `您的${typeLabel}登記可能符合補休資格，是否要登記補休時數？`;
        compRestConfirmModal.classList.remove("hidden");
        return;
      }
    }

    // 正常的請假記錄（不需要補休審核）
    try {
      await addDoc(leaveCol, data);
      alert("請假紀錄已新增。");
      leaveForm.reset();
      leaveHoursInput.value = "";
      loadRecentLeaveRecords();
      loadLeaveStatistics();
    } catch (e) {
      console.error("新增請假紀錄錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

// 補休確認按鈕事件
if (compRestConfirmYesBtn) {
  compRestConfirmYesBtn.addEventListener("click", async () => {
    compRestConfirmModal.classList.add("hidden");
    
    if (!pendingLeaveData) return;
    
    try {
      // 同時存儲到 leaveRequests 和 compRests
      const leaveDocRef = await addDoc(leaveCol, pendingLeaveData);
      
      // 建立補休記錄
      const compRestData = {
        ...pendingLeaveData,
        type: pendingLeaveData.type === "公假" ? "公假補休" : "加班補休",
        originalLeaveId: leaveDocRef.id,
      };
      await addDoc(compRestCol, compRestData);
      
      alert("請假紀錄已新增，並認列為補休時數。");
      leaveForm.reset();
      leaveHoursInput.value = "";
      pendingLeaveData = null;
      loadRecentLeaveRecords();
      loadLeaveStatistics();
    } catch (e) {
      console.error("儲存請假/補休紀錄錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

if (compRestConfirmNoBtn) {
  compRestConfirmNoBtn.addEventListener("click", async () => {
    compRestConfirmModal.classList.add("hidden");
    
    if (!pendingLeaveData) return;
    
    try {
      // 只存儲請假記錄，不認列補休
      await addDoc(leaveCol, pendingLeaveData);
      alert("請假紀錄已新增。");
      leaveForm.reset();
      leaveHoursInput.value = "";
      pendingLeaveData = null;
      loadRecentLeaveRecords();
      loadLeaveStatistics();
    } catch (e) {
      console.error("儲存請假紀錄錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

// 加班時間不合法 Modal 關閉按鈕
if (overtimeInvalidCloseBtn) {
  overtimeInvalidCloseBtn.addEventListener("click", () => {
    overtimeInvalidModal.classList.add("hidden");
  });
}

async function loadRecentLeaveRecords() {
  if (!recentLeaveTableBody) return;

  recentLeaveTableBody.innerHTML =
    "<tr><td colspan='7' class='loading-text'>載入中⋯</td></tr>";

  try {
    const qRef = query(leaveCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(qRef);

    recentLeaveTableBody.innerHTML = "";

    if (snap.empty) {
      recentLeaveTableBody.innerHTML =
        "<tr><td colspan='7' class='empty-text'>尚無請假紀錄。</td></tr>";
      return;
    }

    let count = 0;
    snap.forEach((docSnap) => {
      if (count >= 5) return;
      const d = docSnap.data();
      const id = docSnap.id;

      const dateStr = d.startDate || "";
      const hoursDisplay = typeof d.hours === 'number' 
        ? `${d.hours}小時`
        : d.hours || "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${d.teacher || ""}</td>
        <td>${d.type || ""}</td>
        <td>${d.timeRange || ""}</td>
        <td>${hoursDisplay}</td>
        <td>${d.agent || ""}</td>
        <td>
          <button type="button" class="table-btn delete-leave" data-id="${id}">
            刪除
          </button>
        </td>
      `;
      recentLeaveTableBody.appendChild(tr);
      count++;
    });

    recentLeaveTableBody
      .querySelectorAll(".delete-leave")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          deleteLeaveRecord(btn.dataset.id)
        )
      );
  } catch (e) {
    console.error("載入最近請假紀錄錯誤：", e);
  }
}

/* ---- 請假統計 ---- */

const leaveStatsForm = document.getElementById("leaveStatsForm");
const leaveStatsTableBody = document.querySelector(
  "#leaveStatsTable tbody"
);
const leaveSummaryTableBody = document.querySelector(
  "#leaveSummaryTable tbody"
);
const leaveCalendarContainer = document.getElementById(
  "leaveCalendarContainer"
);

const statsViewModeSelect = document.getElementById("statsViewMode");
const statsResetBtn = document.getElementById("statsResetBtn");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-11

if (statsViewModeSelect) {
  statsViewModeSelect.addEventListener("change", () => {
    loadLeaveStatistics();
  });
}

if (statsResetBtn) {
  statsResetBtn.addEventListener("click", () => {
    const statsTeacherSelect = document.getElementById(
      "statsTeacherNameSelect"
    );
    const statsStartDate = document.getElementById("statsStartDate");
    const statsEndDate = document.getElementById("statsEndDate");
    const statsLeaveType = document.getElementById("statsLeaveType");

    if (statsTeacherSelect) statsTeacherSelect.value = "";
    if (statsStartDate) statsStartDate.value = "";
    if (statsEndDate) statsEndDate.value = "";
    if (statsLeaveType) statsLeaveType.value = "";

    loadLeaveStatistics();
  });
}

if (prevMonthBtn) {
  prevMonthBtn.addEventListener("click", () => {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    loadLeaveStatistics();
  });
}
if (nextMonthBtn) {
  nextMonthBtn.addEventListener("click", () => {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    loadLeaveStatistics();
  });
}

if (leaveStatsForm) {
  leaveStatsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadLeaveStatistics();
  });
}

// 生成請假資訊統整表（按教師與假別統計）- 按學年度
function generateLeaveSummaryReport(filtered, tableBody) {
  // 所有假別
  const allLeaveTypes = [
    "事假",
    "病假",
    "公假",
    "家庭照顧假",
    "歲時祭儀假",
    "心理調適假",
  ];

  // 按教師分組
  const teacherStats = {};
  filtered.forEach(({ data: d }) => {
    const teacher = d.teacher || "未知";
    const type = d.type || "其他";
    const hours = Number(d.hours || 0);

    if (!teacherStats[teacher]) {
      teacherStats[teacher] = {};
      allLeaveTypes.forEach((t) => {
        teacherStats[teacher][t] = 0;
      });
    }

    if (teacherStats[teacher].hasOwnProperty(type)) {
      teacherStats[teacher][type] += hours;
    } else {
      teacherStats[teacher][type] = hours;
    }
  });

  // 清空表格並填入資料
  tableBody.innerHTML = "";

  if (Object.keys(teacherStats).length === 0) {
    tableBody.innerHTML =
      "<tr><td colspan='8' class='empty-text'>無統計資料。</td></tr>";
    return;
  }

  // 按教師名字排序
  const sortedTeachers = Object.keys(teacherStats).sort();

  sortedTeachers.forEach((teacher) => {
    const stats = teacherStats[teacher];
    let total = 0;

    const cells = allLeaveTypes.map((type) => {
      const hours = stats[type] || 0;
      total += hours;
      return `<td>${hours}</td>`;
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${teacher}</td>
      ${cells.join("")}
      <td><strong>${total}</strong></td>
    `;
    tableBody.appendChild(tr);
  });
}

// 根據年份計算學年度開始和結束日期 (8/1 ~ 隔年 7/31)
function getSchoolYearDateRange(schoolYear) {
  // schoolYear 格式: "2024-2025" 表示 2024/8/1 ~ 2025/7/31
  const startYear = parseInt(schoolYear.split("-")[0]);
  const startDate = `${startYear}-08-01`;
  const endDate = `${startYear + 1}-07-31`;
  return { startDate, endDate };
}

// 統計學年度的請假資訊
async function generateSchoolYearLeaveReport(schoolYear) {
  const { startDate, endDate } = getSchoolYearDateRange(schoolYear);
  
  try {
    const qRef = query(leaveCol, orderBy("startDate", "asc"));
    const snap = await getDocs(qRef);

    const filtered = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const id = docSnap.id;

      // 篩選出在學年度範圍內的請假記錄
      if (d.startDate >= startDate && d.startDate <= endDate) {
        filtered.push({ id, data: d });
      }
    });

    const allLeaveTypes = [
      "事假",
      "病假",
      "公假",
      "家庭照顧假",
      "歲時祭儀假",
      "心理調適假",
    ];

    // 按教師分組統計
    const teacherStats = {};
    filtered.forEach(({ data: d }) => {
      const teacher = d.teacher || "未知";
      const type = d.type || "其他";
      const hours = Number(d.hours || 0);

      if (!teacherStats[teacher]) {
        teacherStats[teacher] = {};
        allLeaveTypes.forEach((t) => {
          teacherStats[teacher][t] = 0;
        });
      }

      if (teacherStats[teacher].hasOwnProperty(type)) {
        teacherStats[teacher][type] += hours;
      } else {
        teacherStats[teacher][type] = hours;
      }
    });

    // 填入報表表格
    const reportTableBody = document.querySelector(
      "#leaveSummaryReportTable tbody"
    );
    reportTableBody.innerHTML = "";

    if (Object.keys(teacherStats).length === 0) {
      reportTableBody.innerHTML =
        "<tr><td colspan='8' class='empty-text'>此學年度無請假記錄。</td></tr>";
      return;
    }

    const sortedTeachers = Object.keys(teacherStats).sort();

    sortedTeachers.forEach((teacher) => {
      const stats = teacherStats[teacher];
      let total = 0;

      const cells = allLeaveTypes.map((type) => {
        const hours = stats[type] || 0;
        total += hours;
        return `<td>${hours}</td>`;
      });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${teacher}</td>
        ${cells.join("")}
        <td><strong>${total}</strong></td>
      `;
      reportTableBody.appendChild(tr);
    });

  } catch (error) {
    console.error("生成學年度報表失敗：", error);
    alert("生成報表失敗：" + error.message);
  }
}

async function loadLeaveStatistics() {
  if (!leaveStatsTableBody) return;

  const statsTeacherSelect = document.getElementById(
    "statsTeacherNameSelect"
  );
  const teacherFilter = statsTeacherSelect
    ? statsTeacherSelect.value
    : "";

  const startDate = document.getElementById("statsStartDate").value;
  const endDate = document.getElementById("statsEndDate").value;
  const leaveType = document.getElementById("statsLeaveType").value;
  const viewMode = document.getElementById("statsViewMode").value;

  leaveStatsTableBody.innerHTML =
    "<tr><td colspan='7' class='loading-text'>載入中⋯</td></tr>";
  
  if (leaveCalendarContainer) {
    leaveCalendarContainer.innerHTML =
      "<p class='loading-text'>載入中⋯</p>";
  }

  try {
    const qRef = query(leaveCol, orderBy("startDate", "asc"));
    const snap = await getDocs(qRef);

    const filtered = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const id = docSnap.id;

      if (teacherFilter && d.teacher !== teacherFilter) return;
      if (leaveType && d.type !== leaveType) return;
      if (startDate && d.startDate < startDate) return;
      if (endDate && d.startDate > endDate) return;

      filtered.push({ id, data: d });
    });

    // 清單檢視
    leaveStatsTableBody.innerHTML = "";
    if (filtered.length === 0) {
      leaveStatsTableBody.innerHTML =
        "<tr><td colspan='7' class='empty-text'>目前查詢條件下沒有請假紀錄。</td></tr>";
    } else {
      filtered.forEach(({ id, data: d }) => {
        const dateStr = d.startDate || "";
        const hoursDisplay = typeof d.hours === 'number' 
          ? `${d.hours}小時`
          : d.hours || "";
        const timeRangeDisplay = d.timeRange || "";
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${d.teacher || ""}</td>
          <td>${d.type || ""}</td>
          <td>${timeRangeDisplay}</td>
          <td>${hoursDisplay}</td>
          <td>${d.agent || ""}</td>
          <td>
            <button type="button" class="table-btn delete-leave" data-id="${id}">
              刪除
            </button>
          </td>
        `;
        leaveStatsTableBody.appendChild(tr);
      });

      leaveStatsTableBody
        .querySelectorAll(".delete-leave")
        .forEach((btn) =>
          btn.addEventListener("click", () =>
            deleteLeaveRecord(btn.dataset.id)
          )
        );
    }

    // 月曆檢視
    if (leaveCalendarContainer) {
      renderLeaveCalendar(filtered);
    }

    const leaveListView = document.getElementById("leaveListView");
    const leaveCalendarView = document.getElementById(
      "leaveCalendarView"
    );
    if (viewMode === "list") {
      if (leaveListView) leaveListView.style.display = "block";
      if (leaveCalendarView) leaveCalendarView.style.display = "none";
    } else {
      if (leaveListView) leaveListView.style.display = "none";
      if (leaveCalendarView) leaveCalendarView.style.display = "block";
    }
  } catch (e) {
    console.error("載入請假統計錯誤：", e);
    leaveStatsTableBody.innerHTML =
      "<tr><td colspan='7' class='error-text'>讀取資料時發生錯誤。</td></tr>";
    if (leaveCalendarContainer) {
      leaveCalendarContainer.innerHTML =
        "<p class='error-text'>讀取資料時發生錯誤。</p>";
    }
  }
}

// Notion 風格月曆
function renderLeaveCalendar(filtered) {
  if (!leaveCalendarContainer || !calendarMonthLabel) return;

  const monthText = `${calendarYear} 年 ${calendarMonth + 1} 月`;
  calendarMonthLabel.textContent = monthText;

  const monthKey = `${calendarYear}-${String(calendarMonth + 1).padStart(
    2,
    "0"
  )}`;

  const map = {};
  filtered.forEach(({ data: d }) => {
    if (!d.startDate) return;
    if (!d.startDate.startsWith(monthKey)) return;
    const day = d.startDate;
    if (!map[day]) map[day] = [];
    map[day].push(d);
  });

  leaveCalendarContainer.innerHTML = "";

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  weekdays.forEach((w) => {
    const div = document.createElement("div");
    div.classList.add("calendar-weekday");
    div.textContent = w;
    leaveCalendarContainer.appendChild(div);
  });

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const firstDayWeek = firstDay.getDay(); // 0-6
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const totalCells = 42;
  const prevMonthDays = firstDayWeek;
  const prevMonthDate = new Date(calendarYear, calendarMonth, 0);
  const prevMonthLastDay = prevMonthDate.getDate();

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.classList.add("calendar-cell");

    let dateNum;
    let thisYear = calendarYear;
    let thisMonth = calendarMonth;
    let isOutside = false;

    if (i < prevMonthDays) {
      dateNum = prevMonthLastDay - prevMonthDays + 1 + i;
      isOutside = true;
      thisMonth = calendarMonth - 1;
      if (thisMonth < 0) {
        thisMonth = 11;
        thisYear = calendarYear - 1;
      }
    } else if (i >= prevMonthDays + daysInMonth) {
      dateNum = i - (prevMonthDays + daysInMonth) + 1;
      isOutside = true;
      thisMonth = calendarMonth + 1;
      if (thisMonth > 11) {
        thisMonth = 0;
        thisYear = calendarYear + 1;
      }
    } else {
      dateNum = i - prevMonthDays + 1;
    }

    if (isOutside) cell.classList.add("outside");

    const dateStr = `${thisYear}-${String(thisMonth + 1).padStart(
      2,
      "0"
    )}-${String(dateNum).padStart(2, "0")}`;

    const header = document.createElement("div");
    header.classList.add("calendar-cell-date");
    header.textContent = String(dateNum);
    cell.appendChild(header);

    const body = document.createElement("div");
    body.classList.add("calendar-cell-body");

    if (map[dateStr]) {
      let totalHours = 0;
      map[dateStr].forEach((d) => {
        totalHours += Number(d.hours || 0);
      });

      const lines = map[dateStr]
        .slice(0, 3)
        .map(
          (d) =>
            `${d.teacher || ""}｜${d.type || ""} ${
              d.hours || ""
            }h`
        );
      if (map[dateStr].length > 3) {
        lines.push(`…等 ${map[dateStr].length} 筆`);
      }

      body.innerHTML = `
        <div>總時數：${totalHours}h</div>
        <div>${lines.join("<br>")}</div>
      `;
    } else {
      body.textContent = "";
    }

    cell.appendChild(body);
    leaveCalendarContainer.appendChild(cell);
  }
}

/* ========== 使用者審核管理 ========== */

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  const d = timestamp.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 角色名稱對照
const roleNames = {
  leader: "召集人",
  supervisor: "專業督導",
  deputy: "副召集人",
  teacher: "專業教師",
  secretary: "執行秘書"
};

// 註冊方式名稱
const registrationTypeNames = {
  password: "帳號密碼",
  google: "Google 帳號"
};

// 載入使用者清單
async function loadUserApprovals() {
  try {
    const usersRef = collection(db, "users");
    
    // 載入待審核用戶
    let q = query(usersRef, where("status", "==", "pending"));
    let querySnapshot = await getDocs(q);
    displayUsers(querySnapshot.docs, "pending");

    // 載入已批准用戶
    q = query(usersRef, where("status", "==", "approved"));
    querySnapshot = await getDocs(q);
    displayUsers(querySnapshot.docs, "approved");

    // 載入已拒絕用戶
    q = query(usersRef, where("status", "==", "rejected"));
    querySnapshot = await getDocs(q);
    displayUsers(querySnapshot.docs, "rejected");
  } catch (error) {
    console.error("載入使用者清單失敗：", error);
  }
}

// 顯示使用者表格
function displayUsers(docs, status) {
  let tableId;
  if (status === "pending") tableId = "pendingUsersTable";
  else if (status === "approved") tableId = "approvedUsersTable";
  else tableId = "rejectedUsersTable";

  const table = document.getElementById(tableId);
  const tbody = table.querySelector("tbody");

  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-text">目前沒有${status === "pending" ? "待審核" : status === "approved" ? "已批准" : "已拒絕"}的用戶。</td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map((doc) => {
    const data = doc.data();
    const docId = doc.id;
    const birthDate = formatDate(data.birthDate);
    const roleDisplay = roleNames[data.teamRole] || data.teamRole;
    const regTypeDisplay = registrationTypeNames[data.registrationType] || data.registrationType;
    const regDate = formatDate(data.registrationDate);

    let actionButtons = "";
    if (status === "pending") {
      actionButtons = `
        <button class="btn-secondary" onclick="approveUser('${docId}')">批准</button>
        <button class="btn-danger" onclick="rejectUser('${docId}')">拒絕</button>
      `;
    } else {
      actionButtons = `
        <button class="btn-danger" onclick="deleteUser('${docId}')">刪除</button>
      `;
    }

    return `
      <tr>
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${data.birthDate instanceof String ? data.birthDate : birthDate}</td>
        <td>${data.school}</td>
        <td>${roleDisplay}</td>
        <td>${regTypeDisplay}</td>
        <td>${regDate}</td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join("");
}

// 批准使用者
async function approveUser(docId) {
  if (!confirm("確定要批准此用戶嗎？")) return;

  try {
    const userDocRef = doc(db, "users", docId);
    await updateDoc(userDocRef, { status: "approved" });
    alert("已批准該用戶");
    loadUserApprovals();
    loadApprovedTeachers(); // 重新載入教師列表
  } catch (error) {
    console.error("批准用戶失敗：", error);
    alert("批准失敗：" + error.message);
  }
}

// 拒絕使用者
async function rejectUser(docId) {
  if (!confirm("確定要拒絕此用戶嗎？")) return;

  try {
    const userDocRef = doc(db, "users", docId);
    await updateDoc(userDocRef, { status: "rejected" });
    alert("已拒絕該用戶");
    loadUserApprovals();
    loadApprovedTeachers(); // 重新載入教師列表
  } catch (error) {
    console.error("拒絕用戶失敗：", error);
    alert("拒絕失敗：" + error.message);
  }
}

// 刪除使用者
async function deleteUser(docId) {
  if (!confirm("確定要刪除此用戶嗎？此操作無法復原。")) return;

  try {
    const userDocRef = doc(db, "users", docId);
    await deleteDoc(userDocRef);
    alert("已刪除該用戶");
    loadUserApprovals();
  } catch (error) {
    console.error("刪除用戶失敗：", error);
    alert("刪除失敗：" + error.message);
  }
}
// ========== 時數轉換函數（8小時 = 1日）==========
function convertHoursToDateFormat(hours) {
  hours = Number(hours) || 0;
  const days = Math.floor(hours / 8);
  const remainingHours = hours % 8;
  
  if (days > 0 && remainingHours > 0) {
    return `${days}日${remainingHours}時`;
  } else if (days > 0) {
    return `${days}日`;
  } else {
    return `${remainingHours}時`;
  }
}

// 載入已批准的教師到下拉選單
async function loadApprovedTeachers() {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("status", "==", "approved"));
    const querySnapshot = await getDocs(q);

    const teachers = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.name) {
        teachers.push(userData.name);
      }
    });

    // 按姓名字母排序
    teachers.sort();

    // 更新團隊教師名單的下拉選單
    const teamNameSelect = document.getElementById("teamName");
    if (teamNameSelect) {
      const currentValue = teamNameSelect.value;
      teamNameSelect.innerHTML = '<option value="">請選擇已審核通過的教師</option>';
      teachers.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        teamNameSelect.appendChild(option);
      });
      teamNameSelect.value = currentValue;
    }

    // 更新請假查詢下拉選單
    const statsTeacherSelect = document.getElementById("statsTeacherNameSelect");
    if (statsTeacherSelect) {
      const currentValue = statsTeacherSelect.value;
      statsTeacherSelect.innerHTML = '<option value="">全部教師</option>';
      teachers.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        statsTeacherSelect.appendChild(option);
      });
      statsTeacherSelect.value = currentValue;
    }

    // 更新請假登記下拉選單
    const leaveTeacherSelect = document.getElementById("leaveTeacherName");
    if (leaveTeacherSelect) {
      const currentValue = leaveTeacherSelect.value;
      leaveTeacherSelect.innerHTML = '<option value="">請選擇教師</option>';
      teachers.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        leaveTeacherSelect.appendChild(option);
      });
      leaveTeacherSelect.value = currentValue;
    }

    // 更新請假統整表下拉選單
    const reportTeacherSelect = document.getElementById("reportTeacherNameSelect");
    if (reportTeacherSelect) {
      const currentValue = reportTeacherSelect.value;
      reportTeacherSelect.innerHTML = '<option value="">請選擇教師</option>';
      teachers.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        reportTeacherSelect.appendChild(option);
      });
      reportTeacherSelect.value = currentValue;
    }

  } catch (error) {
    console.error("載入已批准教師失敗：", error);
  }
}

// 初始化學年度下拉選單
function initializeSchoolYearSelect() {
  const schoolYearSelect = document.getElementById("reportSchoolYearSelect");
  if (!schoolYearSelect) return;

  schoolYearSelect.innerHTML = "";

  // 產生過去 5 年和未來 2 年的學年度選項
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 判斷當前的學年度 (8月後開始新學年)
  let currentSchoolYear = currentYear;
  if (currentMonth < 8) {
    currentSchoolYear = currentYear - 1;
  }

  // 產生選項：過去 5 年到未來 2 年
  for (let year = currentSchoolYear - 5; year <= currentSchoolYear + 2; year++) {
    const option = document.createElement("option");
    option.value = `${year}-${year + 1}`;
    option.textContent = `${year}年度 (${year}/8/1 ~ ${year + 1}/7/31)`;
    
    // 預設選擇當前學年度
    if (year === currentSchoolYear) {
      option.selected = true;
    }
    
    schoolYearSelect.appendChild(option);
  }
}

// ========== 請假統整表表單提交 ==========
const leaveSummaryReportForm = document.getElementById("leaveSummaryReportForm");

if (leaveSummaryReportForm) {
  leaveSummaryReportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const teacherName = document.getElementById("reportTeacherNameSelect").value;
    
    if (!teacherName) {
      alert("請選擇教師");
      return;
    }

    await generateTeacherLeaveSummaryReport(teacherName);
  });
}

// 生成特定教師的請假統整報表
async function generateTeacherLeaveSummaryReport(teacherName) {
  try {
    // 獲取該教師的所有請假紀錄
    const qRef = query(leaveCol, where("teacher", "==", teacherName));
    const snap = await getDocs(qRef);

    const leaveRecords = [];
    snap.forEach((docSnap) => {
      leaveRecords.push(docSnap.data());
    });

    // 在 JavaScript 中按開始日期排序
    leaveRecords.sort((a, b) => {
      const dateA = new Date(a.startDate || "");
      const dateB = new Date(b.startDate || "");
      return dateA - dateB;
    });

    // 從 teamMembers 獲取教師的學校資訊
    let teacherSchool = "特殊教育中心";
    const teamMembersSnap = await getDocs(teamCol);
    teamMembersSnap.forEach((docSnap) => {
      const member = docSnap.data();
      if (member.name === teacherName && member.school) {
        teacherSchool = member.school;
      }
    });

    // 顯示教師名稱和學校
    document.getElementById("reportTeacherName").textContent = teacherName;
    document.getElementById("reportTeacherSchool").textContent = teacherSchool;

    // 按假別統計
    const summary = {};
    const allLeaveTypes = [
      "事假", "病假", "公假", "家庭照顧假", "歲時祭儀假", "心理調適假"
    ];

    allLeaveTypes.forEach((type) => {
      summary[type] = 0;
    });

    leaveRecords.forEach((record) => {
      const type = record.type || "其他";
      const hours = Number(record.hours) || 0;
      
      if (summary.hasOwnProperty(type)) {
        summary[type] += hours;
      } else {
        summary[type] = hours;
      }
    });

    // 填入統計表
    const summaryTableBody = document.querySelector("#leaveReportSummaryTable tbody");
    summaryTableBody.innerHTML = "";

    let totalHours = 0;

    // 顯示所有假別（包括 0 小時的）
    allLeaveTypes.forEach((type) => {
      const hours = summary[type];
      totalHours += hours;
      const hoursDisplay = convertHoursToDateFormat(hours);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${type}</td>
        <td>${hoursDisplay}</td>
      `;
      summaryTableBody.appendChild(tr);
    });

    // 新增總計行
    const totalDisplay = convertHoursToDateFormat(totalHours);
    const totalTr = document.createElement("tr");
    totalTr.style.fontWeight = "bold";
    totalTr.style.backgroundColor = "#f5f5f5";
    totalTr.innerHTML = `
      <td>請假時數總計</td>
      <td>${totalDisplay}</td>
    `;
    summaryTableBody.appendChild(totalTr);

    // 顯示容器
    const container = document.getElementById("leaveSummaryReportContainer");
    container.style.display = "block";

  } catch (error) {
    console.error("生成報表失敗：", error);
    alert("生成報表失敗：" + error.message);
  }
}

// ========== 初始載入 ==========
loadFiles();
loadApprovedTeachers();
loadTeamMembers();
loadRecentLeaveRecords();
loadLeaveStatistics();

// ===== 補休統計面板初始化 =====

const compRestStatsForm = document.getElementById("compRestStatsForm");
const compRestTeacherNameSelect = document.getElementById("compRestTeacherNameSelect");
const compRestStartDate = document.getElementById("compRestStartDate");
const compRestEndDate = document.getElementById("compRestEndDate");
const compRestViewMode = document.getElementById("compRestViewMode");
const compRestSearchBtn = document.getElementById("compRestSearchBtn");
const compRestResetBtn = document.getElementById("compRestResetBtn");
const compRestListView = document.getElementById("compRestListView");
const compRestCalendarView = document.getElementById("compRestCalendarView");
const compRestStatsTableBody = document.querySelector("#compRestStatsTable tbody");
const compRestCalendarContainer = document.getElementById("compRestCalendarContainer");
const compRestCalendarMonthLabel = document.getElementById("compRestCalendarMonthLabel");
const compRestPrevMonthBtn = document.getElementById("compRestPrevMonthBtn");
const compRestNextMonthBtn = document.getElementById("compRestNextMonthBtn");

// 當教師名單載入時，更新補休查詢下拉選單
function updateCompRestTeacherSelect() {
  const teachers = new Set();
  document.querySelectorAll("#leaveStatsTable tbody tr").forEach((tr) => {
    const teacherCell = tr.querySelector("td:nth-child(2)");
    if (teacherCell) {
      teachers.add(teacherCell.textContent);
    }
  });
  
  compRestTeacherNameSelect.innerHTML = '<option value="">全部教師</option>';
  Array.from(teachers)
    .sort()
    .forEach((teacher) => {
      if (teacher && teacher !== "教師") {
        const option = document.createElement("option");
        option.value = teacher;
        option.textContent = teacher;
        compRestTeacherNameSelect.appendChild(option);
      }
    });
}

// 載入補休統計資料
async function loadCompRestStatistics(filter = null) {
  if (!compRestStatsTableBody) return;

  compRestStatsTableBody.innerHTML =
    "<tr><td colspan='7' class='loading-text'>載入中⋯</td></tr>";

  try {
    const qRef = query(compRestCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(qRef);

    let rows = [];
    snap.forEach((docSnap) => {
      rows.push({ id: docSnap.id, data: docSnap.data() });
    });

    if (filter) {
      rows = rows.filter(({ data: d }) => {
        if (filter.teacher && d.teacher !== filter.teacher) return false;
        if (filter.startDate && filter.endDate) {
          const recordDate = new Date(d.startDate);
          const start = new Date(filter.startDate);
          const end = new Date(filter.endDate);
          if (recordDate < start || recordDate > end) return false;
        }
        return true;
      });
    }

    compRestStatsTableBody.innerHTML = "";

    if (rows.length === 0) {
      compRestStatsTableBody.innerHTML =
        "<tr><td colspan='7' class='empty-text'>目前查詢條件下沒有補休紀錄。</td></tr>";
      return;
    }

    rows.forEach(({ id, data: d }) => {
      const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : null;
      const dateStr = createdAt
        ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${d.teacher || ""}</td>
        <td>${d.type || ""}</td>
        <td>${d.timeRange || ""}</td>
        <td>${d.hours || 0}</td>
        <td>${d.agent || ""}</td>
        <td>
          <button type="button" class="table-btn delete-comprest" data-id="${id}">刪除</button>
        </td>
      `;
      compRestStatsTableBody.appendChild(tr);
    });

    compRestStatsTableBody
      .querySelectorAll(".delete-comprest")
      .forEach((btn) =>
        btn.addEventListener("click", () => deleteCompRestRecord(btn.dataset.id))
      );
  } catch (e) {
    console.error("載入補休統計錯誤：", e);
    compRestStatsTableBody.innerHTML =
      "<tr><td colspan='7' class='error-text'>載入資料時發生錯誤。</td></tr>";
  }
}

// 刪除補休紀錄
async function deleteCompRestRecord(id) {
  if (!confirm("確定要刪除此筆補休紀錄嗎？")) return;
  try {
    await deleteDoc(doc(db, "compRests", id));
    loadCompRestStatistics();
  } catch (e) {
    console.error("刪除補休紀錄錯誤：", e);
    alert("刪除時發生錯誤，請稍後再試。");
  }
}

// 補休月曆檢視相關
let currentCalendarMonth = new Date();
let allCompRestData = [];

// 獲取所有補休資料用於月曆顯示
async function fetchAllCompRestData(filter = null) {
  try {
    const snap = await getDocs(compRestCol);
    allCompRestData = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    if (filter) {
      if (filter.teacher) {
        allCompRestData = allCompRestData.filter((d) => d.teacher === filter.teacher);
      }
    }

    return allCompRestData;
  } catch (e) {
    console.error("獲取補休資料錯誤：", e);
    return [];
  }
}

// 生成月曆
function renderCompRestCalendar() {
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  
  // 更新月份標籤
  const monthLabel = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
  }).format(currentCalendarMonth);
  compRestCalendarMonthLabel.textContent = monthLabel;

  // 清空容器
  compRestCalendarContainer.innerHTML = "";

  // 創建星期頭
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const headerDiv = document.createElement("div");
  headerDiv.style.cssText = "display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; margin-bottom: 10px;";
  
  weekDays.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.textContent = day;
    dayHeader.style.cssText = "text-align: center; font-weight: bold; padding: 10px; background: #f0f0f0; border-radius: 4px;";
    headerDiv.appendChild(dayHeader);
  });
  compRestCalendarContainer.appendChild(headerDiv);

  // 創建日期網格
  const calendarGrid = document.createElement("div");
  calendarGrid.style.cssText = "display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e0e0e0; padding: 1px;";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 填充前一個月的日期
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.style.cssText = "background: #f9f9f9; min-height: 80px; padding: 5px;";
    calendarGrid.appendChild(emptyCell);
  }

  // 填充當月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateCell = document.createElement("div");
    dateCell.style.cssText = "background: white; min-height: 80px; padding: 5px; overflow-y: auto; border: 1px solid #e0e0e0;";

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // 查找該日期的補休記錄
    const dayRecords = allCompRestData.filter((d) => d.startDate === dateStr);

    if (dayRecords.length > 0) {
      // 添加日期標題
      const dayLabel = document.createElement("div");
      dayLabel.style.cssText = "font-weight: bold; color: #0066cc; margin-bottom: 5px; font-size: 12px;";
      dayLabel.textContent = `${day}日`;
      dateCell.appendChild(dayLabel);

      // 添加補休記錄
      dayRecords.forEach((record) => {
        const recordDiv = document.createElement("div");
        recordDiv.style.cssText = "background: #e3f2fd; border-left: 3px solid #0066cc; padding: 4px; margin-bottom: 3px; font-size: 11px; border-radius: 2px;";
        recordDiv.innerHTML = `
          <div style="font-weight: 500; color: #0066cc;">${record.teacher}</div>
          <div style="color: #666; margin-top: 2px;">${record.type}</div>
          <div style="color: #999; margin-top: 2px;">${record.hours}小時</div>
        `;
        dateCell.appendChild(recordDiv);
      });
    } else {
      // 添加日期標題（無記錄）
      const dayLabel = document.createElement("div");
      dayLabel.style.cssText = "font-weight: bold; color: #999; margin-bottom: 5px; font-size: 12px;";
      dayLabel.textContent = `${day}日`;
      dateCell.appendChild(dayLabel);
    }

    calendarGrid.appendChild(dateCell);
  }

  // 填充下一個月的日期
  const lastDay = new Date(year, month + 1, 0).getDay();
  const remainingCells = 6 - lastDay;
  for (let i = 0; i < remainingCells; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.style.cssText = "background: #f9f9f9; min-height: 80px; padding: 5px;";
    calendarGrid.appendChild(emptyCell);
  }

  compRestCalendarContainer.appendChild(calendarGrid);
}

// 補休統計查詢表單
if (compRestStatsForm) {
  compRestStatsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const filter = {
      teacher: compRestTeacherNameSelect.value,
      startDate: compRestStartDate.value,
      endDate: compRestEndDate.value,
    };

    const viewMode = compRestViewMode.value;
    if (viewMode === "list") {
      compRestListView.style.display = "block";
      compRestCalendarView.style.display = "none";
      loadCompRestStatistics(filter);
    } else {
      compRestListView.style.display = "none";
      compRestCalendarView.style.display = "block";
      // 重置為當月
      currentCalendarMonth = new Date();
      await fetchAllCompRestData(filter);
      renderCompRestCalendar();
    }
  });
}

// 月曆前後月份按鈕
if (compRestPrevMonthBtn) {
  compRestPrevMonthBtn.addEventListener("click", () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
    renderCompRestCalendar();
  });
}

if (compRestNextMonthBtn) {
  compRestNextMonthBtn.addEventListener("click", () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
    renderCompRestCalendar();
  });
}

if (compRestResetBtn) {
  compRestResetBtn.addEventListener("click", () => {
    compRestTeacherNameSelect.value = "";
    compRestStartDate.value = "";
    compRestEndDate.value = "";
    compRestViewMode.value = "list";
    compRestListView.style.display = "block";
    compRestCalendarView.style.display = "none";
    currentCalendarMonth = new Date();
    loadCompRestStatistics();
  });
}

// 初始載入補休統計
loadCompRestStatistics();
loadUserApprovals();