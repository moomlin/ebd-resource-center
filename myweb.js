// myweb.js －－ 前台讀取 Firestore 並渲染頁面

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ★ 與後台相同的 Firebase 設定
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

const filesCol = collection(db, "files");
const pageTextsCol = collection(db, "pageTexts");
const teamCol = collection(db, "teamMembers");

/* ========== 左側頁面切換 ========== */

const menuItems = document.querySelectorAll(".menu-item");
const sections = document.querySelectorAll(".page-section");

function showPage(sectionId) {
  sections.forEach((sec) => {
    sec.style.display = sec.id === sectionId ? "block" : "none";
  });
  menuItems.forEach((btn) => {
    if (btn.dataset.page === sectionId) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

menuItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.page;
    showPage(id);
  });
});

/* ========== 右上角歡迎導航與登入狀態偵測 ========== */

const topNavNotLoggedIn = document.getElementById("topNavNotLoggedIn");
const topNavLoggedIn = document.getElementById("topNavLoggedIn");
const topNavUserName = document.getElementById("topNavUserName");
const topNavLoginBtn = document.getElementById("topNavLoginBtn");
const topNavBackToDashboardBtn = document.getElementById("topNavBackToDashboardBtn");
const topNavLogoutBtn = document.getElementById("topNavLogoutBtn");

// 登入按鈕（左下角）
const teacherLoginBtn = document.getElementById("teacherLoginBtn");
if (teacherLoginBtn) {
  teacherLoginBtn.addEventListener("click", function handleTeacherBtnClick() {
    // 根據當前登入狀態切換功能
    if (auth.currentUser) {
      // 已登入：執行登出
      signOut(auth)
        .then(() => {
          // 登出成功後重新載入頁面（按鈕文字與功能會自動更新）
          location.reload();
        })
        .catch((error) => {
          console.error("登出錯誤:", error);
          alert("登出時發生錯誤。");
        });
    } else {
      // 未登入：前往登入頁面
      window.location.href = "login.html";
    }
  });
}

// 右上角登入按鈕
if (topNavLoginBtn) {
  topNavLoginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// 右上角回到後台按鈕
if (topNavBackToDashboardBtn) {
  topNavBackToDashboardBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
}

// 右上角登出按鈕
if (topNavLogoutBtn) {
  topNavLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (e) {
      console.error("登出失敗：", e);
      alert("登出時發生錯誤。");
    }
  });
}

// 偵測登入狀態並更新導航
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 已登入：顯示歡迎訊息與後台/登出按鈕
    if (topNavNotLoggedIn) topNavNotLoggedIn.style.display = "none";
    if (topNavLoggedIn) topNavLoggedIn.style.display = "block";
    if (topNavUserName) {
      // 嘗試取得 displayName；如果沒有則用 email 前段
      topNavUserName.textContent = user.displayName || user.email.split("@")[0];
    }
    // 左下角按鈕改為「登出」
    if (teacherLoginBtn) {
      teacherLoginBtn.textContent = "登出";
    }
  } else {
    // 未登入：顯示歡迎訊息與登入按鈕
    if (topNavNotLoggedIn) topNavNotLoggedIn.style.display = "block";
    if (topNavLoggedIn) topNavLoggedIn.style.display = "none";
    // 左下角按鈕改為「團隊教師登入（內部）」
    if (teacherLoginBtn) {
      teacherLoginBtn.textContent = "團隊教師登入（內部）";
    }
  }
});

/* ========== 共用工具 ========== */

function formatDateFromTimestamp(ts) {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 主分類欄位，有可能叫 mainCategory 或 category
function getMainCategory(d) {
  return d.mainCategory || d.category || "";
}

/* ========== 1. 分頁文字載入 ========== */

async function loadPageText(pageKey, domId) {
  const target = document.getElementById(domId);
  if (!target) return;

  target.textContent = "";

  try {
    const snap = await getDocs(pageTextsCol);
    const match = snap.docs
      .map((s) => s.data())
      .find((d) => d.pageKey === pageKey);
    if (match && match.content) target.textContent = match.content;
  } catch (e) {
    console.error("載入分頁文字錯誤：", pageKey, e);
  }
}

/* ========== 2. 檔案公告 + 情支服務：一次載入全部 files ========== */

const serviceLevelMap = {
  primary: "初級預防",
  secondary: "次級預防",
  tertiary: "三級預防",
};
const serviceTypes = ["研習活動", "增能學習資料", "個案服務"];

// 打開檔案詳細資訊 Modal
function openFileDetailModal(data) {
  const modal = document.getElementById("fileDetailModal");
  const titleEl = document.getElementById("fileDetailTitle");
  const contentEl = document.getElementById("fileDetailContent");
  const metaEl = document.getElementById("fileDetailMeta");
  const actionsEl = document.getElementById("fileDetailActions");

  titleEl.textContent = data.infoTitle || "檔案資訊";
  contentEl.innerHTML = data.infoContent ? `<p>${data.infoContent}</p>` : "<p>無詳細說明</p>";
  
  const fileLabel = data.fileType
    ? `${data.fileName || ""}（${data.fileType}）`
    : data.fileName || "";
  
  metaEl.innerHTML = `
    <p><strong>檔案名稱：</strong> ${fileLabel}</p>
    ${data.note ? `<p><strong>備註：</strong> ${data.note}</p>` : ""}
  `;

  actionsEl.innerHTML = data.url
    ? `<a href="${data.url}" target="_blank" rel="noopener" class="link-btn" style="padding: 8px 16px; display: inline-block;">下載 / 查看</a>`
    : "檔案連結不可用";

  modal.classList.remove("hidden");
}

function closeFileDetailModal() {
  const modal = document.getElementById("fileDetailModal");
  modal.classList.add("hidden");
}

// 關閉 Modal 的事件監聽
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("fileDetailCloseBtn");
  const modal = document.getElementById("fileDetailModal");
  const backdrop = document.querySelector(".modal-backdrop");
  
  if (closeBtn) closeBtn.addEventListener("click", closeFileDetailModal);
  if (backdrop) backdrop.addEventListener("click", closeFileDetailModal);
});

// 分類標籤的點擊事件 - 根據分類跳轉到對應的頁面
function getCategoryTagHref(category) {
  const categoryMap = {
    "計畫與表件": "#plansSection",
    "情支服務": "#servicesSection",
    "其他資源": "#resourcesSection",
    "最新消息": "#newsSection",
  };
  return categoryMap[category] || "#";
}

function getCategoryTagClass(category) {
  const classMap = {
    "計畫與表件": "plans",
    "情支服務": "services",
    "其他資源": "resources",
    "最新消息": "news",
  };
  return classMap[category] || "";
}

// 為「最新消息」渲染表格（包含分類標籤）
function renderNewsTableWithCategoryTags(allFiles) {
  const tbody = document.getElementById("newsTableBody");
  if (!tbody) return;

  tbody.innerHTML =
    "<tr><td colspan='5' class='empty-text'>載入中⋯</td></tr>";

  const list = allFiles.filter(
    (d) => getMainCategory(d) === "最新消息"
  );

  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='5' class='empty-text'>目前尚無最新消息。</td></tr>";
    return;
  }

  // 依 createdAt 由新到舊
  list.sort((a, b) => {
    const at = a.createdAt?.toDate
      ? a.createdAt.toDate().getTime()
      : 0;
    const bt = b.createdAt?.toDate
      ? b.createdAt.toDate().getTime()
      : 0;
    return bt - at;
  });

  list.forEach((d) => {
    const tr = document.createElement("tr");
    const dateStr = formatDateFromTimestamp(d.createdAt);
    const fileLabel = d.fileType
      ? `${d.fileName || ""}（${d.fileType}）`
      : d.fileName || "";
    
    const originalCategory = d.originalCategory || "最新消息";
    const tagClass = getCategoryTagClass(originalCategory);
    const tagHref = getCategoryTagHref(originalCategory);

    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>
        <a class="clickable-title" style="cursor: pointer;">
          ${d.infoTitle || ""}
        </a>
      </td>
      <td>${fileLabel}</td>
      <td>
        <a href="${tagHref}" class="category-tag ${tagClass}">
          ${originalCategory}
        </a>
      </td>
      <td>
        ${
          d.url
            ? `<a href="${d.url}" target="_blank" rel="noopener" class="link-btn">開啟</a>`
            : ""
        }
      </td>
    `;
    
    // 標題的點擊事件
    const titleLink = tr.querySelector(".clickable-title");
    if (titleLink) {
      titleLink.addEventListener("click", (e) => {
        e.preventDefault();
        openFileDetailModal(d);
      });
    }
    
    tbody.appendChild(tr);
  });
}

// 為其他類別渲染表格（不含分類標籤）
function renderSimpleCategoryTable(allFiles, mainCategory, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML =
    "<tr><td colspan='4' class='empty-text'>載入中⋯</td></tr>";

  const list = allFiles.filter(
    (d) => getMainCategory(d) === mainCategory
  );

  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='4' class='empty-text'>目前尚無相關資料。</td></tr>";
    return;
  }

  // 依 createdAt 由新到舊
  list.sort((a, b) => {
    const at = a.createdAt?.toDate
      ? a.createdAt.toDate().getTime()
      : 0;
    const bt = b.createdAt?.toDate
      ? b.createdAt.toDate().getTime()
      : 0;
    return bt - at;
  });

  list.forEach((d) => {
    const tr = document.createElement("tr");
    const dateStr = formatDateFromTimestamp(d.createdAt);
    const fileLabel = d.fileType
      ? `${d.fileName || ""}（${d.fileType}）`
      : d.fileName || "";

    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>
        <a class="clickable-title" style="cursor: pointer;">
          ${d.infoTitle || ""}
        </a>
      </td>
      <td>${fileLabel}</td>
      <td>
        ${
          d.url
            ? `<a href="${d.url}" target="_blank" rel="noopener" class="link-btn">開啟</a>`
            : ""
        }
      </td>
    `;
    
    // 標題的點擊事件
    const titleLink = tr.querySelector(".clickable-title");
    if (titleLink) {
      titleLink.addEventListener("click", (e) => {
        e.preventDefault();
        openFileDetailModal(d);
      });
    }
    
    tbody.appendChild(tr);
  });
}

function resetServiceTbody() {
  Object.keys(serviceLevelMap).forEach((lvKey) => {
    serviceTypes.forEach((t) => {
      const id = `serviceTable_${lvKey}_${t}`;
      const tbody = document.getElementById(id);
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan='5' class='empty-text'>目前尚無資料。</td></tr>";
      }
    });
  });
}

function renderServiceTables(allFiles) {
  resetServiceTbody();

  const serviceFiles = allFiles.filter(
    (d) => getMainCategory(d) === "情支服務"
  );
  if (serviceFiles.length === 0) return;

  // 用 level + type 做桶
  const buckets = {};
  serviceFiles.forEach((d) => {
    const levelName = d.serviceLevel || "";
    const levelKey =
      Object.keys(serviceLevelMap).find(
        (k) => serviceLevelMap[k] === levelName
      ) || "";
    const type = d.serviceType || "";

    if (!levelKey || !serviceTypes.includes(type)) return;

    const bucketKey = `${levelKey}_${type}`;
    if (!buckets[bucketKey]) buckets[bucketKey] = [];
    buckets[bucketKey].push(d);
  });

  Object.entries(buckets).forEach(([key, list]) => {
    const [lvKey, type] = key.split("_");
    const tbodyId = `serviceTable_${lvKey}_${type}`;
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = "";

    // 依 createdAt 由新到舊
    list.sort((a, b) => {
      const at = a.createdAt?.toDate
        ? a.createdAt.toDate().getTime()
        : 0;
      const bt = b.createdAt?.toDate
        ? b.createdAt.toDate().getTime()
        : 0;
      return bt - at;
    });

    list.forEach((d) => {
      const tr = document.createElement("tr");
      const dateStr = formatDateFromTimestamp(d.createdAt);
      const fileLabel = d.fileType
        ? `${d.fileName || ""}（${d.fileType}）`
        : d.fileName || "";

      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${d.infoTitle || ""}</td>
        <td>${fileLabel}</td>
        <td>${d.note || ""}</td>
        <td>
          ${
            d.url
              ? `<a href="${d.url}" target="_blank" rel="noopener" class="link-btn">開啟</a>`
              : ""
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

async function loadAllFilesAndRender() {
  try {
    const snap = await getDocs(filesCol);
    const allFiles = snap.docs.map((s) => ({
      id: s.id,
      ...s.data(),
    }));

    // 「最新消息」使用特殊渲染（包含分類標籤）
    renderNewsTableWithCategoryTags(allFiles);
    
    // 其他主分類使用簡單渲染
    renderSimpleCategoryTable(
      allFiles,
      "計畫與表件",
      "plansTableBody"
    );
    renderSimpleCategoryTable(
      allFiles,
      "其他資源",
      "resourcesTableBody"
    );

    // 情支服務
    renderServiceTables(allFiles);
  } catch (e) {
    console.error("載入檔案公告錯誤：", e);
    // 各表格顯示錯誤訊息
    ["newsTableBody", "plansTableBody", "resourcesTableBody"].forEach(
      (id) => {
        const tbody = document.getElementById(id);
        if (tbody) {
          tbody.innerHTML =
            "<tr><td colspan='5' class='empty-text'>載入資料時發生錯誤。</td></tr>";
        }
      }
    );
    resetServiceTbody();
  }
}

/* ========== 3. 情支服務 Tab 切換 ========== */

const serviceTabButtons = document.querySelectorAll(".subtab-button");
const servicePanels = document.querySelectorAll(".service-panel");

serviceTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.serviceTab;
    serviceTabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    servicePanels.forEach((p) => {
      p.style.display = p.id === id ? "block" : "none";
    });
  });
});

/* ========== 4. 團隊成員載入 ========== */

async function loadTeamMembersFront() {
  const container = document.getElementById("teamCardsContainer");
  if (!container) return;

  container.innerHTML = "<p class='empty-text'>載入中⋯</p>";

  try {
    const snap = await getDocs(teamCol);
    if (snap.empty) {
      container.innerHTML =
        "<p class='empty-text'>尚未建立團隊成員資料。</p>";
      return;
    }

    const members = snap.docs.map((docSnap) => docSnap.data());

    const groups = {
      召集人: [],
      專業督導: [],
      副召集人: [],
      專業教師: [],
      執行秘書: [],
    };

    members.forEach((m) => {
      if (groups[m.roleGroup]) groups[m.roleGroup].push(m);
    });

    container.innerHTML = "";

    renderTeamRow(container, groups["召集人"], "single", "召集人");
    renderTeamRow(container, groups["專業督導"], "single", "專業督導");
    renderTeamRow(container, groups["副召集人"], "double", "副召集人");
    renderTeamRow(container, groups["專業教師"], "triple", "專業教師");
    renderTeamRow(container, groups["執行秘書"], "single", "執行秘書");
  } catch (e) {
    console.error("前台載入團隊成員錯誤：", e);
    container.innerHTML =
      "<p class='empty-text'>載入資料時發生錯誤。</p>";
  }
}

function renderTeamRow(container, list, rowType, defaultRoleTitle) {
  if (!list || list.length === 0) return;

  const row = document.createElement("div");
  row.classList.add("team-row");
  if (rowType === "single") row.classList.add("single");
  if (rowType === "double") row.classList.add("double");
  if (rowType === "triple") row.classList.add("triple");

  list.forEach((m) => {
    const card = document.createElement("div");
    card.classList.add("team-card");
    // 標註此卡片的職稱，並建立一個 ASCII-safe 的 slug（data-role-slug）供 CSS/JS 使用
    const roleName = m.roleGroup || defaultRoleTitle || "";
    card.setAttribute("data-role", roleName);
    const roleSlugMap = {
      "召集人": "leader",
      "專業督導": "supervisor",
      "副召集人": "deputy",
      "專業教師": "teacher",
      "執行秘書": "secretary",
    };
    const roleSlug = roleSlugMap[roleName] || String(roleName).trim().replace(/\s+/g, "-").toLowerCase();
    card.setAttribute("data-role-slug", roleSlug);

    const avatar = document.createElement("div");
    avatar.classList.add("team-avatar");

    if (m.avatarType === "photo" && m.photoUrl) {
      const img = document.createElement("img");
      img.src = m.photoUrl;
      img.alt = m.name || "";
      avatar.appendChild(img);
    } else {
      const firstChar = m.name ? m.name[0] : "?";
      avatar.textContent = firstChar;
    }

    const info = document.createElement("div");
    const roleTitle = m.roleTitle || defaultRoleTitle || "";

    info.innerHTML = `
      <div class="team-info-title">${roleTitle}</div>
      <div class="team-info-name">${m.name || ""}</div>
      <div class="team-info-job">${m.jobTitle || ""}</div>
      <div class="team-info-desc">
        ${
          m.roleGroup === "召集人"
            ? "負責整體方向與行政督導，串連學校與教育處資源，陪伴校園共同應對學生的情緒與行為需求。"
            : m.roleGroup === "專業督導"
            ? "以專業眼光協助個案討論、方案規劃與跨專業合作，支持學校在第一線工作中的困難與抉擇。"
            : m.roleGroup === "副召集人"
            ? "協助統整各項情支服務與研習活動，成為學校與中心之間的橋樑。"
            : m.roleGroup === "專業教師"
            ? "進入班級與個案現場，協助觀察、諮詢與策略示範，一起尋找更適合孩子的做法。"
            : "承接計畫行政、資料與聯繫窗口，讓前線老師可以更專注在孩子與班級身上。"
        }
      </div>
    `;

    card.appendChild(avatar);
    card.appendChild(info);
    row.appendChild(card);
  });

  container.appendChild(row);
}

/* ========== 初始載入 ========== */

async function init() {
  showPage("newsSection");

  // 分頁文字
  loadPageText("news", "newsIntro");
  loadPageText("teamIntro", "teamIntro");
  loadPageText("plans", "plansIntro");
  loadPageText("services", "servicesIntro");
  loadPageText("resources", "resourcesIntro");

  // 檔案公告 + 情支服務
  await loadAllFilesAndRender();

  // 團隊成員
  loadTeamMembersFront();
}

init();