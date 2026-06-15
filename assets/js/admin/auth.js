function doLogin() {
    const user       = document.getElementById("loginUser").value.trim();
    const pass       = document.getElementById("loginPass").value;
    const storedPass = localStorage.getItem(STORAGE_KEYS.adminPass) || "heritage2026";
    if (user === "admin" && pass === storedPass) {
        localStorage.setItem(STORAGE_KEYS.adminSession, "ok");
        showAdmin();
    } else {
        document.getElementById("loginError").style.display = "block";
        setTimeout(() => document.getElementById("loginError").style.display = "none", 3000);
    }
}

function doLogout() {
    localStorage.removeItem(STORAGE_KEYS.adminSession);
    clearInterval(autoRefreshTimer);
    document.getElementById("adminWrap").style.display = "none";
    document.getElementById("loginWrap").style.display = "flex";
    document.getElementById("loginPass").value = "";
}

function showAdmin() {
    document.getElementById("loginWrap").style.display = "none";
    document.getElementById("adminWrap").style.display = "block";
    const now = new Date();
    document.getElementById("adminGreet").textContent =
        `Good ${now.getHours() < 12 ? "Morning" : now.getHours() < 17 ? "Afternoon" : "Evening"}, Admin 👋`;
    loadOrders();
    loadStats();
    renderAdminMenu();
    startAutoRefresh();
}

function changePassword() {
    const np = document.getElementById("newPass").value;
    const cp = document.getElementById("confirmPass").value;
    const st = document.getElementById("passStatus");
    if (!np)      { st.innerHTML = '<span style="color:var(--red)">Password cannot be empty</span>'; return; }
    if (np !== cp){ st.innerHTML = '<span style="color:var(--red)">Passwords do not match</span>'; return; }
    localStorage.setItem(STORAGE_KEYS.adminPass, np);
    st.innerHTML = '<span style="color:var(--green)">✅ Password changed successfully!</span>';
    document.getElementById("newPass").value = "";
    document.getElementById("confirmPass").value = "";
    setTimeout(() => st.textContent = "", 3000);
}