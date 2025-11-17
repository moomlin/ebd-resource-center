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
      rows.push({ id: docSnap.id, data: docSnap.data() });
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
      fileName: fileNameInput.value,
      fileType: fileTypeInput.value || "",
      url: fileUrlInput.value,
      note: fileNoteInput.value || "",
      createdAt: serverTimestamp(),
    };

    if (!data.category || !data.infoTitle || !data.fileName || !data.url) {
      alert("請至少填寫主分類、公告內容、檔案名稱與檔案連結。");
      return;
    }

    const docId = fileDocIdInput.value;

    try {
      if (docId) {
        const ref = doc(db, "files", docId);
        await updateDoc(ref, data);
        alert("檔案資訊已更新。");
      } else {
        await addDoc(filesCol, data);
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

if (leaveForm) {
  leaveForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      teacher: document.getElementById("leaveTeacherName").value,
      type: document.getElementById("leaveType").value,
      startDate: document.getElementById("leaveStartDate").value,
      endDate: document.getElementById("leaveEndDate").value || null,
      timeRange: document.getElementById("leaveTimeRange").value || "",
      hours: Number(document.getElementById("leaveHours").value),
      agent: document.getElementById("leaveAgent").value || "",
      reason: document.getElementById("leaveReason").value || "",
      proofUrl: document.getElementById("leaveProofUrl").value || "",
      createdAt: serverTimestamp(),
    };

    if (!data.teacher || !data.type || !data.startDate) {
      alert("請至少填寫請假人、假別與開始日期。");
      return;
    }

    try {
      await addDoc(leaveCol, data);
      alert("請假紀錄已新增。");
      leaveForm.reset();
      loadRecentLeaveRecords();
      loadLeaveStatistics();
    } catch (e) {
      console.error("新增請假紀錄錯誤：", e);
      alert("儲存時發生錯誤，請稍後再試。");
    }
  });
}

async function loadRecentLeaveRecords() {
  if (!recentLeaveTableBody) return;

  recentLeaveTableBody.innerHTML =
    "<tr><td colspan='6' class='loading-text'>載入中⋯</td></tr>";

  try {
    const qRef = query(leaveCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(qRef);

    recentLeaveTableBody.innerHTML = "";

    if (snap.empty) {
      recentLeaveTableBody.innerHTML =
        "<tr><td colspan='6' class='empty-text'>尚無請假紀錄。</td></tr>";
      return;
    }

    let count = 0;
    snap.forEach((docSnap) => {
      if (count >= 5) return;
      const d = docSnap.data();
      const id = docSnap.id;

      const dateStr = d.endDate
        ? `${d.startDate} ~ ${d.endDate}`
        : d.startDate || "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${d.teacher || ""}</td>
        <td>${d.type || ""}</td>
        <td>${d.hours || ""}</td>
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

// 生成請假資訊統整表（按教師與假別統計）
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

async function loadLeaveStatistics() {
  if (!leaveStatsTableBody || !leaveSummaryTableBody) return;

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
  leaveSummaryTableBody.innerHTML =
    "<tr><td colspan='3' class='loading-text'>載入中⋯</td></tr>";
  
  const leaveSummaryReportTableBody = document.querySelector(
    "#leaveSummaryReportTable tbody"
  );
  if (leaveSummaryReportTableBody) {
    leaveSummaryReportTableBody.innerHTML =
      "<tr><td colspan='8' class='loading-text'>載入中⋯</td></tr>";
  }
  
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
        const dateStr = d.endDate
          ? `${d.startDate} ~ ${d.endDate}`
          : d.startDate || "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${d.teacher || ""}</td>
          <td>${d.type || ""}</td>
          <td>${d.hours || ""}</td>
          <td>${d.agent || ""}</td>
          <td>${d.reason || ""}</td>
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

    // 各假別統計
    const summary = {};
    filtered.forEach(({ data: d }) => {
      const t = d.type || "其他";
      if (!summary[t]) summary[t] = { hours: 0, count: 0 };
      summary[t].hours += Number(d.hours || 0);
      summary[t].count += 1;
    });

    leaveSummaryTableBody.innerHTML = "";
    if (Object.keys(summary).length === 0) {
      leaveSummaryTableBody.innerHTML =
        "<tr><td colspan='3' class='empty-text'>無統計資料。</td></tr>";
    } else {
      Object.keys(summary).forEach((type) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${type}</td>
          <td>${summary[type].hours}</td>
          <td>${summary[type].count}</td>
        `;
        leaveSummaryTableBody.appendChild(tr);
      });
    }

    // 請假資訊統整表（按教師統計各假別時數）
    if (leaveSummaryReportTableBody) {
      generateLeaveSummaryReport(filtered, leaveSummaryReportTableBody);
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
    leaveSummaryTableBody.innerHTML =
      "<tr><td colspan='3' class='error-text'>讀取資料時發生錯誤。</td></tr>";
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

  } catch (error) {
    console.error("載入已批准教師失敗：", error);
  }
}

// ========== 初始載入 ==========
loadFiles();
loadApprovedTeachers();
loadTeamMembers();
loadRecentLeaveRecords();
loadLeaveStatistics();
loadUserApprovals();