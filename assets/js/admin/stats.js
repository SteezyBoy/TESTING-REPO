async function loadStats() {
    if (!getAdminScriptUrl()) return;
    try {
        const data = await fetchStatsFromApi();
        const s = data.stats || {};
        document.getElementById("statTotalOrders").textContent = s.totalOrders || 0;
        document.getElementById("statTotalRevenue").textContent = s.totalRevenue ? fmt(s.totalRevenue) : "Rp 0";
        document.getElementById("statTodayOrders").textContent = s.todayOrders || 0;
        document.getElementById("statTodayRevenue").textContent = s.todayRevenue ? fmt(s.todayRevenue) : "Rp 0";
        const topHtml = (s.topItems || []).map((it, i) => `
            <div class="top-item">
                <span class="top-item-name">${i + 1}. ${it.name}</span>
                <span class="top-item-qty">${it.qty}× sold</span>
            </div>`).join("") || '<div style="color:var(--muted);font-size:14px;">No data yet</div>';
        document.getElementById("topItemsList").innerHTML = topHtml;
        document.getElementById("statsSummary").innerHTML =
            `Total orders: <strong>${s.totalOrders || 0}</strong><br>
             Total revenue: <strong>${s.totalRevenue ? fmt(s.totalRevenue) : "Rp 0"}</strong><br>
             Today's orders: <strong>${s.todayOrders || 0}</strong>`;
    } catch (e) {
        document.getElementById("statsSummary").textContent = "Failed to load statistics.";
    }
}